'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import { estimateQuantities, EstimateResult, Press, Stock, FinishingOp, Markup, ProductTemplate } from '@/lib/estimator';

const admin = createAdminClient();
const ESTIMATOR_TABLES = ['presses', 'stocks', 'finishing_ops', 'markups', 'product_templates'] as const;
type EstimatorTable = (typeof ESTIMATOR_TABLES)[number];
type UpsertProps = Record<string, any>;

type TableHealth = {
  table: EstimatorTable;
  ok: boolean;
  count: number;
  error: string | null;
  code: string | null;
};

function toPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function sanitizePayload(values: UpsertProps) {
  return Object.fromEntries(
    Object.entries(values).filter(([_, value]) => value !== undefined).map(([key, value]) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return [key, trimmed === '' ? null : trimmed];
      }
      return [key, value];
    })
  );
}

function explainSupabaseError(table: string, action: string, error: any) {
  const code = error?.code || error?.status || 'unknown';
  const rawMessage = error?.message || error?.details || 'Unknown Supabase error';

  if (code === 'PGRST205' || String(rawMessage).includes('Could not find the table')) {
    return `Estimator ${action} failed for ${table}: table is missing or not exposed by the API. Apply sql/estimator.sql and refresh the Supabase schema cache.`;
  }

  return `Estimator ${action} failed for ${table}: ${rawMessage}`;
}

async function upsert(table: EstimatorTable, values: UpsertProps) {
  const payload = sanitizePayload(values);
  const { data, error } = await admin.from(table).upsert(payload).select().single();
  if (error) {
    throw new Error(explainSupabaseError(table, 'save', error));
  }
  revalidatePath('/dashboard/pricing/estimator');
  return toPlainObject(data);
}

async function remove(table: EstimatorTable, id: string) {
  const { error } = await admin.from(table).delete().eq('id', id);
  if (error) {
    throw new Error(explainSupabaseError(table, 'delete', error));
  }
  revalidatePath('/dashboard/pricing/estimator');
}

export async function upsertPress(press: UpsertProps) {
  return upsert('presses', press);
}

export async function deletePress(id: string) {
  return remove('presses', id);
}

export async function upsertStock(stock: UpsertProps) {
  return upsert('stocks', stock);
}

export async function deleteStock(id: string) {
  return remove('stocks', id);
}

export async function upsertFinishing(op: UpsertProps) {
  return upsert('finishing_ops', op);
}

export async function deleteFinishing(id: string) {
  return remove('finishing_ops', id);
}

export async function upsertMarkup(markup: UpsertProps) {
  return upsert('markups', markup);
}

export async function deleteMarkup(id: string) {
  return remove('markups', id);
}

export async function upsertTemplate(template: UpsertProps) {
  return upsert('product_templates', template);
}

export async function deleteTemplate(id: string) {
  return remove('product_templates', id);
}

export type EstimatePayload = {
  quantities: number[];
  template: ProductTemplate;
  press: Press;
  stock: Stock;
  finishingOps: FinishingOp[];
  markup: Markup | null;
};

export async function runEstimate(payload: EstimatePayload): Promise<EstimateResult[]> {
  const quantities = payload.quantities.filter((q) => q > 0);
  return estimateQuantities({
    template: payload.template,
    press: payload.press,
    stock: payload.stock,
    finishingOps: payload.finishingOps,
    markup: payload.markup,
  }, quantities);
}

