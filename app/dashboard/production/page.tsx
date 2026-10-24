import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resolveServerSession } from '@/lib/auth/session'
import { isInternalRole } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

type BucketJob = {
  id: string
  job_id: string
  plant_id: string | null
  state: string
  quantity: number | null
  stock_code: string | null
  revision: number
  created_at: string
}

export default async function ProductionBucketPage() {
  const { supabase, user, role } = await resolveServerSession()
  if (!user) redirect('/login')
  if (!isInternalRole(role)) redirect('/dashboard')

  const { data, error } = await supabase
    .from('production_jobs')
    .select('id,job_id,plant_id,state,quantity,stock_code,revision,created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const jobs = (data || []) as BucketJob[]
  const ready = jobs.filter(j => j.state === 'ready').length
  const review = jobs.filter(j => ['needs_review','held','needs_intake'].includes(j.state)).length
  const pending = jobs.filter(j => j.state === 'preflight_pending').length

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">PrintHQ / Production</p>
            <h1 className="text-3xl font-bold">Smart Gang Bucket</h1>
            <p className="mt-1 text-sm text-slate-500">San Jose + Dallas · CSR upload intake · Review required before RIP release</p>
          </div>
          <Link href="/dashboard" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Back to dashboard</Link>
        </div>
        {error && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          Production tables are not available yet. Apply and review sql/production_automation_foundation.sql in Supabase first.
          <div className="mt-1 text-xs">{error.message}</div>
        </div>}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Queued jobs', jobs.length],
            ['Ready for planning', ready],
            ['Needs review/intake', review],
            ['Preflight pending', pending]
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold">Live production queue</h2>
            <p className="text-xs text-slate-500">Server-rendered snapshot. Refresh to retrieve new uploads. No automatic plate release.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr>
                <th className="p-3">Job</th><th className="p-3">Plant</th><th className="p-3">Quantity</th>
                <th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3">Revision</th>
              </tr></thead>
              <tbody>
                {jobs.map(job => <tr key={job.id} className="border-t">
                  <td className="p-3"><Link className="font-medium text-blue-700 underline" href={`/dashboard/jobs/${job.job_id}`}>{job.job_id.slice(0,8)}</Link></td>
                  <td className="p-3">{job.plant_id || 'Unassigned'}</td>
                  <td className="p-3">{job.quantity?.toLocaleString() || 'Missing'}</td>
                  <td className="p-3">{job.stock_code || 'Missing'}</td>
                  <td className="p-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{job.state.replace(/_/g,' ')}</span></td>
                  <td className="p-3">{job.revision}</td>
                </tr>)}
                {!jobs.length && !error && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No jobs in the production bucket yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-slate-500">Phase 1: intake and visibility only. Preflight workers, gang optimizer, local plant agents, approval and RIP release remain disabled until implemented and validated.</p>
      </div>
    </main>
  )
}
