'use server';

import { Resend } from 'resend';
import { formatCurrency } from '@/utils/pricing';

const getResend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  return new Resend(key);
};

export type EmailQuotePayload = {
  to: string;
  title: string;
  quantity: number;
  product: {
    label: string;
    customLabel?: string;
    sizeLabel: string;
    pageCount?: number;
    coverStock?: string;
    insideStock?: string;
    templateKey?: string;
  };
  pricing: {
    totalPrice: number;
    unitCost: number;
    method: string;
    sheet: string;
    nUp: number;
    paper?: string;
    mailing?: string;
    finishing?: string;
  };
};

export async function emailQuoteSummary(payload: EmailQuotePayload) {
  const { to, title, quantity, product, pricing } = payload;

  const priceFormatted = formatCurrency(pricing.totalPrice);
  const unitFormatted = formatCurrency(pricing.unitCost);

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h1 style="margin: 0 0 12px 0;">Quote: ${title}</h1>
      <p style="margin: 0 0 12px 0; color: #555;">${product.customLabel || product.label} • ${product.sizeLabel}${product.pageCount ? ` • ${product.pageCount} pages` : ''}</p>
      <div style="margin: 16px 0; padding: 12px; background: #f7f7f7; border-radius: 8px;">
        <p style="margin: 4px 0;"><strong>Quantity:</strong> ${quantity.toLocaleString()}</p>
        <p style="margin: 4px 0;"><strong>Price:</strong> ${priceFormatted} (${unitFormatted}/unit)</p>
        <p style="margin: 4px 0;"><strong>Route:</strong> ${pricing.method} • ${pricing.nUp}-up on ${pricing.sheet}</p>
        ${pricing.paper ? `<p style="margin: 4px 0;"><strong>Paper:</strong> ${pricing.paper}</p>` : ''}
        ${pricing.finishing ? `<p style="margin: 4px 0;"><strong>Finishing:</strong> ${pricing.finishing}</p>` : ''}
        ${pricing.mailing ? `<p style="margin: 4px 0;"><strong>Mailing:</strong> ${pricing.mailing}</p>` : '<p style="margin: 4px 0; color: #777;">Mailing: None</p>'}
      </div>
      <p style="margin: 8px 0 0 0; color: #555;">Reply to confirm or request changes.</p>
    </div>
  `;

  await getResend().emails.send({
    from: 'PrintHQ Quotes <quotes@gocmyk.com>',
    to,
    subject: `Quote: ${title}`,
    html,
  });

  return { success: true };
}
