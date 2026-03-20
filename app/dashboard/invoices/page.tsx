'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Plus, Search, Filter, Printer, FileText, 
  Calendar, MoreHorizontal, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import InternalPageHeader from '@/components/InternalPageHeader';

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        company:brands!company_id(name, short_name),
        order:orders(id, jobs(title))
      `)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setInvoices(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'void': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number?.toString().includes(searchTerm) ||
    inv.order?.jobs?.[0]?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <InternalPageHeader
        title="Invoice Ledger"
        description="Manage billing, balances, and accounts receivable without losing the trail back to the shop floor."
        icon={FileText}
        breadcrumbs={[{ label: 'Invoices' }]}
        actions={
          <Link 
            href="/dashboard/invoices/new" 
            className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
          >
            <Plus size={18} /> New Custom Invoice
          </Link>
        }
        maxWidthClassName="max-w-7xl"
        sticky
      />

      {/* FILTER BAR */}
      <div className="px-8 py-4 border-b bg-white">
        <div className="max-w-7xl mx-auto flex gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Invoice # or Job Title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:bg-white transition-all outline-none border focus:border-black"
            />
          </div>
          <button className="px-6 py-3 bg-white border border-gray-200 rounded-xl flex items-center gap-2 text-sm font-black hover:border-black transition-colors">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      {/* MAIN LIST */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 animate-pulse">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest">Scanning Ledger...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
               <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
               <p className="text-xl font-black text-gray-900 mb-2">No Invoices Found</p>
               <p className="text-sm">Start by generating an invoice from an active job.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                  <tr>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Invoice #</th>
                    <th className="px-8 py-4">Job / Project</th>
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4 text-right">Total Amount</th>
                    <th className="px-8 py-4 text-right">Balance</th>
                    <th className="px-8 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition-all group">
                      <td className="px-8 py-6">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(inv.status)}`}>
                           {inv.status}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-mono text-lg font-black text-gray-900 italic">#{inv.invoice_number}</span>
                      </td>
                      <td className="px-8 py-6">
                        <Link href={`/dashboard/jobs/${inv.order?.jobs?.[0]?.id}`} className="block">
                          <p className="text-sm font-black text-gray-900 hover:text-blue-600 transition-colors">{inv.order?.jobs?.[0]?.title || 'Multi-Job Order'}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1 font-bold">
                             <CheckCircle2 size={10}/> Order #{inv.order_id?.substring(0,8).toUpperCase()}
                          </p>
                        </Link>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                           <Calendar size={14}/> {new Date(inv.created_at).toLocaleDateString()}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <span className="text-lg font-black text-gray-900 tracking-tighter">${inv.total.toFixed(2)}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <span className={`text-sm font-black ${ (inv.total - inv.paid_amount) > 0 ? 'text-red-600' : 'text-emerald-600' }`}>
                           ${(inv.total - inv.paid_amount).toFixed(2)}
                         </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            <Link 
                               href={`/dashboard/invoices/${inv.id}`}
                               className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
                            >
                               <Printer size={20}/>
                            </Link>
                            <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all">
                               <MoreHorizontal size={20}/>
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
