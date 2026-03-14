'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import { calculateEstimate, estimateQuantities, EstimateResult, Press, Stock, FinishingOp, Markup, ProductTemplate } from '@/lib/estimator';

const admin = createAdminClient();

type UpsertProps = Record<string, any>;

async function upsert(table: string, values: UpsertProps) {
  const { data, error } = await admin.from(table).upsert(values).select().single();
  if (error) throw error;
  revalidatePath('/dashboard/pricing/estimator');
  return data;
}

async function remove(table: string, id: string) {
  const { error } = await admin.from(table).delete().eq('id', id);
  if (error) throw error;
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

  const { data: quote, error } = await admin.from('quotes').insert({
    title: params.title,
    contact: params.contact,
    template_id: params.templateId,
    press_id: params.pressId,
    stock_id: params.stockId,
    markup_id: params.markupId,
    quantities: params.quantities,
    total_cost: totalCost,
    total_price: totalPrice,
    breakdown: params.results,
  }).select().single();

  if (error) throw error;

  const lineItems = params.results.flatMap((res) => res.breakdown.map((b) => ({
    quote_id: quote.id,
    label: `${b.label} @ ${res.quantity}`,
    quantity: res.quantity,
    cost: b.cost,
    price: b.price,
    detail: b.detail,
  })));

  if (lineItems.length) {
    const { error: liErr } = await admin.from('quote_line_items').insert(lineItems);
    if (liErr) throw liErr;
  }

  revalidatePath('/dashboard/quotes');
  return quote;
}

export async function fetchEstimatorData() {
  const [presses, stocks, finishingOps, markups, templates] = await Promise.all([
    admin.from('presses').select('*').order('name'),
    admin.from('stocks').select('*').order('name'),
    admin.from('finishing_ops').select('*').order('name'),
    admin.from('markups').select('*').order('name'),
    admin.from('product_templates').select('*').order('name'),
  ]);

  return {
    presses: presses.data || [],
    stocks: stocks.data || [],
    finishingOps: finishingOps.data || [],
    markups: markups.data || [],
    templates: templates.data || [],
  };
}
