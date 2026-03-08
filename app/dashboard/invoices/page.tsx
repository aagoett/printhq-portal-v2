'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import {
  FileText, Plus, DollarSign, Clock, CheckCircle, AlertCircle,
  ArrowLeft, Search, Filter, ChevronRight, Building2, Printer
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';

type Invoice = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  customer_email: string;
  customer_name: string;
  brand_id: string;
  brand_name: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  due_date: string;
  created_at: string;
  job_id?: string;
  order_id?: string;
  notes?: string;
};

const STATUS_STYLES: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-700',
  Sent:      'bg-blue-100 text-blue-700',
  Paid:      'bg-green-100 text-green-700',
  Overdue:   'bg-red-100 text-red-700',
  Cancelled: 'bg-yellow-100 text-yellow-800',
};

const FILTER_TABS: Array<InvoiceStatus | 'All'> = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'];

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<InvoiceStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
      router.push('/dashboard');
      return;
    }

    const [invResult, brandResult] = await Promise.all([
      supabase.from('invoices').select('*, brands(name)').order('created_at', { ascending: false }),
      supabase.from('brands').select('id, name').order('name'),
    ]);

    if (invResult.data) {
      setInvoices(invResult.data.map((inv: any) => ({
        ...inv,
        brand_name: inv.brands?.name || 'PrintHQ',
      })));
    }
    if (brandResult.data) setBrands(brandResult.data);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchFilter = activeFilter === 'All' || inv.status === activeFilter;
      const matchBrand  = !brandFilter || inv.brand_id === brandFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch = !q
        || inv.invoice_number?.toLowerCase().includes(q)
        || inv.customer_email?.toLowerCase().includes(q)
        || inv.customer_name?.toLowerCase().includes(q);
      return matchFilter && matchBrand && matchSearch;
    });
  }, [invoices, activeFilter, brandFilter, searchTerm]);

  const stats = useMemo(() => ({
    totalBilled:  invoices.reduce((s, i) => s + (i.total || 0), 0),
    collected:    invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total || 0), 0),
    outstanding:  invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + (i.total || 0), 0),
    overdueCount: invoices.filter(i => i.status === 'Overdue').length,
  }), [invoices]);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Printer size={28} className="text-gray-400" /> Invoices
              </h1>
              <p className="text-gray-500 mt-1">Billing management across all 5 companies.</p>
            </div>
          </div>
          <Link
            href="/dashboard/invoices/new"
            className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-800 shadow-lg transition-colors"
          >
            <Plus size={16} /> New Invoice
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Billed"    value={fmt(stats.totalBilled)}  icon={<DollarSign  size={20} />} color="text-blue-600  bg-blue-50"  />
          <KPICard label="Collected"        value={fmt(stats.collected)}    icon={<CheckCircle size={20} />} color="text-green-600 bg-green-50" />
          <KPICard label="Outstanding"      value={fmt(stats.outstanding)}  icon={<Clock       size={20} />} color="text-yellow-600 bg-yellow-50" />
          <KPICard label="Overdue Invoices" value={String(stats.overdueCount)} icon={<AlertCircle size={20} />} color="text-red-600   bg-red-50"   />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {FILTER_TABS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeFilter === f ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-black hover:text-black'}`}
              >
                {f}
                {f !== 'All' && (
                  <span className="ml-2 text-[10px] font-mono">
                    ({invoices.filter(i => i.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <Filter size={14} className="text-gray-400" />
              <select
                value={brandFilter}
                onChange={e => setBrandFilter(e.target.value)}
                className="text-sm text-gray-700 outline-none bg-transparent"
              >
                <option value="">All Companies</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-black w-56 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="mx-auto mb-3 text-gray-200" size={48} />
              <p className="text-gray-500 font-medium mb-1">No invoices found</p>
              <p className="text-gray-400 text-sm mb-4">
                {searchTerm || activeFilter !== 'All' ? 'Try adjusting your filters.' : 'Create your first invoice to get started.'}
              </p>
              {activeFilter === 'All' && !searchTerm && (
                <Link href="/dashboard/invoices/new" className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800">
                  <Plus size={14} /> Create Invoice
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Invoice #</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Company</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Due Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      #{inv.invoice_number || inv.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{inv.customer_name || '—'}</p>
                      <p className="text-xs text-gray-400">{inv.customer_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                        <Building2 size={13} className="text-gray-400" />
                        {inv.brand_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {fmtDate(inv.due_date)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {fmt(inv.total || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-gray-400 hover:text-black text-xs font-bold uppercase transition-colors group-hover:text-black"
                      >
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Showing {filtered.length} of {invoices.length} invoices
        </p>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>{icon}</div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 uppercase font-bold mt-1">{label}</p>
    </div>
  );
}
