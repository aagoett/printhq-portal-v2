// --- TOOL 2: SEND PROOF NOTIFICATION ---
export async function sendProofNotification(jobId: string, fileUrl: string, customMessage: string = '') {
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
