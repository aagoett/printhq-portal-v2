import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { calculateProposals, EstimatorContext } from '@/lib/estimator';
import { CustomerPricingOverride, parseQuantityList } from '@/utils/pricing';
import { getTemplate } from '@/utils/productTemplates';

const SYSTEM_PROMPT = `You are a senior CSR at a union print shop. Hold a concise, friendly conversation to gather missing specs for print jobs (size, page count, folding, stock, coating, mailing/addresses, quantities, turnaround). Respond ONLY as JSON with shape {"reply": string, "spec"?: {...}, "status"?: "needs_info" | "ready"}. If you need more info set status="needs_info" and ask targeted clarifying questions in reply. When specs are sufficient, set status="ready" and include a spec object with fields: title, width, height, unit (inches), pageCount?, folding?, stock?, coating?, mailing?, quantities (array of numbers), templateKey?, notes?. Keep reply short.`;

const missingKeyResponse = NextResponse.json(
  { error: 'LLM API key is not set' },
  { status: 500 }
);

type ProductSelection = {
  key?: string;
  label?: string;
  sizeLabel?: string;
  size?: { width?: number; height?: number };
  pageCount?: number;
  coverStock?: string;
  insideStock?: string;
  customLabel?: string;
};

export async function POST(req: NextRequest) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  const useOpenRouter = Boolean(openRouterKey);
  const apiKey = useOpenRouter ? openRouterKey : openAIKey;
  if (!apiKey) return missingKeyResponse;

  const body = await req.json();
  const {
    message,
    history = [],
    customerId,
    brandId,
    selectedTemplate,
    transcript,
    fileMeta,
    productSelection,
  } = body || {};

  const supabase = createClient();

  const { data: paperRows = [] } = await supabase.from('paper_catalog').select('*');
  const { data: pricingRows = [] } = await supabase.from('pricing_components').select('*');
  const papers = (paperRows || []).map((p: any) => ({ ...p, type: 'paper' }));
  const presses = pricingRows.filter((p: any) => p.type === 'press_digital' || p.type === 'press_offset');
  const finishing = pricingRows.filter((p: any) => p.type === 'finishing');
  const mailing = pricingRows.filter((p: any) => p.type === 'mailing');

  let overrides: CustomerPricingOverride[] = [];
  if (customerId) {
    const { data: overrideRows } = await supabase
      .from('customer_pricing')
      .select('*')
      .eq('customer_id', customerId);
    overrides = overrideRows || [];
  }

  // Normalize product selection and pre-seed spec values
  const resolvedProduct: ProductSelection | undefined = (() => {
    if (!productSelection) return undefined;
    const tpl = productSelection.key ? getTemplate(productSelection.key) : null;
    const sizeFromTemplate = tpl?.sizes.find((s) => s.label === productSelection.sizeLabel);
    return {
      ...productSelection,
      label: productSelection.label || tpl?.name,
      sizeLabel: productSelection.sizeLabel || sizeFromTemplate?.label,
      size: productSelection.size || (sizeFromTemplate ? { width: sizeFromTemplate.width, height: sizeFromTemplate.height } : undefined),
    };
  })();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      content: `${message || ''}${fileMeta ? `\nFile info: ${JSON.stringify(fileMeta)}` : ''}${
        selectedTemplate ? `\nTemplate: ${selectedTemplate}` : ''
      }${resolvedProduct ? `\nProduct: ${(resolvedProduct.customLabel || resolvedProduct.label || resolvedProduct.key || '').trim()} ${resolvedProduct.sizeLabel || ''} ${resolvedProduct.pageCount ? `${resolvedProduct.pageCount} pages` : ''}` : ''}`,
    },
  ];

  const llmEndpoint = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const llmModel = useOpenRouter
    ? process.env.OPENROUTER_MODEL || 'openrouter/auto'
    : process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const completion = await fetch(llmEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(useOpenRouter
        ? {
            'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://printhq-portal-v2.vercel.app',
            'X-Title': process.env.OPENROUTER_TITLE || 'printhq-portal-v2',
          }
        : {}),
      ...(process.env.OPENAI_ORG && !useOpenRouter ? { 'OpenAI-Organization': process.env.OPENAI_ORG } : {}),
    },
    body: JSON.stringify({
      model: llmModel,
      temperature: 0.2,
      messages,
    }),
  });

  if (!completion.ok) {
    const errText = await completion.text();
    return NextResponse.json({ error: 'LLM request failed', detail: errText }, { status: 500 });
  }

  const data = await completion.json();
  const content: string = data?.choices?.[0]?.message?.content || '';

  let parsed: any = {};
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    parsed = { reply: content || 'Unable to parse model response.', status: 'needs_info' };
  }

  const spec = parsed?.spec || {};

  // Apply product selection to the spec as defaults
  if (resolvedProduct) {
    spec.product = resolvedProduct;
    if (!spec.width && resolvedProduct.size?.width) spec.width = resolvedProduct.size.width;
    if (!spec.height && resolvedProduct.size?.height) spec.height = resolvedProduct.size.height;
    if (!spec.templateKey && selectedTemplate) spec.templateKey = selectedTemplate;
    if (!spec.pageCount && resolvedProduct.pageCount) spec.pageCount = resolvedProduct.pageCount;
    if (!spec.stock && resolvedProduct.insideStock) spec.stock = resolvedProduct.insideStock;
  }

  let proposals: any[] = [];

  if (spec && spec.width && spec.height) {
    const finishW = Number(spec.width);
    const finishH = Number(spec.height);
    let quantities: number[] = [];
    if (Array.isArray(spec.quantities)) {
      quantities = spec.quantities.filter((q: any) => !Number.isNaN(Number(q))).map((q: any) => Number(q));
    } else if (typeof spec.quantities === 'string') {
      quantities = parseQuantityList(spec.quantities);
    }

    const qtyList = quantities.length > 0 ? quantities : [250, 500, 1000];

    const context: EstimatorContext = {
      papers,
      presses,
      finishing,
      mailing,
      overrides,
    };

    const mailingId = (() => {
      if (spec.mailingId) return spec.mailingId;
      if (spec.mailing) {
        const target = String(spec.mailing).toLowerCase();
        const match = mailing.find((m: any) => m.name?.toLowerCase().includes(target));
        return match?.id || null;
      }
      return null;
    })();

    proposals = calculateProposals(
      {
        finishW,
        finishH,
        qtyList,
        selectedPaperId: spec.paperId || spec.paper || undefined,
        selectedFinishingIds: spec.finishingIds || [],
        selectedMailingId: mailingId,
        templateKey: spec.templateKey || selectedTemplate,
      },
      context
    );
  }

  // Save transcript snapshot
  try {
    const contentPayload = {
      message,
      reply: parsed?.reply,
      spec,
      proposals,
      transcript,
      brandId,
      product: resolvedProduct,
    };
    await supabase.from('messages').insert({
      user_id: customerId || null,
      content: JSON.stringify(contentPayload),
    });
  } catch (err) {
    console.error('Failed to store transcript', err);
  }

  return NextResponse.json({
    reply: parsed?.reply || 'Got it.',
    spec,
    proposals,
    product: resolvedProduct,
    status: parsed?.status || (proposals.length ? 'ready' : 'needs_info'),
  });
}
