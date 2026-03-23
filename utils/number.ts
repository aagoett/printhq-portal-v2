export function coerceDecimal(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  const parsed = typeof normalized === 'number' ? normalized : Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parseDecimalInput(
  value: string,
  opts?: { defaultValue?: number; allowNull?: boolean; fieldName?: string }
): number | null {
  const field = opts?.fieldName || 'Value';
  const trimmed = (value ?? '').toString().replace(/,/g, '').trim();

  if (trimmed === '') {
    if (opts?.allowNull) return null;
    return opts?.defaultValue ?? 0;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number.`);
  }

  const zeroish = /^0*(?:\.0+)?$/.test(trimmed);
  if (parsed === 0 && !zeroish) {
    throw new Error(`${field} looks like a decimal but was read as 0. Please use digits and a decimal point (e.g., 0.125).`);
  }

  return parsed;
}
