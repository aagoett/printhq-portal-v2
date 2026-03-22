'use client';

import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, Briefcase, Calculator, FileText, Layers3, MessageSquare, PackageCheck, Rocket, Settings, Sparkles, User } from 'lucide-react';
import CsrChatPanel from '@/components/CsrChatPanel';
import BotIntakePanel from '@/components/BotIntakePanel';
import QuickOrderPanel from '@/components/QuickOrderPanel';
import InternalPageHeader from '@/components/InternalPageHeader';
import { PRODUCT_TEMPLATES, mergeProductTemplates } from '@/utils/productTemplates';

const MODES = [
  {
    key: 'quote',
    label: 'New Quote',
    icon: Calculator,
    title: 'Discover specs and price options',
    body: 'Best for incomplete requests. Start with CSR chat, then lock the winning route into intake.',
    jump: '#csr-chat',
  },
  {
    key: 'quick-order',
    label: 'Quick Order',
    icon: PackageCheck,
    title: 'Known specs, move fast',
    body: 'For repeatable work or requests that already have enough detail to estimate and create.',
    jump: '#quick-order',
  },
  {
    key: 'internal-job',
    label: 'Internal Job',
    icon: Briefcase,
    title: 'House work, tests, reprints',
    body: 'Create non-customer jobs without polluting the core dashboard or forcing fake customer flows.',
    jump: '#structured-intake',
  },
] as const;

