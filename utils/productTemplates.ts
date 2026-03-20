export type ProductTemplateKey =
  | 'postcard'
  | 'flyer'
  | 'brochure'
  | 'booklet'
  | 'wide_format'
  | 'envelope'
  | 'other';

export type ProductSizeOption = {
  label: string;
  width: number;
  height: number;
  note?: string;
};

export type ProductField = {
  key:
    | 'paperStock'
    | 'coverStock'
    | 'insideStock'
    | 'pageCount'
    | 'fold'
    | 'coating'
    | 'mailing'
    | 'mailingNotes'
    | 'substrate'
    | 'finishing';
  label: string;
  type: 'paper' | 'number' | 'select' | 'multiselect' | 'boolean' | 'text';
  options?: string[];
  helper?: string;
  required?: boolean;
};

export type ProductTemplate = {
  key: ProductTemplateKey;
  name: string;
  description?: string;
  sizes: ProductSizeOption[];
  allowCustom?: boolean;
  requiresPageCount?: boolean;
  fields?: ProductField[];
};

export type ProductTemplateRow = {
  key: string;
  name: string;
  description?: string;
  sizes?: any;
  allow_custom?: boolean;
  requires_page_count?: boolean;
  fields?: any;
  sort_order?: number;
  is_active?: boolean;
};

const COATING_OPTIONS = ['None', 'UV Gloss', 'AQ Satin', 'Soft Touch', 'Matte Lamination'];
const FOLD_OPTIONS = ['Half Fold', 'Tri-Fold', 'Z-Fold', 'Gate Fold', 'Double Parallel'];
const SUBSTRATE_OPTIONS = ['Foamcore 3/16"', 'Gatorboard', 'PVC', 'Coroplast 4mm', 'Banner Vinyl 13oz', 'Poster Paper', 'Adhesive Vinyl', 'Acrylic'];
const WIDE_FINISHING = ['Grommets', 'Hems', 'Pole Pockets', 'Lamination', 'Mounting'];

