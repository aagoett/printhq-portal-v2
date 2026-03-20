import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

const getResend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  return new Resend(key);
};

const streamToBuffer = async (doc: PDFKit.PDFDocument): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quoteId, to, cc } = body || {};

    if (!quoteId || !to) {
      return NextResponse.json({ error: 'quoteId and to are required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: quote, error } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const doc = new PDFDocument({ margin: 40 });
    doc.fontSize(20).text('Quote Summary', { align: 'left' });
    doc.moveDown();
    doc.fontSize(12).text(`Title: ${quote.title || 'Quote'}`);
    doc.text(`Quote #: ${quote.quote_number || 'Pending'}`);
    doc.text(`Quantity: ${quote.quantity}`);
    doc.text(`Size: ${quote.width} x ${quote.height}`);
    doc.text(`Stock: ${quote.paper_stock || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(12).text(`Production Method: ${quote.production_method || 'TBD'}`);
    doc.text(`Client Price: $${(quote.total_price || 0).toFixed(2)}`);
    doc.text(`Internal Cost: $${(quote.total_cost || 0).toFixed(2)}`);

    const breakdown = quote.cost_breakdown?.breakdown || [];
    if (breakdown.length) {
      doc.moveDown();
      doc.text('Breakdown:');
      breakdown.forEach((item: any) => {
        doc.text(`- ${item.name}: ${item.detail || ''} (Price: $${Number(item.price || 0).toFixed(2)})`);
      });
    }

    doc.end();
    const pdfBuffer = await streamToBuffer(doc);

    const quoteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/quote/${quoteId}`;
    await getResend().emails.send({
      from: 'PrintHQ Quotes <quotes@gocmyk.com>',
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      subject: `Quote: ${quote.title || quote.quote_number || 'Estimate'}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111;">
          <p>Hi,</p>
          <p>Your estimate is ready. You can view and approve it here: <a href="${quoteUrl}">${quoteUrl}</a></p>
          <p>Total: <strong>$${(quote.total_price || 0).toFixed(2)}</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: 'quote.pdf',
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('quote email failed', err);
    return NextResponse.json({ error: err?.message || 'Failed to email quote' }, { status: 500 });
  }
}
