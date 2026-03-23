'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, FileText, ArrowRight, Link as LinkIcon, Check, CheckCircle2, XCircle, Mail, Clock } from 'lucide-react';
import Link from 'next/link';
import CustomerPortalShell from '@/components/CustomerPortalShell';

export default function QuoteDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [role, setRole] = useState('customer');

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    fetchQuote();
    const channel = supabase.channel(`quote_update_${params.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quotes', filter: `id=eq.${params.id}` }, (payload) => {
        setQuote(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [params.id, supabase]);

  const fetchQuote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setRole(profile?.role || 'customer');
    }
    const { data } = await supabase.from('quotes').select('*').eq('id', params.id).single();
    if (data) setQuote(data);
    setLoading(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/portal/quote/${params.id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleConvertToJob = async () => {
    if (!confirm('Create LIVE JOB from this quote?')) return;
    setIsConverting(true);

    const { data: newJob, error } = await supabase.from('jobs').insert({
      title: quote.title,
      quantity: quote.quantity,
      status: 'Prepress',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      size: `${quote.width}x${quote.height}`,
      paper_stock: quote.paper_stock,
      internal_notes: [
        `Converted from Quote #${quote.quote_number}.`,
        `Method: ${quote.production_method}`,
        `Finishing: ${quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Finishing')?.detail || 'None'}`,
        `Mailing: ${quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Mailing')?.detail || 'None'}`,
        `Est Cost: $${quote.total_cost?.toFixed(2)}`
      ].join('\n'),
    }).select().single();

    if (error) {
      alert(error.message);
      setIsConverting(false);
    } else {
      await supabase.from('quotes').update({ status: 'Converted' }).eq('id', params.id);
      router.push(`/dashboard/jobs/${newJob.id}`);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-400">Loading Quote...</div>;
  if (!quote) return <div className="p-12 text-center text-red-400">Quote not found.</div>;

  const isInternal = role === 'admin' || role === 'staff';
  const breakdown = quote.cost_breakdown?.breakdown || [];
  const routes = quote.cost_breakdown?.routes || [];
  const bestRoute = quote.cost_breakdown || {};
  const worksheet = quote.cost_breakdown?.worksheet;
  const worksheetLines = worksheet?.lines || breakdown;
  const worksheetTotals = worksheet?.totals || {
    cost: quote.total_cost || 0,
    price: quote.total_price || 0,
    margin: (quote.total_price || 0) - (quote.total_cost || 0),
    marginPct: quote.total_price ? (((quote.total_price || 0) - (quote.total_cost || 0)) / quote.total_price) * 100 : 0,
  };
  const finishing = quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Finishing')?.detail || 'None';
  const mailing = quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Mailing')?.detail || 'None';

  if (!isInternal) {
    const isApproved = quote.status === 'Approved' || quote.status === 'Converted';
    const isRejected = quote.status === 'Rejected';
    const product = quote.cost_breakdown?.product;
    const productLabel = product?.customLabel || product?.label;

    return (
      <CustomerPortalShell
        title={`Quote #${quote.quote_number}`}
        description={quote.title}
        activeHref="/dashboard/quotes"
        backHref="/dashboard/quotes"
        backLabel="Back to quotes"
        actions={
          <>
            <a href={`/portal/quote/${params.id}`} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:text-black">
              <Printer size={16} /> Customer view
            </a>
            <a href="mailto:support@pacificprinting.com" className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
              <Mail size={16} /> Need changes?
            </a>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">{quote.title}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{quote.status || 'Pending'}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Prepared for {quote.customer_name || 'your team'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase text-gray-400">Estimate total</p>
                  <p className="text-4xl font-black text-gray-900">${Number(quote.total_price || 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">${(Number(quote.total_price || 0) / Math.max(Number(quote.quantity || 1), 1)).toFixed(3)} per piece</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase text-gray-500">Specs</p>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">
                    <li><span className="font-semibold text-gray-900">Quantity:</span> {Number(quote.quantity || 0).toLocaleString()}</li>
                    <li><span className="font-semibold text-gray-900">Product:</span> {productLabel || 'Custom project'}</li>
                    <li><span className="font-semibold text-gray-900">Size:</span> {quote.width} x {quote.height}"</li>
                    <li><span className="font-semibold text-gray-900">Stock:</span> {quote.paper_stock || 'TBD'}</li>
                    <li><span className="font-semibold text-gray-900">Finishing:</span> {finishing}</li>
                    <li><span className="font-semibold text-gray-900">Mailing:</span> {mailing}</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase text-gray-500">What this includes</p>
                  <div className="mt-3 space-y-3 text-sm text-gray-700">
                    <div>
                      <p className="font-semibold text-gray-900">Production route</p>
                      <p>{quote.production_method || 'Best-fit production path selected by our team'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Prepared</p>
                      <p className="inline-flex items-center gap-1"><Clock size={14} /> {new Date(quote.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Approval</p>
                      <p>{isApproved ? 'Approved and ready to move forward.' : isRejected ? 'Marked declined.' : 'Waiting on your approval.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileText size={18} className="text-gray-400" />
                <h3 className="font-bold text-gray-900">Estimate summary</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {worksheetLines.map((line: any, index: number) => (
                  <div key={`${line.label || line.name}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-[11px] font-bold uppercase text-gray-500">{line.label || line.name}</p>
                    <p className="mt-1 text-sm text-gray-700">{line.detail || 'Included in estimate'}</p>
                    <p className="mt-3 text-sm font-bold text-gray-900">${Number(line.price || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase text-green-700">Status</p>
              <p className="mt-2 text-lg font-bold text-green-900">{quote.status || 'Pending'}</p>
              <p className="mt-2 text-sm text-green-800">Use the customer view if you want the approve / decline buttons or need to forward the live approval link.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase text-gray-500">Need help?</p>
              <p className="mt-2 text-sm text-gray-600">If something is off, message the shop before approving. Keep the customer flow simple: approve, decline, or ask for revisions.</p>
              <div className="mt-4 grid gap-2">
                <Link href="/dashboard/messages" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-black hover:text-black">Open messages</Link>
                <button onClick={handleCopyLink} className="rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:border-black hover:text-black">
                  {linkCopied ? 'Live quote link copied' : 'Copy live quote approval link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </CustomerPortalShell>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quotes" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Quote #{quote.quote_number}</h1>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${quote.status === 'Approved' ? 'bg-green-100 text-green-700' : quote.status === 'Converted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{quote.status}</span>
            </div>
            <p className="text-sm text-gray-500">{quote.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopyLink} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center gap-2 transition-all active:scale-95">
            {linkCopied ? <Check size={16} className="text-green-600"/> : <LinkIcon size={16}/>}
            {linkCopied ? 'Copied!' : 'Copy Link'}
          </button>
          {quote.status === 'Approved' ? (
            <button onClick={handleConvertToJob} disabled={isConverting} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-md flex items-center gap-2">
              {isConverting ? 'Processing...' : 'Create Live Job'} <ArrowRight size={16}/>
            </button>
          ) : quote.status === 'Converted' ? (
            <button disabled className="px-6 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold flex items-center gap-2 cursor-not-allowed">Already Converted</button>
          ) : (
            <button disabled className="px-6 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm font-bold flex items-center gap-2 cursor-not-allowed">Waiting for Approval</button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2"><FileText size={14}/> Job Specifications</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div><p className="text-xs text-gray-500">Quantity</p><p className="font-bold text-lg text-gray-900">{quote.quantity}</p></div>
              <div><p className="text-xs text-gray-500">Size</p><p className="font-bold text-lg text-gray-900">{quote.width} x {quote.height}"</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Paper Stock</p><p className="font-bold text-lg text-gray-900">{quote.paper_stock}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Finishing</p><p className="font-bold text-sm text-gray-900">{finishing}</p></div>
              <div className="col-span-1"><p className="text-xs text-gray-500">Mailing</p><p className="font-bold text-sm text-gray-900">{mailing}</p></div>
              <div className="col-span-1"><p className="text-xs text-gray-500">Production Method</p><p className="font-bold text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">{quote.production_method}</p></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"><p className="text-[11px] font-bold uppercase text-gray-500">Route summary</p><p className="mt-1 text-lg font-bold text-gray-900">{bestRoute.nUp || '--'}-up on {bestRoute.usableSheet || bestRoute.sheet || '—'}</p><p className="text-xs text-gray-500 mt-1">Raw sheet: {bestRoute.sheet || '—'}</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"><p className="text-[11px] font-bold uppercase text-gray-500">Sheets & overs</p><p className="mt-1 text-lg font-bold text-gray-900">{bestRoute.sheetsNeeded ?? '—'} + {bestRoute.overs ?? '—'} = {bestRoute.totalSheets ?? '—'}</p><p className="text-xs text-gray-500 mt-1">Waste included in estimator</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"><p className="text-[11px] font-bold uppercase text-gray-500">Component sell</p><p className="mt-1 text-sm font-bold text-gray-900">Paper ${(bestRoute.paperPrice ?? 0).toFixed(2)} • Press ${(bestRoute.pressPrice ?? 0).toFixed(2)}</p><p className="text-xs text-gray-500 mt-1">Finishing ${(bestRoute.finishingPrice ?? 0).toFixed(2)} • Mailing ${(bestRoute.mailingPrice ?? 0).toFixed(2)}</p></div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center"><div><h3 className="text-xs font-bold uppercase text-gray-500">Worksheet + Economics</h3><p className="text-sm text-gray-500">Same sheet the estimator used, carried into quote review and approval.</p></div><span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded">Admin Only</span></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-white text-gray-500 font-bold uppercase text-xs border-b border-gray-100"><tr><th className="px-6 py-3 text-left">Line</th><th className="px-6 py-3 text-left">Detail</th><th className="px-6 py-3 text-left">Cost</th><th className="px-6 py-3 text-left">Sell</th><th className="px-6 py-3 text-right">Gross</th></tr></thead><tbody className="divide-y divide-gray-100">{worksheetLines.map((item: any, i: number) => { const margin = Number(item.price || 0) - Number(item.cost || 0); return (<tr key={i} className="hover:bg-gray-50"><td className="px-6 py-4 font-bold text-gray-900">{item.label || item.name}</td><td className="px-6 py-4 text-xs text-gray-500">{item.detail || '—'}</td><td className="px-6 py-4 text-xs font-mono text-red-600">${Number(item.cost || 0).toFixed(2)}</td><td className="px-6 py-4 text-xs font-mono text-gray-900">${Number(item.price || 0).toFixed(2)}</td><td className="px-6 py-4 text-right text-xs font-mono text-gray-600">${margin.toFixed(2)}</td></tr>); })}</tbody></table></div>
          </div>

          {routes.length > 1 && <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"><div className="px-6 py-3 bg-gray-50 border-b border-gray-100"><h3 className="text-xs font-bold uppercase text-gray-500">Route comparison</h3></div><div className="divide-y divide-gray-100">{routes.map((route: any, idx: number) => (<div key={idx} className={`px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${idx === 0 ? 'bg-green-50' : 'bg-white'}`}><div><p className="font-bold text-gray-900">{route.method} {idx === 0 && <span className="ml-2 text-[10px] font-bold text-green-700">WINNER</span>}</p><p className="text-xs text-gray-500">{route.paperName} • {route.nUp}-up • {route.sheetsNeeded}+{route.overs} overs</p></div><div className="text-right"><p className="font-mono font-bold text-gray-900">${Number(route.totalPrice || 0).toFixed(2)}</p><p className="text-xs text-gray-500">Cost ${Number(route.totalCost || 0).toFixed(2)}</p></div></div>))}</div></div>}
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 rounded-xl border border-green-200 p-6 shadow-sm"><p className="text-xs font-bold uppercase text-green-700 mb-1">Approval Economics</p><p className="text-4xl font-black text-green-900 mb-2">${quote.total_price?.toFixed(2)}</p><p className="text-sm text-green-700 font-medium">${(quote.total_price / quote.quantity).toFixed(3)} per unit</p><div className="mt-4 pt-4 border-t border-green-200 space-y-2 text-sm"><div className="flex items-center justify-between"><span className="text-green-800">Internal cost</span><span className="font-mono text-green-900">${Number(worksheetTotals.cost || 0).toFixed(2)}</span></div><div className="flex items-center justify-between"><span className="text-green-800">Gross margin</span><span className="font-mono text-green-900">${Number(worksheetTotals.margin || 0).toFixed(2)}</span></div><div className="flex items-center justify-between"><span className="text-green-800">Margin %</span><span className="font-mono text-green-900">{Number(worksheetTotals.marginPct || 0).toFixed(1)}%</span></div></div></div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"><p className="text-xs font-bold uppercase text-gray-500 mb-2">Approval state</p><p className="text-sm text-gray-900 font-bold">{quote.status}</p><p className="text-xs text-gray-500 mt-2">Sales, production, and customer approval now look at the same worksheet/economics model.</p></div>
        </div>
      </div>
    </div>
  );
}
