"use server";

import { Resend } from "resend";

// This looks for the key you saved in Vercel settings
const resend = new Resend(process.env.RESEND_API_KEY);

// For testing on the Free Plan, this MUST be "onboarding@resend.dev"
const SENDER_EMAIL = "onboarding@resend.dev"; 

export async function sendEmailNotification({
  to,
  subject,
  message,
}: {
  to: string;
  subject: string;
  message: string;
}) {
  try {
    console.log(`📧 Attempting to send email to ${to}...`);

    const { data, error } = await resend.emails.send({
      from: `PrintHQ System <${SENDER_EMAIL}>`,
      to: [to], // On Free Tier, this must be YOUR verified email (e.g., andrew@printedunion.com)
      subject: subject,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #3b82f6;">PrintHQ Notification</h2>
          <p style="font-size: 16px; color: #374151;">${message}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            Log in to your portal to view details.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Resend Error:", error);
      return { success: false, error };
    }

    console.log("✅ Email sent successfully:", data);
    return { success: true, data };
  } catch (err) {
    console.error("❌ Unexpected Email Error:", err);
    return { success: false, error: err };
  }
}
