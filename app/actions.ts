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
      from: 'PrintHQ Orders <orders@gocmyk.com>', // ✅ Updated to verified domain
      to: email,
      subject: `Order Confirmation #${orderId.substring(0,8).toUpperCase()}`,
      html: `
        <h1>Order Received</h1>
        <p>Thank you for your order!</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Summary:</strong> ${summary}</p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">View Dashboard</a>
      `
    });
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

  if (!job || !job.profiles?.email) {
    console.error("Proof Email Failed: Job or Customer Email not found.");
    return;
  }

  console.log(`Attempting to email ${job.profiles.email} from proofs@gocmyk.com...`);

  try {
    const data = await resend.emails.send({
      from: 'PrintHQ Proofs <proofs@gocmyk.com>', // ✅ Updated to verified domain
      to: job.profiles.email,
      subject: `Action Required: Proof Ready for ${job.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>New Proof Uploaded</h1>
          <p>Hi ${job.profiles.first_name},</p>
          <p>A new version of your artwork is ready for review.</p>
          <p><strong>Job:</strong> ${job.title}</p>
          <p style="color: red; font-weight: bold;">Note: This is the latest version. Previous versions have been archived.</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/jobs/${jobId}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Review & Approve</a>
        </div>
      `
    });
    
    if (data.error) {
        console.error("Resend API Error:", data.error);
    } else {
        console.log("Proof Email Sent Successfully ID:", data.data?.id);
    }
    
  } catch (error) {
    console.error('Proof Email Unexpected Error:', error);
  }
}
