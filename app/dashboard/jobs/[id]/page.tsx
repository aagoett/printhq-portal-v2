import { createClient } from '../../../../utils/supabase/server';
import JobInteractiveView from './JobInteractiveView';
import { redirect, notFound } from 'next/navigation';

export default async function DashboardJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 1. Fetch BASIC Job Info (Removed the complex nested joins for a moment)
  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      orders (brand, due_date),
      profiles:user_id (first_name, last_name, email, company, phone)
    `)
    .eq('id', params.id)
    .single();

  if (error || !job) {
    console.error("Job fetch error:", error); // This will show up in your Vercel logs
    return notFound();
  }

  // 2. Fetch Services & Assets separately
  const { data: services } = await supabase.from('finishing_services').select('*').order('name');
  const { data: assets } = await supabase.from('job_assets').select('*, profiles(first_name, email)').eq('job_id', params.id).order('created_at', { ascending: false });
  const { data: messages } = await supabase.from('messages').select('*, profiles(email, first_name, role)').eq('job_id', params.id).order('created_at', { ascending: true });
  const { data: logs } = await supabase.from('job_logs').select('*, profiles(first_name, role)').eq('job_id', params.id).order('created_at', { ascending: true });

  // 3. Fetch Items separately (Safer check)
  // If the table doesn't exist, this will just return null instead of crashing the whole page
  const { data: items } = await supabase
    .from('job_items')
    .select('*, job_item_steps(*)')
    .eq('job_id', params.id);

  return (
    <JobInteractiveView 
      user={user}
      initialJob={job}
      initialItems={items || []} 
      serviceList={services || []}
      initialAssets={assets || []}
      initialMessages={messages || []}
      initialLogs={logs || []}
      jobId={params.id}
    />
  );
}
