'use server';

import { createClient } from '../utils/supabase/server';
import { Resend } from 'resend';

// 1. Initialize Clients
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient();

// --- TOOL 1: SEND ORDER CONFIRMATION ---
export async function sendOrderConfirmation(email: string, orderId: string, summary: string) {
  try {
    const link = `${process.env.NEXT_PUBLIC_SITE_URL}`;

    await resend.emails.send({
      from: 'PrintHQ Orders <orders@gocmyk.com>',
      to: email,
      subject: `Order Confirmation #${orderId.substring(0,8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #000;">Order Received</h1>
          <p>Thank you for your order!</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Summary:</strong> ${summary}</p>
          <p>We will notify you once production begins.</p>
        </div>
      `
    });
    console.log(`Order confirmation sent to ${email}`);
  } catch (error) {
    console.error('Order Email failed:', error);
  }
}

// --- TOOL 2: SEND PROOF NOTIFICATION ---
export async function sendProofNotification(jobId: string, fileUrl: string, customMessage: string = '') {
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles:user_id(email, contact_name)')
    .eq('id', jobId)
    .single();

  const targetEmail = job?.profiles?.email || job?.guest_email;
  const targetName = job?.profiles?.contact_name || 'Customer';

  if (!job || !targetEmail) {
    console.error("Proof Email Failed: Job or Email not found.");
    return;
  }

  try {
    const data = await resend.emails.send({
      from: 'PrintHQ Proofs <proofs@gocmyk.com>',
      to: targetEmail,
      subject: `Action Required: Proof Ready for ${job.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #000;">New Proof Uploaded</h1>
          <p>Hi ${targetName},</p>
          <p>A new version of your artwork is ready for review.</p>
          
          ${customMessage ? `
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #000; margin: 20px 0;">
              <strong>Note from Team:</strong><br/>
              "${customMessage}"
            </div>
          ` : ''}

          <p><strong>Job:</strong> ${job.title}</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/portal/jobs/${jobId}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review & Approve Proof</a>
        </div>
      `
    });
    console.log("Proof Email Sent ID:", data.data?.id);
  } catch (error) {
    console.error('Proof Email Unexpected Error:', error);
  }
}

// --- TOOL 3: CONVERT APPROVED QUOTE TO JOB ---
export async function convertQuoteToJob(quoteId: string) {
  try {
    // 1. Fetch the quote with full details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) throw new Error('Quote not found');
    if (quote.status === 'Converted') throw new Error('Quote already converted');

    // 2. Create an order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: quote.user_id || null,
        status: 'New',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Create the job from quote data
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert({
        order_id: newOrder.id,
        user_id: quote.user_id || null,
        guest_email: quote.customer_email || null,
        title: quote.title || `Quote #${quote.quote_number}`,
        quantity: quote.quantity,
        status: 'Pending Review',
        size: `${quote.width}x${quote.height}`,
        paper_stock: quote.paper_stock,
        internal_notes: [
          `Converted from Quote #${quote.quote_number}.`,
          `Production Method: ${quote.production_method}`,
          `Estimated Cost: $${quote.total_cost?.toFixed(2)}`,
          `Client Price: $${quote.total_price?.toFixed(2)}`,
        ].join('\n'),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // 4. Create an initial job item from the quote specs
    await supabase.from('job_items').insert({
      job_id: newJob.id,
      description: quote.title || 'Print Job',
      quantity: quote.quantity,
      paper_stock: quote.paper_stock,
      size: `${quote.width}x${quote.height}`,
      status: 'Pending',
    });

    // 5. Mark quote as converted
    await supabase
      .from('quotes')
      .update({ status: 'Converted', converted_job_id: newJob.id })
      .eq('id', quoteId);

    // 6. Notify customer if we have their email
    const customerEmail = quote.customer_email || quote.user_email;
    if (customerEmail) {
      await sendOrderConfirmation(
        customerEmail,
        newJob.id,
        `Converted from Quote #${quote.quote_number} — ${quote.quantity} units`
      );
    }

    return { success: true, jobId: newJob.id };
  } catch (error: any) {
    console.error('Quote conversion failed:', error);
    return { success: false, error: error.message };
  }
}

// --- TOOL 4: CREATE INVOICE ---
export async function createInvoice(data: any) {
  try {
    const { 
      orderId, companyId, status, subtotal, shipping, postage, tax, total, paidAmount, terms, items 
    } = data;

    // 1. Resolve Company ID (In case 'pacific' or other hardcoded ID was passed)
    let resolvedCompanyId = companyId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId);
    
    if (!isUuid && companyId) {
      // Try to find a brand in the DB that matches this name or shortname
      const { data: matchedBrand } = await supabase
        .from('brands')
        .select('id')
        .ilike('name', `%${companyId}%`)
        .single();
      
      if (matchedBrand) {
        resolvedCompanyId = matchedBrand.id;
      } else {
        throw new Error(`Company "${companyId}" not found in database. Please ensure brands are initialized.`);
      }
    }

    // 2. Create the invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        order_id: orderId,
        company_id: resolvedCompanyId,
        status: status || 'Draft',
        subtotal,
        shipping,
        postage,
        tax,
        total,
        paid_amount: paidAmount || 0,
        terms: terms || 'Net 30'
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 2. Create line items
    if (items && items.length > 0) {
      const lineItems = items.map((item: any) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_taxable: item.is_taxable
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);
      if (itemsError) throw itemsError;
    }

    return { success: true, invoiceId: invoice.id };
  } catch (error: any) {
    console.error('Invoice creation failed:', error);
    return { success: false, error: error.message };
  }
}

export async function getInvoice(id: string) {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        company:brands!company_id(*),
        order:orders(*, jobs(title)),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Manual profile fetch for customer details (more resilient than joining)
    if (invoice.order?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', invoice.order.user_id)
        .single();
      
      if (profile) {
        invoice.order.user = profile;
      }
    }

    return { success: true, invoice };
  } catch (error: any) {
    console.error('Fetch invoice failed:', error);
    return { success: false, error: error.message };
  }
}
