import { createClient } from '../../../../utils/supabase/server';
import JobInteractiveView from './JobInteractiveView';
import { redirect } from 'next/navigation';

export default async function DashboardJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Fetch Job (Safe Query)
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, orders (brand)')
    .eq('id', params.id)
    .single();

  // --- DEBUGGING BLOCK ---
  // If there is an error, we will SHOW IT on screen instead of a 404
  if (error) {
    return (
      <div className="p-12 bg-red-50 text-red-800 font-mono">
        <h1 className="text-2xl font-bold mb-4">Database Error</h1>
        <p className="mb-2">Could not load job: {params.id}</p>
        <div className="bg-white p-4 border border-red-200 rounded">
          {JSON.stringify(error, null, 2)}
        </div>
      </div>
    );
  }
  
  if (!job) {
     return <div className="p-12">Job not found (ID exists, but no data returned).</div>;
  }
  // -----------------------

  // 2b. Fetch customer profile separately (no FK constraint from jobs.user_id to profiles)
  if (job.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, company, phone')
      .eq('id', job.user_id)
      .single();
    (job as any).profiles = profile ?? null;
  }

  // 3. Fetch Extras (Parallel)
  const [servicesRes, assetsRes, messagesRes, logsRes, itemsRes] = await Promise.all([
    supabase.from('finishing_services').select('*').order('name'),
    supabase.from('job_assets').select('*, profiles(first_name, email)').eq('job_id', params.id).order('created_at', { ascending: false }),
    supabase.from('messages').select('*, profiles(email, first_name, role)').eq('job_id', params.id).order('created_at', { ascending: true }),
    supabase.from('job_logs').select('*, profiles(first_name, role)').eq('job_id', params.id).order('created_at', { ascending: true }),
    // Attempt to fetch items safely
    supabase.from('job_items').select('*, job_item_steps(*)').eq('job_id', params.id)
  ]);

  return (
    <JobInteractiveView 
      user={user}
      initialJob={job}
      initialItems={itemsRes.data || []} 
      serviceList={servicesRes.data || []}
      initialAssets={assetsRes.data || []}
      initialMessages={messagesRes.data || []}
      initialLogs={logsRes.data || []}
      jobId={params.id}
    />
  );
}
