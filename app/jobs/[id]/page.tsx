import { createClient } from '@/utils/supabase/server';
import JobInteractiveView from './JobInteractiveView';
import { redirect, notFound } from 'next/navigation';

export default async function JobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  // 1. AUTH CHECK
  // We check this first to protect the data.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. THE "FULL HIERARCHY" PROMISE
  // We run all these queries at the exact same time to eliminate "Waterfalls".
  const [
    jobRes,       // The deep nested job data
    servicesRes,  // Lookup list for finishing services
    assetsRes,    // Files/Proofs
    messagesRes,  // Chat history
    logsRes       // Activity logs
  ] = await Promise.all([

    // QUERY A: The "Red Card" Hierarchy
    // Fetches Job -> Job Items -> Job Item Steps all in one go.
    supabase
      .from('jobs')
      .select(`
        *,
        orders (
          brand,
          due_date
        ),
        profiles:user_id (
          first_name, 
          last_name, 
          email, 
          company, 
          phone
        ),
        job_items (
          id,
          description,
          quantity,
          paper_stock,
          status,
          job_item_steps (
            id,
            step_name,
            status,
            department,
            notes,
            step_order
          )
        )
      `)
      .eq('id', params.id)
      .single(),

    // QUERY B: Finishing Services Lookup
    supabase
      .from('finishing_services')
      .select('*')
      .order('name'),
    
    // QUERY C: Assets (Files)
    supabase
      .from('job_assets')
      .select('*, profiles(first_name, email)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false }),

    // QUERY D: Messages (Chat)
    supabase
      .from('messages')
      .select('*, profiles(email, first_name, role)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true }),

    // QUERY E: Logs (History)
    supabase
      .from('job_logs')
      .select('*, profiles(first_name, role)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true })
  ]);

  // 3. ERROR HANDLING
  if (jobRes.error || !jobRes.data) {
    console.error("Error fetching job:", jobRes.error);
    return notFound(); // Shows the Next.js 404 page
  }

  // 4. PASS TO CLIENT COMPONENT
  // We pass the "pre-fetched" data so the UI renders instantly.
  return (
    <JobInteractiveView 
      user={user}
      initialJob={jobRes.data}
      initialItems={jobRes.data.job_items || []} // Pass the nested items separately for cleaner code
      serviceList={servicesRes.data || []}
      initialAssets={assetsRes.data || []}
      initialMessages={messagesRes.data || []}
      initialLogs={logsRes.data || []}
      jobId={params.id}
    />
  );
}
