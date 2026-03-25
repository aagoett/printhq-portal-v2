'use client';
/* eslint-disable react/no-unescaped-entities */

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

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase text-gray-500">Internal Cost Breakdown</h3>
                        <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded">Admin Only</span>
                    </div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {breakdown.map((item: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-gray-900">{item.name}</td>
                                    <td className="px-6 py-3 text-gray-500 text-xs">{item.detail}</td>
                                    <td className="px-6 py-3 text-right text-red-600 font-mono text-xs">${item.cost.toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-bold">
                                <td className="px-6 py-3">Total Internal Cost</td>
                                <td></td>
                                <td className="px-6 py-3 text-right text-red-700 font-mono">${quote.total_cost?.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SIDEBAR */}
            <div className="space-y-6">
                <div className="bg-green-50 rounded-xl border border-green-200 p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase text-green-700 mb-1">Total Client Price</p>
                    <p className="text-4xl font-black text-green-900 mb-2">${quote.total_price?.toFixed(2)}</p>
                    <p className="text-sm text-green-700 font-medium">${(quote.total_price / quote.quantity).toFixed(3)} per unit</p>
                </div>
            </div>
        </div>
    </div>
  );
}
