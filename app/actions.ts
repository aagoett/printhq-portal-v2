'use server';

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// 1. Initialize Clients
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- TOOL 1: SEND ORDER CONFIRMATION (Used by Dashboard) ---
export async function sendOrderConfirmation(email: string, orderId: string, summary: string) {
  try {
    await resend.emails.send({
      from: 'PrintHQ Orders <orders@gocmyk.com>', // Verified Domain
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

// --- TOOL 2: SEND PROOF NOTIFICATION (Used by Job Details) ---
export async function sendProofNotification(jobId: string, fileUrl: string, customMessage: string = '') {
  // Fetch Job & Customer Data
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles:user_id(email, first_name)')
    .eq('id', jobId)
    .single();

  if (!job || !job.profiles?.email) {
    console.error("Proof Email Failed: Job or Customer Email not found.");
    return;
  }

  try {
    const data = await resend.emails.send({
      from: 'PrintHQ Proofs <proofs@gocmyk.com>', // Verified Domain
      to: job.profiles.email,
      subject: `Action Required: Proof Ready for ${job.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #000;">New Proof Uploaded</h1>
          <p>Hi ${job.profiles.first_name},</p>
          <p>A new version of your artwork is ready for review.</p>
          
          ${customMessage ? `
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #000; margin: 20px 0;">
              <strong>Note from Team:</strong><br/>
              "${customMessage}"
            </div>
          ` : ''}

          <p><strong>Job:</strong> ${job.title}</p>
          <p style="color: red; font-size: 12px;">Note: Previous versions have been archived.</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/jobs/${jobId}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review & Approve</a>
        </div>
      `
    });
    console.log("Proof Email Sent ID:", data.data?.id);
  } catch (error) {
    console.error('Proof Email Unexpected Error:', error);
  }
}
