'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, ExternalLink, Layers3, Rocket, ShieldCheck } from 'lucide-react';
import InternalPageHeader from '@/components/InternalPageHeader';
import {
  missionBoardSummary,
  missionLanes,
  missionPhases,
  missionReleaseLinks,
  missionStatusMeta,
  missionSummary,
  missionWorkstreams,
  type MissionLink,
} from '@/lib/missionControl';

export default function MissionControlPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('customer');

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const userRole = profile?.role || 'customer';
      setRole(userRole);

      if (userRole !== 'admin' && userRole !== 'staff') {
        window.location.href = '/dashboard';
        return;
      }

      setLoading(false);
    };

    run();
  }, [supabase]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">Loading mission control…</div>;
  }

  const isInternal = role === 'admin' || role === 'staff';
  if (!isInternal) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <InternalPageHeader
        title={missionSummary.title}
        description={missionSummary.strapline}
        eyebrow="Internal roadmap"
        icon={Rocket}
        breadcrumbs={[{ label: 'Mission Control' }]}
        sticky
        maxWidthClassName="max-w-7xl"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/intake" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-black hover:text-black">Open Intake</Link>
            <Link href="/dashboard" className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800">Open Shop Floor</Link>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8 space-y-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Operating rule</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900">{missionSummary.operatingRule}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">
                This page exists to keep PrintHQ execution phase-based instead of feature-chaotic. One place to see what phase we are in, what is active, what is blocked,
                what is in QA, what is already shipped, and which pages / commits / deploys matter.
              </p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400"><ShieldCheck size={14}/> Release trail</div>
              <div className="mt-4 space-y-3">
                {missionReleaseLinks.map((link) => (
                  <LinkRow key={link.label} link={link} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {missionBoardSummary.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-700 border border-gray-200"><Icon size={18} /></span>
                  </div>
                  <div className="mt-4 text-3xl font-black tracking-tight text-gray-900">{item.value}</div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{item.note}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400"><Layers3 size={14}/> Phase roadmap</div>
            <div className="mt-5 space-y-4">
              {missionPhases.map((phase, index) => (
                <div key={phase.key} className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Step {index + 1}</div>
                      <h3 className="mt-2 text-xl font-black text-gray-900">{phase.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-600">{phase.theme}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 border border-gray-200 max-w-sm">
                      <div className="font-bold text-gray-900">Goal</div>
                      <div className="mt-1 leading-6">{phase.goal}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Exit criteria</p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-600">
                        {phase.exitCriteria.map((item) => (
                          <li key={item} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-600" /> <span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Workstreams in this phase</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {phase.workstreams.map((streamKey) => {
                          const stream = missionWorkstreams.find((item) => item.key === streamKey);
                          return stream ? (
                            <span key={stream.key} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
                              {stream.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <LaneCard title="Active work" icon={Rocket} tone="blue" items={missionLanes.active} />
            <LaneCard title="Blocked / watch" icon={AlertTriangle} tone="amber" items={missionLanes.blocked} />
            <LaneCard title="QA lane" icon={ClipboardCheck} tone="emerald" items={missionLanes.qa} />
            <LaneCard title="Done / shipped" icon={CheckCircle2} tone="gray" items={missionLanes.done} />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Workstream board</div>
              <h2 className="mt-2 text-2xl font-black text-gray-900">Current tracks by product surface</h2>
            </div>
            <div className="text-sm text-gray-500">Convert the known PrintHQ work into named lanes with explicit phase ownership.</div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {missionWorkstreams.map((stream) => {
              const Icon = stream.icon;
              const meta = missionStatusMeta[stream.status];
              const StatusIcon = meta.icon;
              return (
                <div key={stream.key} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700"><Icon size={20} /></span>
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{stream.phase}</div>
                        <h3 className="mt-1 text-xl font-black text-gray-900">{stream.label}</h3>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${meta.className}`}>
                      <StatusIcon size={14} /> {meta.label}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-700">{stream.objective}</p>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Now</p>
                      <ul className="mt-2 space-y-2 text-sm text-gray-600">
                        {stream.now.map((item) => (
                          <li key={item} className="flex gap-2"><ArrowRight size={15} className="mt-1 text-gray-400" /> <span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Key links</p>
                      <div className="mt-2 space-y-2">
                        {stream.links?.map((link) => <LinkRow key={`${stream.key}-${link.label}`} link={link} compact />)}
                      </div>
                    </div>
                  </div>

                  {stream.risks && stream.risks.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="font-bold uppercase tracking-[0.14em] text-[11px]">Risk</div>
                      <ul className="mt-2 space-y-2">
                        {stream.risks.map((risk) => <li key={risk}>{risk}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function LaneCard({ title, items, icon: Icon, tone }: { title: string; items: string[]; icon: any; tone: 'blue' | 'amber' | 'emerald' | 'gray' }) {
  const toneClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    gray: 'border-gray-200 bg-white text-gray-900',
  } as const;

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
        <Icon size={14} /> {title}
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkRow({ link, compact = false }: { link: MissionLink; compact?: boolean }) {
  const className = compact
    ? 'flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-black hover:text-black'
    : 'flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 hover:border-black hover:text-black';

  const content = (
    <>
      <span className="font-medium">{link.label}</span>
      <span className="text-gray-400">{link.external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}</span>
    </>
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  );
}
