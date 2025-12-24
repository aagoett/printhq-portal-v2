'use server';

import { Resend } from 'resend';

// Ensure RESEND_API_KEY is in your .env.local
const resend = new Resend(process.env.RESEND_API_KEY);

// Your verified domain!
const SENDER_EMAIL = 'orders@gocmyk.com';
// Your Vercel URL (Update this if you add a custom domain to Vercel later)
const SITE_URL = 'https://printhq-portal-v2.vercel.app';

// 1. ORDER CONFIRMATION
export async function sendOrderConfirmation(email: string, jobId: string, title: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return { success: false, error: "Missing API Key" };
    }

    console.log(`📨 Sending Order Confirmation to ${email}...`);

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
          <a href="${SITE_URL}/dashboard/jobs/${jobId}" style="background:#000; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">Track Order</a>
          <br/><br/>
          <hr style="border:0; border-top:1px solid #eee;" />
          <p style="font-size:12px; color:#999;">Reference Job ID: #${jobId.substring(0,6).toUpperCase()}</p>
        </div>
      `,
    });

    return { success: true };

  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error };
  }
}

// 2. PROOF NOTIFICATION
export async function sendProofNotification(email: string, jobId: string, title: string) {
  try {
    console.log(`📨 Sending Proof Notification to ${email}...`);

    await resend.emails.send({
      from: `PrintHQ Production <${SENDER_EMAIL}>`,
      to: email,
      subject: `ACTION REQUIRED: Proof Ready for ${title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h1 style="color: #000;">Digital Proof Ready 🎨</h1>
          <p style="font-size: 16px; color: #555;">A proof for <strong>${title}</strong> is waiting for your approval.</p>
          <p style="color: #555;">Please review it carefully. We cannot start production until you approve.</p>
          <br/>
          <a href="${SITE_URL}/dashboard/jobs/${jobId}" style="background:#22c55e; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">Review Proof</a>
        </div>
      `,
    });

    return { success: true };

  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error };
  }
}
