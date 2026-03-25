import { redirect } from 'next/navigation'
import JobInteractiveView from './JobInteractiveView'
import { resolveServerSession } from '@/lib/auth/session'
import { isInternalRole } from '@/lib/auth/roles'

function ErrorState({ title, message, details }: { title: string; message: string; details?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 font-mono">
        <h1 className="text-2xl font-bold text-red-700 mb-3">{title}</h1>
        <p className="text-gray-700 mb-4">{message}</p>
        {details && (
          <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 overflow-auto">{details}</pre>
        )}
        <a href="/dashboard" className="inline-block mt-6 text-sm font-bold text-blue-700 hover:underline">Return to dashboard →</a>
      </div>
    </div>
  )
}

export default async function DashboardJobPage({ params }: { params: { id: string } }) {
  const { supabase, user, role } = await resolveServerSession()

  if (!user) {
    redirect('/login')
  }

  if (!isInternalRole(role)) {
    return (
      <ErrorState
        title="Internal access required"
        message="Production job workspace is restricted to staff and admins."
        details={`Signed in as ${user?.email ?? 'unknown user'} with role "${role}".`}
      />
    )
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      orders (brand),
      profiles:user_id (email)
    `)
    .eq('id', params.id)
    .single()

  if (error) {
    return (
      <ErrorState
        title="Unable to load job"
        message={`Job ${params.id} could not be loaded.`}
        details={JSON.stringify(error, null, 2)}
      />
    )
  }

  if (!job) {
    return (
      <ErrorState
        title="Job not found"
        message={`No data returned for job ${params.id}.`}
      />
    )
  }

  const [servicesRes, assetsRes, messagesRes, logsRes, itemsRes] = await Promise.all([
    supabase.from('finishing_services').select('*').order('name'),
    supabase.from('job_assets').select('*, profiles(email)').eq('job_id', params.id).order('created_at', { ascending: false }),
    supabase.from('messages').select('*, profiles(email)').eq('job_id', params.id).order('created_at', { ascending: true }),
    supabase.from('job_logs').select('*, profiles(email)').eq('job_id', params.id).order('created_at', { ascending: true }),
    supabase.from('job_items').select('*, job_item_steps(*)').eq('job_id', params.id),
  ])

  const loadWarnings = [servicesRes, assetsRes, messagesRes, logsRes, itemsRes]
    .map((res) => (res as any)?.error)
    .filter(Boolean)
    .map((e: any) => e.message || JSON.stringify(e))

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
      loadWarnings={loadWarnings}
    />
  )
}
