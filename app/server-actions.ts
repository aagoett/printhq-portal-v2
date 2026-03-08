'use server';

import { createClient } from '../utils/supabase/server';
import { Resend } from 'resend';

// 1. Initialize Clients
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient();

// --- TOOL 1: SEND ORDER CONFIRMATION ---
export async function sendOrderConfirmation(email: string, orderId: string, summary: string) {
  try {
    // FIX: Pointing to public /orders link (or just keeping it simple for now)
    // Note: If you don't have a public order summary page yet, this link might 404 unless we build app/orders/[id]
    // For now, let's point them to the general tracking page if they have a job ID, or just the homepage.
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
  // FIX: Fetch guest_email as a fallback
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles:user_id(email, first_name)')
    .eq('id', jobId)
    .single();

  // FIX: Determine correct email and name
  const targetEmail = job?.profiles?.email || job?.guest_email;
  const targetName = job?.profiles?.first_name || 'Customer';

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
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/jobs/${jobId}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review & Approve</a>
        </div>
      `
    });
    console.log("Proof Email Sent ID:", data.data?.id);
  } catch (error) {
    console.error('Proof Email Unexpected Error:', error);
  }
}
