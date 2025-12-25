'use server';

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- TOOL 1: SEND ORDER CONFIRMATION ---
export async function sendOrderConfirmation(email: string, orderId: string, summary: string) {
  try {
    await resend.emails.send({
      // FIX: Must match your verified domain
      from: 'PrintHQ <orders@gocmyk.com>', 
      to: email,
      subject: `Order Confirmation #${orderId.substring(0,8).toUpperCase()}`,
      html: `
        <h1>Order Received</h1>
        <p>Thank you for your order!</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Summary:</strong> ${summary}</p>
        <br/>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
      `
    });
    console.log(`Order confirmation sent to ${email}`);
  } catch (error) {
    console.error('Order Email failed:', error);
  }
}

// --- TOOL 2: SEND PROOF NOTIFICATION ---
export async function sendProofNotification(jobId: string, fileUrl: string) {
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles:user_id(email, first_name)')
    .eq('id', jobId)
    .single();

  if (!job || !job.profiles?.email) return;

  try {
    await resend.emails.send({
      // FIX: Must match your verified domain
      from: 'PrintHQ <proofs@gocmyk.com>', 
      to: job.profiles.email,
      subject: `Action Required: Proof Ready for ${job.title}`,
      html: `
        <h1>New Proof Uploaded</h1>
        <p>Hi ${job.profiles.first_name},</p>
        <p>A new digital proof is ready for your review.</p>
        <p><strong>Job:</strong> ${job.title}</p>
        <br/>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/jobs/${jobId}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View & Approve Proof</a>
        <br/><br/>
        <p>Please approve this as soon as possible so we can begin production.</p>
      `
    });
    console.log(`Proof email sent to ${job.profiles.email}`);
  } catch (error) {
    console.error('Proof Email failed:', error);
  }
}
