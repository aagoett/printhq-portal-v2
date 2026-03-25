'use client';
/* eslint-disable react/no-unescaped-entities */

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

type EstimateBreakdownItem = {
  label: string;
  detail?: string;
  cost: number;
  price: number;
};

type EstimateResultRecord = {
  quantity: number;
  sheets: number;
  pressHours: number;
  totalCost: number;
  totalPrice: number;
  grossProfit?: number;
  grossMarginPercent?: number;
  breakdown: EstimateBreakdownItem[];
};

type QuoteRecord = {
  id: string;
  title?: string | null;
  contact?: string | null;
  quantities?: number[] | null;
  total_cost?: number | null;
  total_price?: number | null;
  created_at?: string;
  breakdown?: {
    results?: EstimateResultRecord[];
    summary?: {
      gross_profit?: number;
      gross_margin_percent?: number;
    };
  } | null;
};

export default function QuoteDetailsPage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchQuote();
  }, []);

  const fetchQuote = async () => {
    const { data } = await supabase.from('quotes').select('*').eq('id', params.id).single();
    if (data) setQuote(data as QuoteRecord);
    setLoading(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/quotes/${params.id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const quoteResults = useMemo(() => quote?.breakdown?.results || [], [quote]);
  const grossProfit = quote?.breakdown?.summary?.gross_profit ?? ((quote?.total_price || 0) - (quote?.total_cost || 0));
  const grossMargin = quote?.breakdown?.summary?.gross_margin_percent ?? ((quote?.total_price || 0) > 0 ? (grossProfit / (quote?.total_price || 1)) * 100 : 0);

  if (loading) return <div className="p-12 text-center text-gray-400">Loading Quote...</div>;
  if (!quote) return <div className="p-12 text-center text-red-400">Quote not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quotes" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote.title || 'Saved estimate'}</h1>
            <p className="text-sm text-gray-500">{quote.contact || 'No contact provided'}{quote.created_at ? ` • ${new Date(quote.created_at).toLocaleString()}` : ''}</p>
          </div>
        </div>

        <button onClick={handleCopyLink} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center gap-2 transition-all active:scale-95">
          {linkCopied ? <Check size={16} className="text-green-600"/> : <LinkIcon size={16}/>}
          {linkCopied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4">Saved quote summary</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div className="col-span-2"><p className="text-xs text-gray-500">Quantities</p><p className="font-bold text-lg text-gray-900">{(quote.quantities || []).map((q) => q.toLocaleString()).join(', ') || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Total Cost</p><p className="font-bold text-lg text-gray-900">${(quote.total_cost || 0).toFixed(2)}</p></div>
              <div><p className="text-xs text-gray-500">Total Price</p><p className="font-bold text-lg text-gray-900">${(quote.total_price || 0).toFixed(2)}</p></div>
              <div><p className="text-xs text-gray-500">Gross Profit</p><p className="font-bold text-lg text-gray-900">${grossProfit.toFixed(2)}</p></div>
              <div><p className="text-xs text-gray-500">Gross Margin</p><p className="font-bold text-lg text-gray-900">{grossMargin.toFixed(1)}%</p></div>
            </div>
          </div>

          <div className="space-y-4">
            {quoteResults.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-sm text-gray-500">No quantity breakdown was stored for this quote.</div>
            )}

            {quoteResults.map((result) => (
              <div key={result.quantity} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase font-bold text-gray-400">Quantity</div>
                    <div className="text-xl font-bold text-gray-900">{result.quantity.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase font-bold text-gray-400">Price</div>
                    <div className="text-xl font-black text-gray-900">${result.totalPrice.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Cost ${result.totalCost.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 px-6 py-4 border-b bg-white">
                  <SavedMetric label="Sheets" value={result.sheets.toLocaleString()} />
                  <SavedMetric label="Press Hours" value={result.pressHours.toFixed(2)} />
                  <SavedMetric label="Gross Profit" value={`$${(result.grossProfit ?? (result.totalPrice - result.totalCost)).toFixed(2)}`} />
                  <SavedMetric label="Gross Margin" value={`${(result.grossMarginPercent ?? (result.totalPrice > 0 ? ((result.totalPrice - result.totalCost) / result.totalPrice) * 100 : 0)).toFixed(1)}%`} />
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3 text-left">Line</th>
                      <th className="px-6 py-3 text-left">Detail</th>
                      <th className="px-6 py-3 text-right">Cost</th>
                      <th className="px-6 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.breakdown.map((item, index) => (
                      <tr key={`${result.quantity}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-semibold text-gray-900">{item.label}</td>
                        <td className="px-6 py-3 text-gray-500 text-xs">{item.detail || '—'}</td>
                        <td className="px-6 py-3 text-right text-red-700 font-mono">${item.cost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-gray-900 font-mono">${item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 rounded-xl border border-green-200 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-green-700 mb-1">Total Client Price</p>
            <p className="text-4xl font-black text-green-900 mb-2">${(quote.total_price || 0).toFixed(2)}</p>
            <p className="text-sm text-green-700 font-medium">Gross profit ${grossProfit.toFixed(2)} • margin {grossMargin.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-[11px] uppercase font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-black text-gray-900">{value}</div>
    </div>
  );
}
