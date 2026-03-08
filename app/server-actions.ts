'use server';

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Clients
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Shared base email styles
const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px; margin: 0 auto; padding: 20px; color: #111;
`;
const BTN_STYLE = `
  display: inline-block; background: #000; color: #fff;
  padding: 12px 28px; text-decoration: none; border-radius: 6px;
  font-weight: bold; font-size: 14px; margin-top: 24px;
`;
const DIVIDER = `<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />`;

// Helper: resolve brand name for email sender
async function getBrandSender(brandId?: string): Promise<{ from: string; brandName: string }> {
  if (brandId) {
    const { data } = await supabase.from('brands').select('name, email').eq('id', brandId).single();
    if (data) {
      const fromEmail = data.email || 'orders@gocmyk.com';
      return { from: `${data.name} <${fromEmail}>`, brandName: data.name };
    }
  }
  return { from: 'PrintHQ <orders@gocmyk.com>', brandName: 'PrintHQ' };
}

// --- ACTION 1: ORDER CONFIRMATION ---
export async function sendOrderConfirmation(email: string, jobId: string, summary: string, brandId?: string) {
  const { from, brandName } = await getBrandSender(brandId);
  const trackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/jobs/${jobId}`;

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: `Order Confirmed – ${summary}`,
      html: `
        <div style="${BASE_STYLE}">
          <h2 style="margin: 0 0 8px;">${brandName}</h2>
          <h1 style="font-size: 22px; margin: 0 0 16px;">Your order is confirmed!</h1>
          <p style="color: #555;">Thank you for your order. Our team will start production shortly and keep you updated at every step.</p>
          ${DIVIDER}
          <p><strong>Reference:</strong> #${jobId.substring(0, 8).toUpperCase()}</p>
          <p><strong>Summary:</strong> ${summary}</p>
          ${DIVIDER}
          <a href="${trackUrl}" style="${BTN_STYLE}">Track Your Order →</a>
          ${DIVIDER}
          <p style="font-size: 12px; color: #999;">Questions? Reply to this email or contact your account manager.</p>
        </div>
      `,
    });
    console.log(`[Email] Order confirmation → ${email}`);
  } catch (error) {
    console.error('[Email] Order confirmation failed:', error);
  }
}

