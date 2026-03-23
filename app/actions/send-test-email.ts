'use server';

import { Resend } from 'resend';

const getResend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  return new Resend(key);
};

export async function sendTestEmail(formData: FormData) {
  const email = formData.get('email') as string;

  try {
    const { data, error } = await getResend().emails.send({
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
