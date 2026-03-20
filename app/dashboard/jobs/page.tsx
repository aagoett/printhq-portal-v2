'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Clock, ArrowRight, MessageSquare } from 'lucide-react';
import CustomerPortalShell from '@/components/CustomerPortalShell';

export default function CustomerJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('customer');

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    const fetchJobs = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || 'customer';
      setRole(userRole);
      const isInternal = userRole === 'admin' || userRole === 'staff';

      let query = supabase
        .from('jobs')
        .select('id, title, status, created_at, due_date, current_step, guest_email, user_id')
        .order('created_at', { ascending: false });

      if (!isInternal) {
        query = user.email
          ? query.or(`user_id.eq.${user.id},guest_email.eq.${user.email}`)
          : query.eq('user_id', user.id);
      }

      const { data } = await query;
      setJobs(data || []);
      setLoading(false);
    };

    fetchJobs();
  }, [router, supabase]);

  const isInternal = role === 'admin' || role === 'staff';

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDueStatus = (due?: string | null) => {
    if (!due) return { color: 'text-gray-400', label: 'No due date' };
    const date = new Date(due);
    const now = new Date();
    date.setHours(23, 59, 59, 999);
    now.setHours(0, 0, 0, 0);
    const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0) return { color: 'text-red-600', label: 'Overdue' };
    if (diff < 1) return { color: 'text-red-600', label: 'Due today' };
    if (diff <= 3) return { color: 'text-orange-600', label: formatDate(due) };
    return { color: 'text-gray-600', label: formatDate(due) };
  };

  if (isInternal) {
    return (
      <CustomerPortalShell
        title="Jobs"
        description="For production controls, use the main dashboard. This view stays customer-safe."
        activeHref="/dashboard/jobs"
      >
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-sm text-gray-500">
          Internal roles should manage work in the full dashboard. <Link href="/dashboard" className="font-semibold text-blue-600">Go to production</Link>.
        </div>
      </CustomerPortalShell>
    );
  }

  return (
    <CustomerPortalShell
      title="Jobs"
      description="Track production progress, proofs, and next steps without exposing shop-only controls."
      activeHref="/dashboard/jobs"
      actions={
        <Link
          href="/dashboard/messages"
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-black"
        >
          <MessageSquare size={16} /> Messages
        </Link>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-400">
            Loading jobs…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <Briefcase className="mx-auto mb-3 text-gray-300" size={36} />
            <h2 className="text-lg font-bold text-gray-900">No jobs yet</h2>
            <p className="mt-2 text-sm text-gray-500">When work is in production or awaiting proof, it will show up here.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {jobs.map((job) => {
              const due = getDueStatus(job.due_date);
              return (
                <Link
                  key={job.id}
                  href={`/dashboard/jobs/${job.id}`}
                  className="group flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700">
                          <Briefcase size={14} /> {job.status || 'In Progress'}
                        </span>
                        <span className={`text-xs font-black uppercase tracking-[0.18em] ${due.color}`}>{due.label}</span>
                      </div>
                      <p className="text-lg font-black text-gray-900">{job.title || 'Untitled job'}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Created {formatDate(job.created_at)}</p>
                      <p className="text-sm font-semibold text-gray-600">Current step: {job.current_step || 'Processing'}</p>
                    </div>
                    <ArrowRight className="shrink-0 text-gray-300 transition group-hover:text-black" size={18} />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                    <Clock size={14} /> Updated timeline stays with this job thread.
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </CustomerPortalShell>
  );
}
