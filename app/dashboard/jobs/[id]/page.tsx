import { createClient } from '../../../../utils/supabase/server';
import JobInteractiveView from './JobInteractiveView';
import { redirect, notFound } from 'next/navigation';

export default async function DashboardJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch Data (Parallel)
  const [jobRes, servicesRes, assetsRes, messagesRes, logsRes] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        *,
        orders (brand, due_date),
        profiles:user_id (first_name, last_name, email, company, phone),
        job_items (
          id, description, quantity, paper_stock, status,
          job_item_steps (id, step_name, status, department, notes, step_order)
        )
      `)
      .eq('id', params.id)
      .single(),

    supabase.from('finishing_services').select('*').order('name'),
    
    supabase.from('job_assets')
      .select('*, profiles(first_name, email)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false }),

    supabase.from('messages')
      .select('*, profiles(email, first_name, role)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true }),

    supabase.from('job_logs')
      .select('*, profiles(first_name, role)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true })
  ]);

  if (jobRes.error || !jobRes.data) {
    return notFound();
  }

  return (
    <JobInteractiveView 
      user={user}
      initialJob={jobRes.data}
      initialItems={jobRes.data.job_items || []} 
      serviceList={servicesRes.data || []}
      initialAssets={assetsRes.data || []}
      initialMessages={messagesRes.data || []}
      initialLogs={logsRes.data || []}
      jobId={params.id}
    />
  );
}
