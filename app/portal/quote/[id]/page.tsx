'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, FileText, Printer, Mail } from 'lucide-react';

export default function PublicQuotePage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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

  const handleStatusUpdate = async (status: string) => {
      setActionLoading(true);
      await supabase.from('quotes').update({ status }).eq('id', params.id);
      setQuote({ ...quote, status });
      setSuccessMsg(status === 'Approved' ? 'Thank you! We will start production shortly.' : 'Quote rejected. We will be in touch.');
      setActionLoading(false);
  };

  if (loading) return <div className="p-20 text-center text-gray-400">Loading Quote...</div>;
  if (!quote) return <div className="p-20 text-center text-red-400">Quote not found or expired.</div>;

  const isApproved = quote.status === 'Approved' || quote.status === 'Converted';
  const isRejected = quote.status === 'Rejected';
  const product = quote.cost_breakdown?.product;
  const productLabel = product?.customLabel || product?.label;
  const breakdown = quote.cost_breakdown?.breakdown || [];
  const routes = quote.cost_breakdown?.routes || [];
  const bestRoute: any = quote.cost_breakdown || {};
  const worksheet = quote.cost_breakdown?.worksheet;
  const worksheetLines = worksheet?.lines || breakdown;
  const worksheetTotals = worksheet?.totals;
  const routeComparison = routes.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            
            {/* BRAND HEADER */}
            <div className="bg-black text-white p-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pacific Printing</h1>
                    <p className="text-sm text-gray-400 mt-1">Official Price Estimate</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-bold">Quote Number</p>
                    <p className="text-xl font-mono font-bold">#{quote.quote_number}</p>
                </div>
            </div>

            {/* STATUS BANNER */}
            {successMsg && (
                <div className={`p-4 text-center font-bold text-sm ${quote.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {successMsg}
                </div>
            )}

            <div className="p-8 space-y-8">
                
                {/* INTRO */}
                <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{quote.title}</h2>
                        <p className="text-sm text-gray-500 mt-1">Prepared for {quote.customer_name || 'Valued Customer'}</p>
                    </div>
                    <p className="text-sm text-gray-500">{new Date(quote.created_at).toLocaleDateString()}</p>
                </div>

                {/* SPECS GRID */}
                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Project Specs</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li><span className="font-bold">Quantity:</span> {quote.quantity.toLocaleString()}</li>
                            {productLabel && (
                              <li><span className="font-bold">Product:</span> {productLabel} {product?.sizeLabel ? `(${product.sizeLabel})` : ''}</li>
                            )}
                            <li><span className="font-bold">Size:</span> {quote.width} x {quote.height}" {product?.pageCount ? `• ${product.pageCount} pages` : ''}</li>
                            <li><span className="font-bold">Stock:</span> {quote.paper_stock}</li>
                            {product?.coverStock && <li><span className="font-bold">Cover:</span> {product.coverStock}</li>}
                            {product?.insideStock && <li><span className="font-bold">Inside:</span> {product.insideStock}</li>}
                            {quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Finishing')?.detail !== 'None' && (
                                <li><span className="font-bold">Finishing:</span> {quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Finishing')?.detail}</li>
                            )}
                            {quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Mailing')?.detail !== 'None' && (
                                <li><span className="font-bold">Mailing:</span> {quote.cost_breakdown?.breakdown?.find((b: any) => b.name === 'Mailing')?.detail}</li>
                            )}
                        </ul>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Production Method</p>
                        <p className="text-sm text-gray-900">{quote.production_method}</p>
                        <p className="text-xs text-gray-500 mt-2">Includes standard 10% waste allowance.</p>
                    </div>
                </div>

                {/* PRICING TOTAL */}
                <div className="flex justify-end">
                    <div className="text-right">
                        <p className="text-sm text-gray-500 uppercase font-bold">Total Estimate</p>
                        <p className="text-4xl font-black text-gray-900">${quote.total_price.toFixed(2)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            ${(quote.total_price / quote.quantity).toFixed(3)} per unit
                        </p>
                    </div>
                </div>

                {/* BREAKDOWN */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500 mb-3">How this quote is built</p>
                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="text-[11px] font-bold uppercase text-gray-500">Chosen Route</p>
                        <p className="font-bold text-gray-900">{quote.production_method}</p>
                        <p className="text-xs text-gray-500 mt-1">Best value for this quantity/spec combo</p>
                      </div>
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="text-[11px] font-bold uppercase text-gray-500">Layout</p>
                        <p className="font-bold text-gray-900">{bestRoute.nUp || '--'}-up on {bestRoute.usableSheet || bestRoute.sheet || '—'}</p>
                        <p className="text-xs text-gray-500">Raw sheet: {bestRoute.sheet || '—'}</p>
                      </div>
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="text-[11px] font-bold uppercase text-gray-500">Sheets & Waste</p>
                        <p className="font-bold text-gray-900">{bestRoute.sheetsNeeded ?? '—'} + {bestRoute.overs ?? '—'} overs = {bestRoute.totalSheets ?? '—'}</p>
                        <p className="text-xs text-gray-500">Waste allowance already included</p>
                      </div>
                    </div>
                  </div>

                  {worksheetLines.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase text-gray-500 mb-2">Worksheet summary</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {worksheetLines.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white border rounded-lg p-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase text-gray-500">{item.label || item.name}</p>
                              <p className="text-sm text-gray-900">{item.detail || 'Included in route'}</p>
                            </div>
                            <div className="text-right text-sm font-mono font-bold text-gray-900">${Number(item.price || 0).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {routeComparison.length > 1 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase text-gray-500 mb-2">Alternative routes considered</p>
                      <div className="space-y-2">
                        {routeComparison.map((r: any, idx: number) => (
                          <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between px-3 py-3 text-sm gap-2 rounded-lg border ${idx === 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div>
                              <div className="font-bold text-gray-900">{r.method} {idx === 0 && <span className="ml-2 text-[10px] font-bold text-green-700">SELECTED</span>}</div>
                              <div className="text-xs text-gray-600">{r.nUp}-up • {r.usableSheet || r.sheet} • {r.sheetsNeeded}+{r.overs} overs</div>
                            </div>
                            <div className="text-right font-mono font-bold text-gray-900">${Number(r.totalPrice || 0).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                {!isApproved && !isRejected && (
                    <div className="flex gap-4 pt-6 border-t border-gray-100">
                        <button 
                            onClick={() => handleStatusUpdate('Rejected')}
                            disabled={actionLoading}
                            className="flex-1 py-4 border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex justify-center items-center gap-2"
                        >
                            <XCircle size={20}/> Decline
                        </button>
                        <button 
                            onClick={() => handleStatusUpdate('Approved')}
                            disabled={actionLoading}
                            className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg transition-all flex justify-center items-center gap-2"
                        >
                            <CheckCircle size={20}/> Approve Quote
                        </button>
                    </div>
                )}

                {isApproved && (
                    <div className="py-6 border-2 border-green-500 border-dashed rounded-xl flex flex-col items-center justify-center text-green-700 bg-green-50">
                        <CheckCircle size={32} className="mb-2"/>
                        <p className="font-bold text-lg">Quote Approved</p>
                        <p className="text-sm">This job has been sent to production.</p>
                    </div>
                )}

            </div>

            {/* FOOTER */}
            <div className="bg-gray-50 p-6 text-center text-xs text-gray-400">
                <p>&copy; {new Date().getFullYear()} Pacific Printing. All rights reserved.</p>
                <div className="flex justify-center gap-4 mt-2">
                    <button onClick={() => window.print()} className="hover:text-black flex items-center gap-1"><Printer size={12}/> Print</button>
                    <a href="mailto:support@pacificprinting.com" className="hover:text-black flex items-center gap-1"><Mail size={12}/> Contact Us</a>
                </div>
            </div>
        </div>
    </div>
  );
}