const DEFAULT_PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    key: 'postcard',
    name: 'Postcard',
    sizes: [
      { label: '4 x 6', width: 4, height: 6 },
      { label: '5 x 7', width: 5, height: 7 },
      { label: '6 x 9', width: 6, height: 9 },
    ],
    allowCustom: true,
    fields: [
      { key: 'paperStock', label: 'Stock', type: 'paper', required: true },
      { key: 'coating', label: 'Coating', type: 'select', options: COATING_OPTIONS },
      { key: 'mailing', label: 'Mailing', type: 'boolean', helper: 'Addressing, tabbing, sorting, or EDDM?' },
      { key: 'mailingNotes', label: 'Mailing Details', type: 'text', helper: 'Indicia, list, drop date, permits' },
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
    allowCustom: true,
    fields: [
      { key: 'paperStock', label: 'Stock', type: 'paper', required: true },
      { key: 'coating', label: 'Coating', type: 'select', options: COATING_OPTIONS },
      { key: 'mailing', label: 'Mailing', type: 'boolean', helper: 'Need addressing or mail prep?' },
      { key: 'mailingNotes', label: 'Mailing Details', type: 'text' },
    ],
  },
  {
    key: 'brochure',
    name: 'Brochure',
    description: 'Add fold + coating',
    sizes: [
      { label: '8.5 x 11', width: 8.5, height: 11 },
      { label: '11 x 17', width: 11, height: 17 },
      { label: '9 x 12', width: 9, height: 12 },
    ],
    allowCustom: true,
    fields: [
      { key: 'paperStock', label: 'Stock', type: 'paper', required: true },
      { key: 'fold', label: 'Fold', type: 'select', options: FOLD_OPTIONS },
      { key: 'coating', label: 'Coating', type: 'select', options: COATING_OPTIONS },
      { key: 'mailing', label: 'Mailing', type: 'boolean' },
      { key: 'mailingNotes', label: 'Mailing Details', type: 'text' },
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
    allowCustom: true,
    fields: [
      { key: 'pageCount', label: 'Page Count', type: 'number', required: true },
      { key: 'coverStock', label: 'Cover Stock', type: 'paper', required: true },
      { key: 'insideStock', label: 'Inside Stock', type: 'paper', required: true },
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
    allowCustom: true,
    fields: [
      { key: 'paperStock', label: 'Stock', type: 'paper' },
    ],
  },
  {
    key: 'wide_format',
    name: 'Wide Format / Large Format',
    description: 'Substrates + finishing',
    sizes: [
      { label: '18 x 24', width: 18, height: 24 },
      { label: '24 x 36', width: 24, height: 36 },
      { label: '36 x 48', width: 36, height: 48 },
      { label: '48 x 96', width: 48, height: 96 },
    ],
    allowCustom: true,
    fields: [
      { key: 'substrate', label: 'Substrate', type: 'select', options: SUBSTRATE_OPTIONS, required: true },
      { key: 'finishing', label: 'Finishing', type: 'multiselect', options: WIDE_FINISHING },
    ],
  },
  {
    key: 'other',
    name: 'Other / Custom',
    sizes: [],
    allowCustom: true,
    fields: [
      { key: 'paperStock', label: 'Stock', type: 'paper' },
    ],
  },
];

export const PRODUCT_TEMPLATES = DEFAULT_PRODUCT_TEMPLATES;

function normalizeSizes(raw: any, fallback: ProductSizeOption[] = []): ProductSizeOption[] {
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    return raw
      .map((s: any) => {
        if (typeof s === 'string') {
          const parts = s.toLowerCase().includes('x') ? s.split('x') : s.split('×');
          const width = parseFloat(parts[0]);
          const height = parseFloat(parts[1]);
          return { label: s, width, height } as ProductSizeOption;
        }
        if (s && typeof s === 'object') {
          return {
            label: s.label || `${s.width} x ${s.height}`,
            width: Number(s.width) || 0,
            height: Number(s.height) || 0,
            note: s.note,
          } as ProductSizeOption;
        }
        return null;
      })
      .filter(Boolean) as ProductSizeOption[];
  }
  return fallback;
}

function normalizeFields(raw: any, fallback?: ProductField[]): ProductField[] | undefined {
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    return raw
      .map((f: any) => ({
        key: f.key,
        label: f.label || f.key,
        type: (f.type || 'text') as ProductField['type'],
        options: f.options || [],
        helper: f.helper,
        required: f.required,
      }))
      .filter((f) => f.key);
  }
  return fallback;
}

export function mergeProductTemplates(rows?: ProductTemplateRow[] | null): ProductTemplate[] {
  const map = new Map<string, ProductTemplate>();
  DEFAULT_PRODUCT_TEMPLATES.forEach((t) => map.set(t.key, t));

  (rows || []).forEach((row) => {
    if (!row?.key || row.is_active === false) return;
    const base = map.get(row.key) || ({ key: row.key as ProductTemplateKey, name: row.name || row.key, sizes: [] } as ProductTemplate);
    map.set(row.key, {
      ...base,
      name: row.name || base.name,
      description: row.description || base.description,
      sizes: normalizeSizes(row.sizes, base.sizes),
      allowCustom: row.allow_custom ?? base.allowCustom ?? true,
      requiresPageCount: row.requires_page_count ?? base.requiresPageCount,
      fields: normalizeFields(row.fields, base.fields),
    });
  });

  return Array.from(map.values());
}

export function getTemplate(key: ProductTemplateKey | string | undefined, templates: ProductTemplate[] = PRODUCT_TEMPLATES) {
  return templates.find((t) => t.key === key) || templates[0];
}

export function getDefaultSizeForTemplate(key: ProductTemplateKey | string | undefined, templates: ProductTemplate[] = PRODUCT_TEMPLATES): ProductSizeOption | null {
  const template = getTemplate(key as ProductTemplateKey, templates);
  return template.sizes[0] || null;
}
