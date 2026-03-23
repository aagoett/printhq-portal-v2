'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { FileText, ArrowRight, Plus, Clock, CheckCircle2, CircleSlash } from 'lucide-react';
import Link from 'next/link';
import InternalPageHeader from '@/components/InternalPageHeader';
import CustomerPortalShell from '@/components/CustomerPortalShell';

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('customer');

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchQuotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const userRole = profile?.role || 'customer';
      setRole(userRole);
      const isInternal = userRole === 'admin' || userRole === 'staff';

      let query = supabase.from('quotes').select('*').order('created_at', { ascending: false });
      if (!isInternal) {
        query = user.email
          ? query.or(`user_id.eq.${user.id},customer_email.eq.${user.email},guest_email.eq.${user.email}`)
          : query.eq('user_id', user.id);
      }

      const { data } = await query;
      setQuotes(data || []);
      setLoading(false);
    };

    fetchQuotes();
  }, [supabase]);

  const isInternal = role === 'admin' || role === 'staff';

  if (!isInternal) {
    return (
      <CustomerPortalShell
        title="Quotes"
        description="Review current estimates, approve work, and reopen anything that needs clarification."
        activeHref="/dashboard/quotes"
      >
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-400">Loading quotes…</div>
          ) : quotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <FileText className="mx-auto mb-3 text-gray-300" size={36} />
              <h2 className="text-lg font-bold text-gray-900">No quotes yet</h2>
              <p className="mt-2 text-sm text-gray-500">When we prepare an estimate for you, it will show up here with approval status and pricing.</p>
            </div>
          ) : (
            quotes.map((quote) => {
              const isApproved = quote.status === 'Approved' || quote.status === 'Converted';
              const isRejected = quote.status === 'Rejected';
              const product = quote.cost_breakdown?.product;
              const productLabel = product?.customLabel || product?.label;
              return (
                <Link key={quote.id} href={`/dashboard/quotes/${quote.id}`} className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-black">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{quote.title || `Quote #${quote.quote_number}`}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {quote.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{productLabel ? `${productLabel}${product?.sizeLabel ? ` • ${product.sizeLabel}` : ''}` : `${quote.width} x ${quote.height}"`} • Qty {Number(quote.quantity || 0).toLocaleString()}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1"><Clock size={14} /> {new Date(quote.created_at).toLocaleDateString()}</span>
                        {isApproved ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={14} /> Ready to move</span> : null}
                        {isRejected ? <span className="inline-flex items-center gap-1 text-red-700"><CircleSlash size={14} /> Declined</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase text-gray-400">Estimate</p>
                        <p className="text-2xl font-black text-gray-900">${Number(quote.total_price || 0).toFixed(2)}</p>
                      </div>
                      <ArrowRight className="text-gray-300" size={20} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </CustomerPortalShell>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <InternalPageHeader
        title="Quote History"
        description="Review saved estimates, reopen pricing logic, and move approved work into production."
        icon={FileText}
        breadcrumbs={[{ label: 'Quotes' }]}
        actions={
          <Link href="/dashboard/pricing/estimator" className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
            <Plus size={16}/> New Estimate
          </Link>
        }
        maxWidthClassName="max-w-6xl"
        sticky
      />

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
