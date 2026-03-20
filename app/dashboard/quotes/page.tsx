'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { FileText, ArrowRight, Plus, Calendar, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchQuotes = async () => {
        const { data } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
        if (data) setQuotes(data);
        setLoading(false);
    };
    fetchQuotes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Quote History</h1>
                <p className="text-sm text-gray-500">Manage your saved estimates.</p>
            </div>
            <Link href="/dashboard/pricing/estimator" className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                <Plus size={16}/> New Estimate
            </Link>
        </div>

        <div className="max-w-6xl mx-auto space-y-4">
            {quotes.map((quote) => (
                <Link key={quote.id} href={`/dashboard/quotes/${quote.id}`} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:border-black transition-colors group">
                    <div className="flex items-start gap-4">
                        <div className="bg-gray-100 p-3 rounded-lg text-gray-500 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            <FileText size={24}/>
                        </div>
                        <div>
                            {(() => {
                              const product = quote.cost_breakdown?.product;
                              const productLabel = product?.customLabel || product?.label;
                              const profile = quote.cost_breakdown?.pricingProfile;
                              const factor = quote.cost_breakdown?.profileFactor;
                              return (
                                <>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-black">{quote.title || `Quote #${quote.quote_number}`}</h3>
                                    {profile && <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-blue-700 capitalize text-[10px] font-black">{profile}{factor ? ` ×${Number(factor).toFixed(2)}` : ''}</span>}
                                  </div>
                                  <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono font-bold">{quote.quantity} qty</span>
                                      <span className="text-gray-400">•</span>
                                      <span>{productLabel ? `${productLabel} ${product?.sizeLabel || ''}` : `${quote.width}x${quote.height}"`} on {quote.paper_stock}</span>
                                  </p>
                                </>
                              );
                            })()}
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-bold">Total Price</p>
                            <p className="text-xl font-black text-gray-900">${quote.total_price?.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-bold">Method</p>
                            <p className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{quote.production_method}</p>
                        </div>
                        <span className="p-2 text-gray-300 group-hover:text-black group-hover:bg-gray-100 rounded-full transition-all">
                            <ArrowRight size={20}/>
                        </span>
                    </div>
                </Link>
            ))}
            
            {quotes.length === 0 && !loading && (
                <div className="text-center py-20 text-gray-400">No quotes saved yet.</div>
            )}
        </div>
    </div>
  );
}
