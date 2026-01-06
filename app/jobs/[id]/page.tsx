import { createClient } from '@/utils/supabase/server';
import JobInteractiveView from './JobInteractiveView';
import { redirect } from 'next/navigation';

// This is a Server Component (No 'use client' at the top)
export default async function JobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. FETCH EVERYTHING IN PARALLEL (No Waterfalls)
  // This executes all queries at the exact same time, cutting load time by ~70%
  const [jobRes, stepsRes, servicesRes, assetsRes, messagesRes, logsRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, orders(brand), profiles:user_id(first_name, last_name, email, company, phone)')
      .eq('id', params.id)
      .single(),
    
    supabase
      .from('job_steps')
      .select('*')
      .eq('job_id', params.id)
      .eq('status', 'Pending')
      .order('step_order', { ascending: true }),

    supabase.from('finishing_services').select('*').order('name'),
    
    supabase
      .from('job_assets')
      .select('*, profiles(first_name, email)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('messages')
      .select('*, profiles(email, first_name, role)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('job_logs')
      .select('*, profiles(first_name, role)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true })
  ]);

  if (jobRes.error) {
    return <div>Job not found or access denied.</div>;
  }

  // 3. Pass data to the Client Component
  return (
    <JobInteractiveView 
      user={user}
      initialJob={jobRes.data}
      initialStep={stepsRes.data?.[0] || null}
      serviceList={servicesRes.data || []}
      initialAssets={assetsRes.data || []}
      initialMessages={messagesRes.data || []}
      initialLogs={logsRes.data || []}
      jobId={params.id}
    />
  );
}
