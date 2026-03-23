"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Loader2, MessageSquare, Paperclip, Send, Bot, FileText, Sparkles, CheckCircle2, AlertCircle, Tag } from 'lucide-react';
import { createJobFromSpec } from '@/app/actions';
import { formatCurrency } from '@/utils/pricing';
import { PRODUCT_TEMPLATES, getDefaultSizeForTemplate, getTemplate, ProductTemplateKey } from '@/utils/productTemplates';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: any;
};

export type Customer = { id: string; email: string; first_name?: string; company?: string };
export type Brand = { id: string; name: string };

interface Props {
  customers: Customer[];
  brandList: Brand[];
  currentUser: any;
}

type FileMeta = {
  name: string;
  type: string;
  pageCount?: number;
  widthIn?: number;
  heightIn?: number;
};

type ProposalCard = {
  quantity: number;
  winner: {
    method: string;
    sheet: string;
    nUp: number;
    totalSheets: number;
    paperName: string;
    paperPrice: number;
    pressPrice: number;
    finishingPrice: number;
    mailingPrice: number;
    totalPrice: number;
    totalCost: number;
    unitCost: number;
    detail: string;
  };
};

type ProductSelection = {
  key: ProductTemplateKey;
  label: string;
  sizeLabel: string;
  size: { width: number; height: number };
  pageCount?: number;
  coverStock?: string;
  insideStock?: string;
  customLabel?: string;
};

