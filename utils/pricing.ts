export type CustomerPricingOverride = {
  id?: string;
  customer_id?: string;
  template?: string | null;
  sku?: string | null;
  component_type?: string | null;
  price_override?: number | null;
  cost_override?: number | null;
  price_amount?: number | null; // fallback naming
  cost_amount?: number | null; // fallback naming
  notes?: string | null;
};

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

export function parseQuantityList(input: string) {
  return input
    .split(',')
    .map((q) => parseInt(q.trim(), 10))
    .filter((q) => !Number.isNaN(q) && q > 0);
}

export function formatCurrency(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return `$${value.toFixed(2)}`;
}

export function applyOverridesToList<T extends { id?: string; name?: string; type?: string; sku?: string; price_amount?: number; cost_amount?: number; price_override?: number | null }>(
  list: T[],
  overrides: CustomerPricingOverride[],
  opts: { templateKey?: string; componentType?: string }
): (T & { __override?: CustomerPricingOverride })[] {
  if (!overrides || overrides.length === 0) return list as any;

  const templateKey = normalize(opts.templateKey);

  const scopedOverrides = overrides.filter((ovr) => {
    const ovrTemplate = normalize(ovr.template);
    if (ovrTemplate && templateKey && ovrTemplate !== templateKey) return false;
    if (ovrTemplate && !templateKey) return false; // override is template-specific but template not provided
    return true;
  });

  if (scopedOverrides.length === 0) return list as any;

  return list.map((item) => {
    const skuCandidates = [item.sku, item.name, item.id?.toString()].filter(Boolean).map((v) => normalize(String(v)));

    const match = scopedOverrides.find((ovr) => {
      if (ovr.component_type && opts.componentType && normalize(ovr.component_type) !== normalize(opts.componentType)) return false;
      if (!ovr.sku) return true; // template-level override
      const overrideSku = normalize(ovr.sku);
      return skuCandidates.some((sku) => sku === overrideSku);
    });

    if (!match) return item as any;

    const price =
      match.price_override ?? match.price_amount ?? (match as any).price ?? (match as any).client_price ?? item.price_amount;
    const cost = match.cost_override ?? match.cost_amount ?? (match as any).cost ?? item.cost_amount;

    const priceOverride = price ?? item.price_override ?? item.price_amount;

    return {
      ...item,
      price_amount: price ?? item.price_amount,
      price_override: priceOverride ?? null,
      cost_amount: cost ?? item.cost_amount,
      __override: match,
    } as any;
  });
}
