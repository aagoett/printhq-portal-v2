'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, CheckCircle, Printer, FileText, 
  DollarSign, Calendar, User, ArrowRight, XCircle 
} from 'lucide-react';
import Link from 'next/link';

export default function QuoteDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchQuote();
  }, []);

  const fetchQuote = async () => {
    const { data } = await supabase.from('quotes').select('*').eq('id', params.id).single();
    if (data) setQuote(data);
    setLoading(false);
  };

  const handleConvertToJob = async () => {
      if (!confirm("This will create a LIVE JOB on the production board. Proceed?")) return;
      setIsConverting(true);

      // 1. Create the Job
      const { data: newJob, error } = await supabase.from('jobs').insert({
          title: quote.title,
          quantity: quote.quantity,
          status: 'Prepress', // Start stage
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days out
          size: `${quote.width}x${quote.height}`,
          paper_stock: quote.paper_stock,
          internal_notes: `Converted from Quote #${quote.quote_number}.\nMethod: ${quote.production_method}\nEst Cost: $${quote.total_cost}`,
          // You might want to map customer_id here if you have it
      }).select().single();

      if (error) {
          alert("Error creating job: " + error.message);
          setIsConverting(false);
          return;
      }

      // 2. Update Quote Status
      await supabase.from('quotes').update({ status: 'Converted' }).eq('id', params.id);

      // 3. Log it (Optional but good practice)
      // await supabase.from('job_logs').insert({...}) 

      // 4. Redirect
      router.push(`/dashboard/jobs/${newJob.id}`);
  };

  const handleMarkStatus = async (status: string) => {
      await supabase.from('quotes').update({ status }).eq('id', params.id);
      fetchQuote();
  };

  if (loading) return <div className="p-12 text-center text-gray-400">Loading Quote...</div>;
  if (!quote) return <div className="p-12 text-center text-red-400">Quote not found.</div>;

  const breakdown = quote.cost_breakdown?.breakdown || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* HEADER ACTIONS */}
        <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/quotes" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Quote #{quote.quote_number}</h1>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${quote.status === 'Converted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {quote.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">{quote.title}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-4 py-2 bg-white border rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                    <Printer size={16}/> Print
                </button>
                {quote.status !== 'Converted' && (
                    <button 
                        onClick={handleConvertToJob} 
                        disabled={isConverting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
                    >
                        {isConverting ? 'Processing...' : 'Approve & Create Job'} <ArrowRight size={16}/>
                    </button>
                )}
            </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* MAIN ESTIMATE */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* SPECS CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2"><FileText size={14}/> Job Specifications</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className="font-bold text-lg text-gray-900">{quote.quantity}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Size</p>
                            <p className="font-bold text-lg text-gray-900">{quote.width} x {quote.height}"</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-gray-500">Paper Stock</p>
                            <p className="font-bold text-lg text-gray-900">{quote.paper_stock}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-gray-500">Production Method</p>
                            <p className="font-bold text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">{quote.production_method}</p>
                        </div>
                    </div>
                </div>

                {/* COST BREAKDOWN (Internal Only) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
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

            {/* SIDEBAR: PRICING */}
            <div className="space-y-6">
                <div className="bg-green-50 rounded-xl border border-green-200 p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase text-green-700 mb-1">Total Client Price</p>
                    <p className="text-4xl font-black text-green-900 mb-2">${quote.total_price?.toFixed(2)}</p>
                    <p className="text-sm text-green-700 font-medium">
                        ${(quote.total_price / quote.quantity).toFixed(3)} per unit
                    </p>
                </div>

                {/* STATUS ACTIONS */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase text-gray-400 mb-2">Quote Actions</p>
                    <button onClick={() => handleMarkStatus('Sent')} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3 text-sm font-medium text-gray-600">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div> Mark as Sent
                    </button>
                    <button onClick={() => handleMarkStatus('Rejected')} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3 text-sm font-medium text-gray-600">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div> Mark as Rejected
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
}