export default function CsrChatPanel({ customers, brandList, currentUser }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Upload a PDF or describe the job. I will extract size/page count and propose quantities with customer overrides applied.',
  }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [proposals, setProposals] = useState<ProposalCard[]>([]);
  const [spec, setSpec] = useState<any>(null);
  const [selectedProposalQty, setSelectedProposalQty] = useState<number | null>(null);
  const [isAccepting, startAcceptTransition] = useTransition();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(currentUser?.id || customers?.[0]?.id || '');
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandList?.[0]?.id || '');
  const [templateKey, setTemplateKey] = useState('');

  // Product template state
  const [productKey, setProductKey] = useState<ProductTemplateKey>('postcard');
  const defaultSize = getDefaultSizeForTemplate('postcard');
  const [productSizeLabel, setProductSizeLabel] = useState<string>(defaultSize?.label || '');
  const [customProductName, setCustomProductName] = useState('');
  const [customWidth, setCustomWidth] = useState<number>(defaultSize?.width || 4);
  const [customHeight, setCustomHeight] = useState<number>(defaultSize?.height || 6);
  const [productPageCount, setProductPageCount] = useState<number>(8);
  const [coverStockNote, setCoverStockNote] = useState('');
  const [insideStockNote, setInsideStockNote] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (brandList?.length && !selectedBrandId) setSelectedBrandId(brandList[0].id);
  }, [brandList, selectedBrandId]);

  useEffect(() => {
    const defaultSz = getDefaultSizeForTemplate(productKey);
    if (defaultSz) {
      setProductSizeLabel(defaultSz.label);
      setCustomWidth(defaultSz.width);
      setCustomHeight(defaultSz.height);
    }
  }, [productKey]);

  const selectedTemplateDef = getTemplate(productKey);
  const selectedSizeOption = selectedTemplateDef.sizes.find((s) => s.label === productSizeLabel) || null;

  const productSelection: ProductSelection = useMemo(() => ({
    key: productKey,
    label: selectedTemplateDef.name,
    sizeLabel: selectedSizeOption?.label || 'Custom',
    size: { width: customWidth, height: customHeight },
    pageCount: productKey === 'booklet' ? productPageCount : undefined,
    coverStock: productKey === 'booklet' ? coverStockNote || undefined : undefined,
    insideStock: productKey === 'booklet' ? insideStockNote || undefined : undefined,
    customLabel: customProductName || undefined,
  }), [productKey, selectedTemplateDef.name, selectedSizeOption?.label, customWidth, customHeight, productPageCount, coverStockNote, insideStockNote, customProductName]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.type === 'application/pdf') {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
        const workerSrc = (worker as any).default || worker;
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const widthIn = viewport.width / 72;
        const heightIn = viewport.height / 72;
        setFileMeta({ name: file.name, type: file.type, pageCount: pdf.numPages, widthIn, heightIn });
      } catch (err) {
        console.error('Failed to read PDF', err);
        setFileMeta({ name: file.name, type: file.type });
      }
    } else {
      setFileMeta({ name: file.name, type: file.type });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !fileMeta) return;
    setSending(true);
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: input || '[Sent file]', meta: { fileMeta } }];
    setMessages(newMessages);

    const selectionPayload = {
      ...productSelection,
      size: { width: customWidth, height: customHeight },
    };

    try {
      const res = await fetch('/api/csr-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: newMessages,
          customerId: selectedCustomerId,
          brandId: selectedBrandId,
          selectedTemplate: templateKey,
          fileMeta,
          transcript: newMessages.map((m) => m.content).join('\n'),
          productSelection: selectionPayload,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errText}` }]);
      } else {
        const json = await res.json();
        setProposals(json.proposals || []);
        const mergedSpec = { ...(json.spec || {}) };
        if (!mergedSpec.width && customWidth) mergedSpec.width = customWidth;
        if (!mergedSpec.height && customHeight) mergedSpec.height = customHeight;
        mergedSpec.product = json.spec?.product || selectionPayload;
        setSpec(mergedSpec);
        const reply: ChatMessage = { role: 'assistant', content: json.reply || 'Noted.', meta: { status: json.status } };
        setMessages((prev) => [...prev, reply]);
        if (json.proposals?.length) {
          setSelectedProposalQty(json.proposals[0].quantity);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Request failed: ${err.message}` }]);
    } finally {
      setInput('');
      setFileMeta(null);
      setSending(false);
    }
  };

  const acceptProposal = (proposal: ProposalCard) => {
    if (!spec || !proposal) return;
    startAcceptTransition(async () => {
      const transcript = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      const result = await createJobFromSpec({
        spec: { ...spec, product: productSelection },
        customerId: selectedCustomerId,
        brandId: selectedBrandId,
        transcript,
        proposal,
        selectedQuantity: proposal.quantity,
        createdBy: currentUser?.id || null,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result?.success
            ? `Job created from proposal (${proposal.quantity} qty).`
            : `Job creation failed: ${result?.error || 'Unknown error'}`,
        },
      ]);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2"><Bot size={14}/> CSR Chat + Estimator</p>
          <h3 className="text-lg font-bold text-gray-900">Guide customers to a priced proposal</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles size={14}/> Clarify specs · Apply overrides · Return live prices
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x">
        <div className="col-span-2 p-4 space-y-3">
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name || c.company || c.email}
                </option>
              ))}
            </select>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              {brandList.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <input
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              placeholder="Template / SKU"
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
            />
          </div>

          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-2">
            <label className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2"><Tag size={12}/> Product</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={productKey}
                onChange={(e) => setProductKey(e.target.value as ProductTemplateKey)}
                className="border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {PRODUCT_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
              </select>
              <select
                value={productSizeLabel || 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setProductSizeLabel('Custom');
                  } else {
                    setProductSizeLabel(val);
                    const opt = selectedTemplateDef.sizes.find((s) => s.label === val);
                    if (opt) {
                      setCustomWidth(opt.width);
                      setCustomHeight(opt.height);
                    }
                  }
                }}
                className="border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {selectedTemplateDef.sizes.map((s) => (
                  <option key={s.label} value={s.label}>{s.label}</option>
                ))}
                <option value="custom">Custom Size</option>
              </select>
              <div className="flex items-center gap-2">
                <input type="number" value={customWidth} onChange={(e) => { setCustomWidth(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full border rounded px-2 py-2 text-sm" />
                <span className="text-gray-400">×</span>
                <input type="number" value={customHeight} onChange={(e) => { setCustomHeight(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full border rounded px-2 py-2 text-sm" />
              </div>
            </div>
            {productKey === 'other' && (
              <input
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                placeholder="Custom product description"
                className="border rounded-lg px-3 py-2 text-sm bg-white w-full"
              />
            )}
            {productKey === 'booklet' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="number"
                  value={productPageCount}
                  onChange={(e) => setProductPageCount(parseInt(e.target.value) || 0)}
                  placeholder="Page count"
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                />
                <input
                  value={coverStockNote}
                  onChange={(e) => setCoverStockNote(e.target.value)}
                  placeholder="Cover stock"
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                />
                <input
                  value={insideStockNote}
                  onChange={(e) => setInsideStockNote(e.target.value)}
                  placeholder="Inside stock"
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
            )}
            <p className="text-[11px] text-gray-500">{selectedSizeOption ? `${selectedSizeOption.label} preset applied` : 'Custom size applied'}</p>
          </div>

          <div className="border border-gray-200 rounded-xl p-3 h-[360px] overflow-y-auto bg-gray-50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-black text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wide text-gray-400">
                    {m.role === 'user' ? 'CSR' : 'Bot'}
                    {m.meta?.status && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px]">{m.meta.status}</span>}
                  </div>
                  {m.content}
                  {m.meta?.fileMeta && (
                    <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                      <FileText size={12}/> {m.meta.fileMeta.name} {m.meta.fileMeta.pageCount ? `• ${m.meta.fileMeta.pageCount} pages` : ''} {m.meta.fileMeta.widthIn ? `• ${m.meta.fileMeta.widthIn.toFixed(2)}x${m.meta.fileMeta.heightIn?.toFixed(2)} in` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="animate-spin" size={14}/> Bot is thinking...</div>
            )}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="mt-3 border-2 border-dashed border-gray-300 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-black"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Paperclip size={16}/> {fileMeta ? `${fileMeta.name} attached` : 'Attach PDF to auto-read size/pages'}
            </div>
            {fileMeta?.pageCount && (
              <span className="text-xs text-gray-500">{fileMeta.pageCount} pages • {fileMeta.widthIn?.toFixed(2)}x{fileMeta.heightIn?.toFixed(2)} in</span>
            )}
            <input type="file" accept="application/pdf" ref={fileInputRef} className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask the bot to clarify specs..."
              className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black"
            />
            <button
              onClick={handleSend}
              disabled={sending}
              className="bg-black text-white rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
            >
              {sending ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Send
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-700 font-bold text-sm"><MessageSquare size={16}/> Proposals</div>
          {proposals.length === 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3">
              Run a chat to generate estimates. The bot will apply customer pricing overrides automatically.
            </div>
          )}
          {proposals.map((p) => (
            <div key={p.quantity} className={`border rounded-xl p-3 space-y-2 ${selectedProposalQty === p.quantity ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-gray-900">{p.quantity.toLocaleString()} qty</p>
                  <p className="text-xs text-gray-500">{p.winner.method} • {p.winner.nUp}-up on {p.winner.sheet}</p>
                  <p className="text-xs text-gray-500">{p.winner.detail}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-gray-900">{formatCurrency(p.winner.totalPrice)}</p>
                  <p className="text-[11px] text-gray-500">{formatCurrency(p.winner.unitCost)} / unit</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProposalQty(p.quantity)}
                  className="text-xs px-3 py-2 rounded-lg border border-gray-300 hover:border-black"
                >
                  {selectedProposalQty === p.quantity ? 'Selected' : 'Select'}
                </button>
                <button
                  onClick={() => acceptProposal(p)}
                  disabled={isAccepting}
                  className="text-xs px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
                >
                  {isAccepting ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>} Accept & Create Job
                </button>
              </div>
            </div>
          ))}
          {spec && (
            <div className="bg-gray-50 border rounded-xl p-3 text-xs text-gray-700 space-y-1">
              <div className="font-bold text-gray-900">Current Spec</div>
              {spec.product && <div>Product: {spec.product.customLabel || spec.product.label} {spec.product.sizeLabel ? `(${spec.product.sizeLabel})` : ''}</div>}
              <div>Size: {spec.width}x{spec.height} {spec.unit || 'in'} {spec.pageCount ? `• ${spec.pageCount} pages` : ''}</div>
              <div>Stock: {spec.stock || spec.product?.insideStock || '—'} {spec.product?.coverStock ? `• Cover: ${spec.product.coverStock}` : ''}</div>
              <div>Quantities: {Array.isArray(spec.quantities) ? spec.quantities.join(', ') : '—'}</div>
              {spec.mailing && <div>Mailing: {spec.mailing}</div>}
              {spec.notes && <div>Notes: {spec.notes}</div>}
            </div>
          )}
          {proposals.length > 0 && !spec && (
            <div className="text-xs text-orange-600 flex items-center gap-2"><AlertCircle size={14}/> Spec missing but proposals returned.</div>
          )}
        </div>
      </div>
    </div>
  );
}