export default function DashboardIntakePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('customer');
  const [customers, setCustomers] = useState<any[]>([]);
  const [brandList, setBrandList] = useState<any[]>([]);
  const [stockLibrary, setStockLibrary] = useState<any[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([]);
  const [productTemplates, setProductTemplates] = useState(PRODUCT_TEMPLATES);
  const [activeMode, setActiveMode] = useState<'quote' | 'quick-order' | 'internal-job'>('quote');

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const userRole = profile?.role || 'customer';
      setRole(userRole);
      if (userRole !== 'admin' && userRole !== 'staff') {
        window.location.href = '/dashboard';
        return;
      }

      const [
        { data: allProfiles },
        { data: brandsData },
        { data: stockData },
        { data: qData },
        productTemplateResp,
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('brands').select('*'),
        supabase.from('paper_stocks').select('*').order('name'),
        supabase.from('workflow_queues').select('*').order('rank'),
        supabase.from('product_templates').select('*').order('sort_order'),
      ]);

      const mergedTemplates = !productTemplateResp?.error && productTemplateResp?.data
        ? mergeProductTemplates(productTemplateResp.data as any)
        : PRODUCT_TEMPLATES;
      if (productTemplateResp?.error) {
        console.warn('product_templates table not available, using defaults', productTemplateResp.error.message);
      }

      setCustomers(allProfiles || []);
      setBrandList(brandsData || []);
      setStockLibrary(stockData || []);
      setWorkflowOptions(qData || []);
      setProductTemplates(mergedTemplates);
      setLoading(false);
    };

    run();
  }, []);

  const activeModeMeta = useMemo(() => MODES.find((m) => m.key === activeMode) || MODES[0], [activeMode]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">Loading intake workspace…</div>;
  }

  const internal = role === 'admin' || role === 'staff';
  if (!internal) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <InternalPageHeader
        title="Intake Workspace"
        description="Separate intake from the production dashboard. CSR discovery, uploads, and multi-item estimating happen here so the shop floor stays clean."
        icon={PackageCheck}
        breadcrumbs={[{ label: 'Intake' }]}
        actions={
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-sm text-gray-600">
            <div className="font-bold text-gray-900">Current mode</div>
            <div>{activeModeMeta.label}</div>
          </div>
        }
        maxWidthClassName="max-w-7xl"
        sticky
      />
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const active = activeMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => {
                  setActiveMode(mode.key);
                  if (typeof window !== 'undefined') {
                    const target = document.querySelector(mode.jump);
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`text-left rounded-2xl border p-5 shadow-sm transition ${active ? 'border-black bg-black text-white' : 'border-gray-200 bg-white hover:border-black'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-white/10' : 'bg-gray-100'}`}>
                    <Icon size={18} className={active ? 'text-white' : 'text-gray-700'} />
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${active ? 'text-gray-200' : 'text-gray-400'}`}>{mode.label}</span>
                </div>
                <div className={`text-lg font-bold mb-2 ${active ? 'text-white' : 'text-gray-900'}`}>{mode.title}</div>
                <p className={`text-sm leading-6 ${active ? 'text-gray-200' : 'text-gray-600'}`}>{mode.body}</p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr] mb-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-3"><Layers3 size={14}/> Phase 1 intake flow</div>
            <div className="grid gap-4 md:grid-cols-3">
              <FlowStep title="1. Choose entry mode" body="Start in Quote, Quick Order, or Internal Job so the CSR path matches the job reality." />
              <FlowStep title="2. Clarify + upload" body="Use chat to extract specs from PDFs or customer notes, then add art and structured details." />
              <FlowStep title="3. Create review-ready work" body="Run pricing, pick the winning quantity break, and push a clean job into production review." />
            </div>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-3"><Sparkles size={14}/> What changed</div>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><MessageSquare size={16} className="mt-0.5 text-gray-400"/>CSR chat is now part of a dedicated intake workspace, not buried in shop-floor ops.</li>
              <li className="flex gap-2"><FileText size={16} className="mt-0.5 text-gray-400"/>Structured multi-item intake sits beside chat so discovery and estimating stay connected.</li>
              <li className="flex gap-2"><Briefcase size={16} className="mt-0.5 text-gray-400"/>Dashboard remains focused on queues, jobs, and execution instead of acting like a catch-all intake page.</li>
            </ul>
          </section>
        </div>

        <div className="grid gap-8">
          {activeMode === 'quick-order' ? (
            <section id="quick-order" className="scroll-mt-20">
              <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 flex items-center gap-2"><PackageCheck size={14}/> Quick Order</div>
                  <h2 className="text-2xl font-bold text-gray-900">Multi-item quick builder</h2>
                  <p className="text-sm text-gray-600 mt-1">Group multiple items, uploads, and specs into one intake ticket.</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">Mode: <span className="font-bold">Quick Order</span></div>
              </div>
              <QuickOrderPanel
                currentUser={user}
                role={role}
                customers={customers}
                brandList={brandList}
                stockLibrary={stockLibrary}
                workflowOptions={workflowOptions}
                productTemplates={productTemplates}
                onJobCreated={() => setActiveMode('quick-order')}
                mode={activeMode}
              />
            </section>
          ) : (
            <section id="quick-order" className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 flex items-center gap-2"><PackageCheck size={14}/> Quick Order</div>
                  <h2 className="text-xl font-bold text-gray-900">Multi-item intake stays available</h2>
                  <p className="text-sm text-gray-600 mt-1">Switch to Quick Order mode to add multiple items with uploads, specs, and customer selection.</p>
                </div>
                <button
                  onClick={() => {
                    setActiveMode('quick-order');
                    if (typeof window !== 'undefined') {
                      document.querySelector('#quick-order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="rounded-full bg-black px-5 py-2 text-sm font-bold text-white hover:bg-gray-800"
                >
                  Open Quick Order
                </button>
              </div>
            </section>
          )}

          <section id="csr-chat" className="scroll-mt-20">
            <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 flex items-center gap-2"><Bot size={14}/> CSR chat</div>
                <h2 className="text-2xl font-bold text-gray-900">Use chat for incomplete or messy requests</h2>
                <p className="text-sm text-gray-600 mt-1">Best entry point for New Quote. It can read PDF dimensions/page count, ask clarifying questions, and propose priced routes.</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">Recommended for: <span className="font-bold">New Quote</span></div>
            </div>
            <CsrChatPanel customers={customers} brandList={brandList} currentUser={user} />
          </section>

          <section id="structured-intake" className="scroll-mt-20">
            <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 flex items-center gap-2"><PackageCheck size={14}/> Structured builder</div>
                <h2 className="text-2xl font-bold text-gray-900">Convert intake into a review-ready job</h2>
                <p className="text-sm text-gray-600 mt-1">Best entry point for Quick Order and Internal Job. Capture transcript, upload files, select product + quantity breaks, then create the job.</p>
              </div>
              <div className="flex gap-2 flex-wrap text-xs font-bold uppercase tracking-wide">
                <span className="rounded-full bg-gray-100 px-3 py-2 text-gray-700">Uploads</span>
                <span className="rounded-full bg-gray-100 px-3 py-2 text-gray-700">Overrides</span>
                <span className="rounded-full bg-gray-100 px-3 py-2 text-gray-700">Multi-qty pricing</span>
              </div>
            </div>
            <BotIntakePanel
              supabase={supabase}
              currentUser={user}
              brandList={brandList}
              workflowOptions={workflowOptions}
              customers={customers}
              mode={activeMode}
            />
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-3"><Settings size={14}/> Navigation</div>
          <div className="grid gap-3 md:grid-cols-5 text-sm">
            <NavChip href="/dashboard" icon={<Briefcase size={15}/> } label="Shop Floor" />
            <NavChip href="/dashboard/mission-control" icon={<Rocket size={15}/> } label="Mission Control" />
            <NavChip href="/dashboard/quotes" icon={<FileText size={15}/> } label="Quotes" />
            <NavChip href="/dashboard/pricing/estimator" icon={<Calculator size={15}/> } label="Estimator" />
            <NavChip href="/dashboard/customers" icon={<User size={15}/> } label="Customers" />
          </div>
        </div>
      </main>
    </div>
  );
}

function FlowStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-sm font-bold text-gray-900 mb-2">{title}</div>
      <div className="text-sm text-gray-600 leading-6">{body}</div>
    </div>
  );
}

function NavChip({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 hover:border-black hover:bg-gray-50">
      <span className="text-gray-500">{icon}</span>
      <span className="font-medium text-gray-800">{label}</span>
    </Link>
  );
}
