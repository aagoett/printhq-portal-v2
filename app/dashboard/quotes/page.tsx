'use client';
/* eslint-disable react/no-unescaped-entities */

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { FileText, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';

type QuoteRecord = {
  id: string;
  title?: string | null;
  contact?: string | null;
  quantities?: number[] | null;
  total_cost?: number | null;
  total_price?: number | null;
  created_at?: string;
  breakdown?: {
    summary?: {
      gross_profit?: number;
      gross_margin_percent?: number;
    };
  } | null;
};

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchQuotes = async () => {
      const { data } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
      if (data) setQuotes(data as QuoteRecord[]);
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
        {quotes.map((quote) => {
          const quantities = quote.quantities || [];
          const grossProfit = quote.breakdown?.summary?.gross_profit ?? ((quote.total_price || 0) - (quote.total_cost || 0));
          const grossMargin = quote.breakdown?.summary?.gross_margin_percent ?? ((quote.total_price || 0) > 0 ? (grossProfit / (quote.total_price || 1)) * 100 : 0);

          return (
            <Link key={quote.id} href={`/dashboard/quotes/${quote.id}`} className="block bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-black transition-colors group">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-100 p-3 rounded-lg text-gray-500">
                    <FileText size={24}/>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{quote.title || 'Saved estimate'}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-1 flex-wrap">
                      {quote.contact && <span>{quote.contact}</span>}
                      {quote.contact && quantities.length > 0 && <span className="text-gray-400">•</span>}
                      {quantities.length > 0 && <span>{quantities.map((q) => q.toLocaleString()).join(', ')} qty</span>}
                      {quote.created_at && <><span className="text-gray-400">•</span><span>{new Date(quote.created_at).toLocaleDateString()}</span></>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <QuoteMetric label="Total Price" value={`$${(quote.total_price || 0).toFixed(2)}`} />
                  <QuoteMetric label="Total Cost" value={`$${(quote.total_cost || 0).toFixed(2)}`} />
                  <QuoteMetric label="Gross Profit" value={`$${grossProfit.toFixed(2)}`} />
                  <QuoteMetric label="Gross Margin" value={`${grossMargin.toFixed(1)}%`} />
                  <div className="p-2 text-gray-300 group-hover:text-black group-hover:bg-gray-100 rounded-full transition-all">
                    <ArrowRight size={20}/>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {quotes.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">No quotes saved yet.</div>
        )}
      </div>
    </div>
  );
}

function QuoteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right min-w-[100px]">
      <p className="text-xs text-gray-400 uppercase font-bold">{label}</p>
      <p className="text-base font-black text-gray-900">{value}</p>
    </div>
  );
}
