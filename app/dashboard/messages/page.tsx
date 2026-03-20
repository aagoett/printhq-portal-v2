'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import CustomerPortalShell from '@/components/CustomerPortalShell';

export default function CustomerMessagesPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchThreads = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let jobQuery = supabase.from('jobs').select('id, title, user_id, guest_email').order('created_at', { ascending: false });
      jobQuery = user.email
        ? jobQuery.or(`user_id.eq.${user.id},guest_email.eq.${user.email}`)
        : jobQuery.eq('user_id', user.id);

      const { data: jobs } = await jobQuery;
      if (!jobs?.length) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const jobIds = jobs.map((job) => job.id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, job_id, content, created_at')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      const threadMap = new Map<string, any>();
      jobs.forEach((job) => threadMap.set(job.id, { job, latestMessage: null, count: 0 }));
      (messages || []).forEach((message) => {
        const thread = threadMap.get(message.job_id);
        if (!thread) return;
        thread.count += 1;
        if (!thread.latestMessage) thread.latestMessage = message;
      });

      setThreads(Array.from(threadMap.values()).filter((thread) => thread.latestMessage));
      setLoading(false);
    };

    fetchThreads();
  }, [supabase]);

  return (
    <CustomerPortalShell
      title="Messages"
      description="One clean list of job conversations. Open the job thread to reply or review the latest update."
      activeHref="/dashboard/messages"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-400">Loading conversations…</div>
        ) : threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <MessageSquare className="mx-auto mb-3 text-gray-300" size={36} />
            <h2 className="text-lg font-bold text-gray-900">No conversations yet</h2>
            <p className="mt-2 text-sm text-gray-500">When the shop posts updates or you reply on a job, the latest thread will land here.</p>
          </div>
        ) : (
          threads.map((thread) => (
            <Link key={thread.job.id} href={`/dashboard/jobs/${thread.job.id}`} className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-black">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-gray-900">{thread.job.title}</h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{thread.count} messages</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{thread.latestMessage.content}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500"><Clock size={14} /> {new Date(thread.latestMessage.created_at).toLocaleString()}</p>
                </div>
                <ArrowRight className="shrink-0 text-gray-300" size={20} />
              </div>
            </Link>
          ))
        )}
      </div>
    </CustomerPortalShell>
  );
}