export async function saveQuote(params: {
  title: string;
  contact?: string;
  templateId?: string;
  pressId: string;
  stockId: string;
  markupId?: string;
  quantities: number[];
  results: EstimateResult[];
  finishingIds: string[];
}) {
  const totalPrice = params.results.reduce((sum, r) => sum + r.totalPrice, 0);
  const totalCost = params.results.reduce((sum, r) => sum + r.totalCost, 0);
  const grossProfit = totalPrice - totalCost;
  const grossMarginPercent = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;

  const quotePayload = {
    title: params.title,
    contact: params.contact,
    template_id: params.templateId,
    press_id: params.pressId,
    stock_id: params.stockId,
    markup_id: params.markupId,
    quantities: params.quantities,
    total_cost: totalCost,
    total_price: totalPrice,
    breakdown: {
      results: params.results,
      finishing_ids: params.finishingIds,
      summary: {
        total_cost: totalCost,
        total_price: totalPrice,
        gross_profit: grossProfit,
        gross_margin_percent: grossMarginPercent,
      },
    },
  };

  const { data: quote, error } = await admin.from('quotes').insert(quotePayload).select().single();

  if (error) {
    throw new Error(explainSupabaseError('quotes', 'save quote', error));
  }

  const lineItems = params.results.flatMap((res) => {
    const summaryItems = [
      {
        quote_id: quote.id,
        label: `Summary • Cost @ ${res.quantity}`,
        quantity: res.quantity,
        cost: res.totalCost,
        price: res.totalCost,
        detail: `Total cost for ${res.quantity.toLocaleString()} units`,
      },
      {
        quote_id: quote.id,
        label: `Summary • Price @ ${res.quantity}`,
        quantity: res.quantity,
        cost: res.totalCost,
        price: res.totalPrice,
        detail: `Sell price for ${res.quantity.toLocaleString()} units`,
      },
      {
        quote_id: quote.id,
        label: `Summary • Gross Profit @ ${res.quantity}`,
        quantity: res.quantity,
        cost: 0,
        price: res.grossProfit,
        detail: `${res.grossMarginPercent.toFixed(1)}% gross margin`,
      },
    ];

    const breakdownItems = res.breakdown.map((b) => ({
      quote_id: quote.id,
      label: `${b.label} @ ${res.quantity}`,
      quantity: res.quantity,
      cost: b.cost,
      price: b.price,
      detail: b.detail,
    }));

    return [...summaryItems, ...breakdownItems];
  });

  if (lineItems.length) {
    const { error: liErr } = await admin.from('quote_line_items').insert(lineItems);
    if (liErr) {
      throw new Error(explainSupabaseError('quote_line_items', 'save quote line items', liErr));
    }
  }

  revalidatePath('/dashboard/quotes');
  revalidatePath(`/dashboard/quotes/${quote.id}`);
  return toPlainObject({ ...quote, gross_profit: grossProfit, gross_margin_percent: grossMarginPercent });
}

export async function fetchEstimatorData() {
  const checks = await Promise.all(
    ESTIMATOR_TABLES.map(async (table): Promise<TableHealth & { data: any[] }> => {
      const response = await admin.from(table).select('*', { count: 'exact' }).order('name');
      const error = response.error;

      return {
        table,
        ok: !error,
        count: response.data?.length || 0,
        error: error ? explainSupabaseError(table, 'load', error) : null,
        code: error?.code || null,
        data: response.data || [],
      };
    })
  );

  const byTable = Object.fromEntries(checks.map((item) => [item.table, item]));
  const missingTables = checks.filter((item) => item.code === 'PGRST205' || item.error?.includes('table is missing')).map((item) => item.table);
  const emptyTables = checks.filter((item) => item.ok && item.count === 0).map((item) => item.table);
  const loadErrors = checks.filter((item) => !item.ok).map((item) => ({ table: item.table, message: item.error! }));

  return toPlainObject({
    presses: byTable.presses?.data || [],
    stocks: byTable.stocks?.data || [],
    finishingOps: byTable.finishing_ops?.data || [],
    markups: byTable.markups?.data || [],
    templates: byTable.product_templates?.data || [],
    health: {
      ready: loadErrors.length === 0,
      missingTables,
      emptyTables,
      loadErrors,
      bootstrapSqlPath: 'sql/estimator.sql',
      checks: checks.map(({ data, ...rest }) => rest),
    },
  });
}