// --- ACTION 2: PROOF NOTIFICATION ---
export async function sendProofNotification(jobId: string, fileUrl: string, customMessage: string = '') {
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles:user_id(email, first_name), orders(brand_id)')
    .eq('id', jobId)
    .single();

  const targetEmail = job?.profiles?.email || job?.guest_email;
  const targetName  = job?.profiles?.first_name || 'there';
  if (!job || !targetEmail) {
    console.error('[Email] Proof notification: job or email not found.');
    return;
  }

  const { from, brandName } = await getBrandSender(job?.orders?.brand_id);
  const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/jobs/${jobId}`;

  try {
    const result = await resend.emails.send({
      from,
      to: targetEmail,
      subject: `Action Required: Proof Ready for "${job.title}"`,
      html: `
        <div style="${BASE_STYLE}">
          <h2 style="margin: 0 0 8px;">${brandName}</h2>
          <h1 style="font-size: 22px; margin: 0 0 16px;">Your proof is ready to review</h1>
          <p>Hi ${targetName},</p>
          <p style="color: #555;">A new proof has been uploaded for your job and requires your approval before we can proceed with production.</p>
          ${customMessage ? `
            <div style="background: #f9f9f9; padding: 16px; border-left: 4px solid #000; border-radius: 4px; margin: 20px 0;">
              <strong>Note from our team:</strong><br/><br/>
              ${customMessage}
            </div>
          ` : ''}
          ${DIVIDER}
          <p><strong>Job:</strong> ${job.title}</p>
          <p><strong>Ref:</strong> #${jobId.substring(0, 8).toUpperCase()}</p>
          ${DIVIDER}
          <a href="${reviewUrl}" style="${BTN_STYLE}">Review & Approve Proof →</a>
          ${DIVIDER}
          <p style="font-size: 12px; color: #999;">
            If you have any concerns about this proof, simply reply to this email.
            Please review within 48 hours to avoid production delays.
          </p>
        </div>
      `,
    });
    console.log('[Email] Proof notification sent:', result.data?.id);
  } catch (error) {
    console.error('[Email] Proof notification failed:', error);
  }
}

// --- ACTION 3: INVOICE EMAIL ---
export async function sendInvoiceEmail(
  invoiceId: string,
  customerEmail: string,
  invoiceNumber: string,
  total: number
) {
  // Fetch invoice with brand info
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, brands(name, email), invoice_items(*)')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    console.error('[Email] Invoice not found:', invoiceId);
    throw new Error('Invoice not found');
  }

  const { from, brandName } = await getBrandSender(invoice.brand_id);
  const invoiceUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/invoices/${invoiceId}`;
  const fmt = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const lineItemsHtml = (invoice.invoice_items || [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((item: any) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${item.description}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">${fmt(item.unit_price)}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: bold;">${fmt(item.total)}</td>
      </tr>
    `).join('');

  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Upon Receipt';

  try {
    await resend.emails.send({
      from,
      to: customerEmail,
      subject: `Invoice #${invoiceNumber} from ${brandName} – ${fmt(total)} due`,
      html: `
        <div style="${BASE_STYLE}">
          <h2 style="margin: 0 0 4px;">${brandName}</h2>
          <h1 style="font-size: 22px; margin: 0 0 16px;">Invoice #${invoiceNumber}</h1>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td><strong>Bill To:</strong><br/>${invoice.customer_name || customerEmail}<br/>${customerEmail}</td>
              <td style="text-align: right;">
                <strong>Invoice #:</strong> ${invoiceNumber}<br/>
                <strong>Due Date:</strong> ${dueDate}<br/>
                <strong>Terms:</strong> ${invoice.payment_terms || 'Net 30'}
              </td>
            </tr>
          </table>

          ${DIVIDER}

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9f9f9;">
                <th style="padding: 10px 0; text-align: left; font-size: 11px; text-transform: uppercase; color: #999;">Description</th>
                <th style="padding: 10px 0; text-align: right; font-size: 11px; text-transform: uppercase; color: #999;">Qty</th>
                <th style="padding: 10px 0; text-align: right; font-size: 11px; text-transform: uppercase; color: #999;">Price</th>
                <th style="padding: 10px 0; text-align: right; font-size: 11px; text-transform: uppercase; color: #999;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>

          ${DIVIDER}

          <table style="width: 100%; max-width: 260px; margin-left: auto; font-size: 14px;">
            <tr><td style="padding: 4px 0; color: #555;">Subtotal</td><td style="text-align: right;">${fmt(invoice.subtotal)}</td></tr>
            ${(invoice.tax_rate || 0) > 0 ? `<tr><td style="padding: 4px 0; color: #555;">Tax (${invoice.tax_rate}%)</td><td style="text-align: right;">${fmt(invoice.tax_amount)}</td></tr>` : ''}
            <tr>
              <td style="padding: 10px 0 4px; font-weight: bold; font-size: 16px; border-top: 2px solid #000;">Total Due</td>
              <td style="text-align: right; padding: 10px 0 4px; font-weight: bold; font-size: 16px; border-top: 2px solid #000;">${fmt(total)}</td>
            </tr>
          </table>

          ${invoice.notes ? `
            ${DIVIDER}
            <p style="color: #555; font-size: 13px;"><strong>Notes:</strong><br/>${invoice.notes}</p>
          ` : ''}

          ${DIVIDER}
          <p style="font-size: 12px; color: #999;">
            To view your invoice online, click the button below.
            If you have any questions, please don't hesitate to contact us.
          </p>
          <a href="${invoiceUrl}" style="${BTN_STYLE}">View Invoice Online →</a>
        </div>
      `,
    });
    console.log(`[Email] Invoice ${invoiceNumber} sent to ${customerEmail}`);
  } catch (error) {
    console.error('[Email] Invoice email failed:', error);
    throw error;
  }
}

// --- ACTION 4: JOB STATUS UPDATE NOTIFICATION ---
export async function sendJobStatusUpdate(jobId: string, newStatus: string, message?: string) {
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles:user_id(email, first_name), orders(brand_id)')
    .eq('id', jobId)
    .single();

  const targetEmail = job?.profiles?.email || job?.guest_email;
  const targetName  = job?.profiles?.first_name || 'there';
  if (!job || !targetEmail) return;

  const { from, brandName } = await getBrandSender(job?.orders?.brand_id);
  const trackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/jobs/${jobId}`;

  const STATUS_MESSAGES: Record<string, string> = {
    'In Production':    'Great news! Your job has entered production.',
    'Proof Ready':      'Your proof is ready for review.',
    'Awaiting Pickup':  'Your order is complete and ready for pickup!',
    'Shipped':          'Your order has been shipped!',
    'Complete':         'Your order is complete. Thank you for your business!',
  };

  const statusMsg = message || STATUS_MESSAGES[newStatus] || `Your job status has been updated to: ${newStatus}.`;

  try {
    await resend.emails.send({
      from,
      to: targetEmail,
      subject: `Job Update: "${job.title}" is now ${newStatus}`,
      html: `
        <div style="${BASE_STYLE}">
          <h2 style="margin: 0 0 8px;">${brandName}</h2>
          <h1 style="font-size: 22px; margin: 0 0 16px;">Job Status Update</h1>
          <p>Hi ${targetName},</p>
          <p style="color: #555;">${statusMsg}</p>
          ${DIVIDER}
          <p><strong>Job:</strong> ${job.title}</p>
          <p><strong>Status:</strong> ${newStatus}</p>
          <p><strong>Ref:</strong> #${jobId.substring(0, 8).toUpperCase()}</p>
          ${DIVIDER}
          <a href="${trackUrl}" style="${BTN_STYLE}">Track Your Job →</a>
        </div>
      `,
    });
    console.log(`[Email] Job status update sent to ${targetEmail}`);
  } catch (error) {
    console.error('[Email] Job status update failed:', error);
  }
}
