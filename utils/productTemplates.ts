export type ProductTemplateKey = 'postcard' | 'flyer' | 'booklet' | 'envelope' | 'other';

export type ProductSizeOption = {
  label: string;
  width: number;
  height: number;
};

export type ProductTemplate = {
  key: ProductTemplateKey;
  name: string;
  description?: string;
  sizes: ProductSizeOption[];
  allowCustom?: boolean;
  requiresPageCount?: boolean;
};

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    key: 'postcard',
    name: 'Postcard',
    sizes: [
      { label: '4 x 6', width: 4, height: 6 },
      { label: '5 x 7', width: 5, height: 7 },
      { label: '6 x 9', width: 6, height: 9 },
    ],
  },
  {
    key: 'flyer',
    name: 'Flyer / Sell Sheet',
    sizes: [
      { label: '8.5 x 11', width: 8.5, height: 11 },
      { label: '8.5 x 14', width: 8.5, height: 14 },
      { label: '11 x 17', width: 11, height: 17 },
    ],
  },
  {
    key: 'booklet',
    name: 'Booklet / Catalog',
    description: 'Includes page count plus cover + inside stock selection',
    requiresPageCount: true,
    sizes: [
      { label: '5.5 x 8.5 Finished', width: 5.5, height: 8.5 },
      { label: '6 x 9 Finished', width: 6, height: 9 },
      { label: '8.5 x 11 Finished', width: 8.5, height: 11 },
    ],
  },
  {
    key: 'envelope',
    name: 'Envelopes',
    sizes: [
      { label: '#10 (9.5 x 4.125)', width: 9.5, height: 4.125 },
      { label: '6 x 9 Booklet', width: 6, height: 9 },
      { label: '9 x 12 Catalog', width: 9, height: 12 },
      { label: 'A7 (5.25 x 7.25)', width: 5.25, height: 7.25 },
    ],
  },
  {
    key: 'other',
    name: 'Other / Custom',
    sizes: [],
    allowCustom: true,
  },
];

export function getTemplate(key: ProductTemplateKey | string | undefined) {
  return PRODUCT_TEMPLATES.find((t) => t.key === key) || PRODUCT_TEMPLATES[0];
}

export function getDefaultSizeForTemplate(key: ProductTemplateKey | string | undefined): ProductSizeOption | null {
  const template = getTemplate(key as ProductTemplateKey);
  return template.sizes[0] || null;
}
