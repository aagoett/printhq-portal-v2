import { PricingProfileKey } from './estimator';

export type CustomerClassKey = 'trade' | 'standard' | 'retail';

export const CUSTOMER_CLASS_DEFAULTS: Record<CustomerClassKey, { label: string; pricingProfile: PricingProfileKey; note: string }> = {
  trade: { label: 'Trade / Reseller', pricingProfile: 'wholesale', note: 'Default to lean contract margins.' },
  standard: { label: 'Standard Account', pricingProfile: 'competitive', note: 'Use normal house pricing.' },
  retail: { label: 'Retail / Walk-In', pricingProfile: 'retail', note: 'Default to convenience / walk-in margins.' },
};

export function normalizeCustomerClass(value?: string | null): CustomerClassKey {
  if (value === 'trade' || value === 'standard' || value === 'retail') return value;
  if (value === 'wholesale' || value === 'reseller') return 'trade';
  if (value === 'walk_in' || value === 'walk-in') return 'retail';
  return 'standard';
}

export function getCustomerClassDefaultProfile(value?: string | null): PricingProfileKey {
  return CUSTOMER_CLASS_DEFAULTS[normalizeCustomerClass(value)].pricingProfile;
}
