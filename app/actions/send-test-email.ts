'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTestEmail(formData: FormData) {
  const email = formData.get('email') as string;

  try {
    const { data, error } = await resend.emails.send({
      // ⚠️ IMPORTANT: You must use this 'onboarding' email until you verify your domain
      from: 'onboarding@resend.dev',
      to: email, // This must be YOUR email (the one you signed up to Resend with) for the test to work
      subject: 'PrintHQ Test: Server Action Works!',
      html: '<p>Congrats! Your Next.js + Resend integration is working 🚀</p>'
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Server Error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
