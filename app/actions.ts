'use server';

import { Resend } from 'resend';

// Ensure RESEND_API_KEY is in your .env.local
const resend = new Resend(process.env.RESEND_API_KEY);

// Your verified domain!
const SENDER_EMAIL = 'orders@gocmyk.com'; 
const SITE_URL = 'https://printhq-portal-v2.vercel.app'; 

// 1. ORDER CONFIRMATION
export async function sendOrderConfirmation(email: string, jobId: string, title: string) {
  try {
    console.log(`📧 Sending Order Confirmation to ${email}...`);
    
    await resend.emails.send({
      from: `PrintHQ System <${SENDER_EMAIL}>`,
      to: email, 
      subject: `Order Received: ${title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h1 style="color: #000;">We received your order! 🖨️</h1>
          <p style="font-size: 16px; color: #555;">Thanks for submitting <strong>${title}</strong>.</p>
          <p style="color: #555;">Our team is reviewing your files now. You can track your job status here:</p>
          <br/>
          <a href="${SITE_URL}/dashboard/jobs/${jobId}" style="background:#000; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">Track My Job</a>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Order email failed:', error);
    return { success: false };
  }
}

// 2. PROOF NOTIFICATION
export async function sendProofNotification(customerEmail: string, jobId: string, title: string) {
  try {
    console.log(`📧 Sending Proof Notification to ${customerEmail}...`);

    await resend.emails.send({
      from: `PrintHQ System <${SENDER_EMAIL}>`,
      to: customerEmail, 
      subject: `ACTION REQUIRED: Proof Ready for ${title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h1 style="color: #2563eb;">Your Proof is Ready 🎨</h1>
          <p style="font-size: 16px; color: #555;">We have prepared a digital proof for <strong>${title}</strong>.</p>
          <p style="color: #555;">Please log in to review and approve it so we can start printing.</p>
          <br/>
          <a href="${SITE_URL}/dashboard/jobs/${jobId}" style="background:#000; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">Review Proof</a>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Proof email failed:', error);
    return { success: false };
  }
}
