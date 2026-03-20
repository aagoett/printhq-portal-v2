'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Printer, FileText, ArrowRight, Link as LinkIcon, Check, Copy
} from 'lucide-react';
import Link from 'next/link';

export default function QuoteDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchQuote();
    // Real-time listener: If customer approves, update screen instantly
    const channel = supabase.channel('quote_update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quotes', filter: `id=eq.${params.id}` }, (payload) => {
          setQuote(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchQuote = async () => {
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
      if (!confirm("Create LIVE JOB from this quote?")) return;
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* HEADER */}
        <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/quotes" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Quote #{quote.quote_number}</h1>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${quote.status === 'Approved' ? 'bg-green-100 text-green-700' : quote.status === 'Converted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {quote.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">{quote.title}</p>
                </div>
            </div>
            
            {/* ACTION BAR */}
            <div className="flex gap-2">
                {/* SHARE BUTTON */}
                <button onClick={handleCopyLink} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center gap-2 transition-all active:scale-95">
                    {linkCopied ? <Check size={16} className="text-green-600"/> : <LinkIcon size={16}/>}
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>

                {/* CONVERT BUTTON */}
                {quote.status === 'Approved' ? (
                    <button 
                        onClick={handleConvertToJob} 
                        disabled={isConverting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
                    >
                        {isConverting ? 'Processing...' : 'Create Live Job'} <ArrowRight size={16}/>
                    </button>
                ) : quote.status === 'Converted' ? (
                    <button disabled className="px-6 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold flex items-center gap-2 cursor-not-allowed">
                        Already Converted
                    </button>
                ) : (
                    <button disabled className="px-6 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm font-bold flex items-center gap-2 cursor-not-allowed">
                        Waiting for Approval
                    </button>
                )}
            </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* MAIN ESTIMATE */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2"><FileText size={14}/> Job Specifications</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div><p className="text-xs text-gray-500">Quantity</p><p className="font-bold text-lg text-gray-900">{quote.quantity}</p></div>
                        <div><p className="text-xs text-gray-500">Size</p><p className="font-bold text-lg text-gray-900">{quote.width} x {quote.height}"</p></div>
                        <div className="col-span-2"><p className="text-xs text-gray-500">Paper Stock</p><p className="font-bold text-lg text-gray-900">{quote.paper_stock}</p></div>
                        <div className="col-span-2"><p className="text-xs text-gray-500">Finishing</p><p className="font-bold text-sm text-gray-900">{quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Finishing')?.detail || 'None'}</p></div>
                        <div className="col-span-1"><p className="text-xs text-gray-500">Mailing</p><p className="font-bold text-sm text-gray-900">{quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Mailing')?.detail || 'None'}</p></div>
                        <div className="col-span-1"><p className="text-xs text-gray-500">Production Method</p><p className="font-bold text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">{quote.production_method}</p></div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-[11px] font-bold uppercase text-gray-500">Route summary</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{bestRoute.nUp || '--'}-up on {bestRoute.usableSheet || bestRoute.sheet || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">Raw sheet: {bestRoute.sheet || '—'}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-[11px] font-bold uppercase text-gray-500">Sheets & overs</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{bestRoute.sheetsNeeded ?? '—'} + {bestRoute.overs ?? '—'} = {bestRoute.totalSheets ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">Waste included in estimator</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-[11px] font-bold uppercase text-gray-500">Component sell</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">Paper ${(bestRoute.paperPrice ?? 0).toFixed(2)} • Press ${(bestRoute.pressPrice ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Finishing ${(bestRoute.finishingPrice ?? 0).toFixed(2)} • Mailing ${(bestRoute.mailingPrice ?? 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-bold uppercase text-gray-500">Worksheet + Economics</h3>
                          <p className="text-sm text-gray-500">Same sheet the estimator used, carried into quote review and approval.</p>
                        </div>
                        <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded">Admin Only</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white text-gray-500 font-bold uppercase text-xs border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left">Line</th>
                            <th className="px-6 py-3 text-left">Detail</th>
                            <th className="px-6 py-3 text-left">Cost</th>
                            <th className="px-6 py-3 text-left">Sell</th>
                            <th className="px-6 py-3 text-right">Gross</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {worksheetLines.map((item: any, i: number) => {
                            const margin = Number(item.price || 0) - Number(item.cost || 0);
                            return (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-bold text-gray-900">{item.label || item.name}</td>
                                <td className="px-6 py-4 text-xs text-gray-500">{item.detail || '—'}</td>
                                <td className="px-6 py-4 text-xs font-mono text-red-600">${Number(item.cost || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-xs font-mono text-gray-900">${Number(item.price || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-xs font-mono text-gray-600">${margin.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-100">
                          <tr>
                            <td colSpan={2} className="px-6 py-4 text-right font-bold text-gray-900">Totals</td>
                            <td className="px-6 py-4 font-mono text-red-700">${Number(worksheetTotals.cost || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 font-mono text-gray-900">${Number(worksheetTotals.price || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-mono text-gray-700">${Number(worksheetTotals.margin || 0).toFixed(2)} ({Number(worksheetTotals.marginPct || 0).toFixed(1)}%)</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                </div>

                {routes.length > 1 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                      <h3 className="text-xs font-bold uppercase text-gray-500">Route comparison</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {routes.map((route: any, idx: number) => (
                        <div key={idx} className={`px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${idx === 0 ? 'bg-green-50' : 'bg-white'}`}>
                          <div>
                            <p className="font-bold text-gray-900">{route.method} {idx === 0 && <span className="ml-2 text-[10px] font-bold text-green-700">WINNER</span>}</p>
                            <p className="text-xs text-gray-500">{route.paperName} • {route.nUp}-up • {route.sheetsNeeded}+{route.overs} overs</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-gray-900">${Number(route.totalPrice || 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Cost ${Number(route.totalCost || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* SIDEBAR */}
            <div className="space-y-6">
                <div className="bg-green-50 rounded-xl border border-green-200 p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase text-green-700 mb-1">Approval Economics</p>
                    <p className="text-4xl font-black text-green-900 mb-2">${quote.total_price?.toFixed(2)}</p>
                    <p className="text-sm text-green-700 font-medium">${(quote.total_price / quote.quantity).toFixed(3)} per unit</p>
                    <div className="mt-4 pt-4 border-t border-green-200 space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span className="text-green-800">Internal cost</span><span className="font-mono text-green-900">${Number(worksheetTotals.cost || 0).toFixed(2)}</span></div>
                      <div className="flex items-center justify-between"><span className="text-green-800">Gross margin</span><span className="font-mono text-green-900">${Number(worksheetTotals.margin || 0).toFixed(2)}</span></div>
                      <div className="flex items-center justify-between"><span className="text-green-800">Margin %</span><span className="font-mono text-green-900">{Number(worksheetTotals.marginPct || 0).toFixed(1)}%</span></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase text-gray-500 mb-2">Approval state</p>
                    <p className="text-sm text-gray-900 font-bold">{quote.status}</p>
                    <p className="text-xs text-gray-500 mt-2">Sales, production, and customer approval now look at the same worksheet/economics model.</p>
                </div>
            </div>
        </div>
    </div>
  );
}
