'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import { FileText, ArrowLeft, Plus, Calculator, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function QuotesListPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchQuotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setQuotes(data);
      setLoading(false);
    };
    fetchQuotes();
  }, []);

  const fmt = (n: number) => n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calculator size={28} className="text-gray-400" /> Quote History
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Saved estimates and pricing quotes.</p>
            </div>
          </div>
          <Link
            href="/dashboard/pricing/estimator"
            className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-800 shadow-lg transition-colors"
          >
            <Plus size={16} /> New Estimate
          </Link>
        </div>

        {/* Quotes List */}
        <div className="space-y-3">
          {quotes.map((quote) => (
            <Link key={quote.id} href={`/dashboard/quotes/${quote.id}`}>
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:border-black hover:shadow-md transition-all group">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-100 p-3 rounded-xl text-gray-500 group-hover:bg-black group-hover:text-white transition-colors">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-black">
                      {quote.title || `Quote #${quote.quote_number || quote.id.substring(0, 6).toUpperCase()}`}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      {quote.quantity != null && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono font-bold">{quote.quantity.toLocaleString()} qty</span>
                      )}
                      {quote.width && quote.height && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{quote.width}" × {quote.height}"</span>
                        </>
                      )}
                      {quote.paper_stock && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{quote.paper_stock}</span>
                        </>
                      )}
                    </p>
                    {quote.created_at && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {quote.production_method && (
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Method</p>
                      <p className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{quote.production_method}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Total</p>
                    <p className="text-xl font-black text-gray-900">{fmt(quote.total_price)}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </div>
              </div>
            </Link>
          ))}

          {quotes.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <Calculator size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-medium mb-1">No quotes saved yet.</p>
              <p className="text-gray-400 text-sm mb-4">Use the estimator to calculate and save pricing quotes.</p>
              <Link
                href="/dashboard/pricing/estimator"
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800"
              >
                <Plus size={14} /> Create First Quote
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
