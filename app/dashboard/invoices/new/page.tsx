'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  ChevronLeft, Save, Plus, Trash2, Calculator, Info, AlertTriangle, CheckCircle 
} from 'lucide-react';
import Link from 'next/link';
import { COMPANIES, getCompanyById } from '@/lib/companies';
import { createInvoice } from '@/app/actions';

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<any>(null);
  
  // Invoice State
  const [selectedCompanyId, setSelectedCompanyId] = useState(COMPANIES[0].id);
  const [terms, setTerms] = useState('Net 30');
  const [shipping, setShipping] = useState(0);
  const [postage, setPostage] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [jobId]);

  const fetchInitialData = async () => {
    setLoading(true);
    
    // Fetch Brands
    const { data: bData } = await supabase.from('brands').select('*');
    if (bData) setDbBrands(bData);

    if (jobId) {
      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .select('*, orders(*), job_items(*)')
        .eq('id', jobId)
        .single();

      if (jobErr) {
        console.error(jobErr);
      } else {
        setJob(jobData);
        
        // Default items from job_items
        const initialItems = jobData.job_items?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity || 0,
          unit_price: 0,
          total_price: 0,
          is_taxable: true
        })) || [];
        
        setItems(initialItems);

        // Match company/brand
        const jobBrandId = jobData.orders?.brand_id; // Try to use ID if exists
        const jobBrandName = jobData.orders?.brand?.toUpperCase();
        
        if (jobBrandId) {
           setSelectedCompanyId(jobBrandId);
        } else if (bData) {
           const matched = bData.find((b: any) => jobBrandName?.includes(b.name.toUpperCase()));
           if (matched) setSelectedCompanyId(matched.id);
        }
      }
    }
    
    setLoading(false);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 0, unit_price: 0, total_price: 0, is_taxable: true }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  };

  const getTaxRate = () => {
    // 1. Check database brands
    const dbBrand = dbBrands.find(b => b.id === selectedCompanyId);
    if (dbBrand?.tax_rate !== undefined) return dbBrand.tax_rate;
    
    // 2. Check hardcoded fallback
    const fallback = COMPANIES.find(c => c.id === selectedCompanyId);
    return fallback?.taxRate || 0.09375; // Default San Jose
  };

  const currentTaxRate = getTaxRate();
  const subtotal = items.reduce((acc, item) => acc + item.total_price, 0);
  const taxableSubtotal = items.reduce((acc, item) => acc + (item.is_taxable ? item.total_price : 0), 0);
  const tax = taxableSubtotal * currentTaxRate;
  const total = subtotal + tax + shipping + postage;
  const balance = total - paidAmount;

  const handleSave = async () => {
    setSaving(true);
    const result = await createInvoice({
      orderId: job?.order_id,
      companyId: selectedCompanyId,
      status: 'Draft',
      subtotal,
      shipping,
      postage,
      tax,
      total,
      paidAmount,
      terms,
      items: items.map(i => ({ ...i, unit_price: i.unit_price, total_price: i.total_price }))
    });

    if (result.success) {
      router.push(`/dashboard/invoices/${result.invoiceId}`);
    } else {
      alert("Error creating invoice: " + result.error);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Job Data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={jobId ? `/dashboard/jobs/${jobId}` : '/dashboard/invoices'} className="text-gray-400 hover:text-black transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Generate New Invoice</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100 transition-all hover:scale-105 active:scale-95"
          >
            {saving ? 'Creating...' : <><Save size={18}/> Create Invoice</>}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: SETTINGS */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* COMPANY & CUSTOMER INFO */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="block text-xs font-black uppercase text-gray-400 mb-2">Billing Company</label>
                   <select 
                      value={selectedCompanyId} 
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-black"
                   >
                     {dbBrands.length > 0 ? (
                       dbBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                     ) : (
                       COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                     )}
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-black uppercase text-gray-400 mb-2">Payment Terms</label>
                   <select 
                      value={terms} 
                      onChange={(e) => setTerms(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-black"
                   >
                     <option>Due on Receipt</option>
                     <option>Net 15</option>
                     <option>Net 30</option>
                     <option>Net 60</option>
                   </select>
                </div>
             </div>
             
             {job && (
               <div className="mt-6 pt-6 border-t border-gray-50 flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                    <Info size={24}/>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Linked Proof Target</p>
                    <p className="text-sm font-black text-gray-900">{job.title}</p>
                  </div>
               </div>
             )}
          </div>

          {/* LINE ITEMS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase text-gray-400">Invoice Line Items</h3>
                <button onClick={addItem} className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <Plus size={14}/> Add Custom Item
                </button>
             </div>
             
             <div className="divide-y divide-gray-50">
                {items.map((item, index) => (
                  <div key={index} className="p-6 group relative">
                    <button 
                      onClick={() => removeItem(index)}
                      className="absolute top-6 right-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16}/>
                    </button>
                    
                    <div className="grid grid-cols-12 gap-4">
                       <div className="col-span-12 md:col-span-6">
                         <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Description</label>
                         <input 
                            value={item.description} 
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="e.g. 500 Business Cards"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-bold focus:outline-none focus:border-black"
                         />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                         <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Qty</label>
                         <input 
                            type="number"
                            value={item.quantity} 
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-bold focus:outline-none focus:border-black text-right"
                         />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                         <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Unit Price</label>
                         <input 
                            type="number"
                            step="0.0001"
                            value={item.unit_price} 
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-bold focus:outline-none focus:border-black text-right"
                         />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                         <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Price</label>
                         <div className="bg-gray-100 rounded-lg p-2 text-sm font-black text-right border border-transparent">
                            ${item.total_price.toFixed(2)}
                         </div>
                       </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                       <input 
                          type="checkbox" 
                          id={`taxable-${index}`}
                          checked={item.is_taxable}
                          onChange={(e) => updateItem(index, 'is_taxable', e.target.checked)}
                          className="rounded border-gray-300 text-black focus:ring-black"
                       />
                       <label htmlFor={`taxable-${index}`} className="text-[10px] font-black uppercase text-gray-500 cursor-pointer">This item is taxable</label>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TOTALS & SUMMARY */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24">
              <h3 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2">
                <Calculator size={16}/> Summary & Fees
              </h3>
              
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold uppercase tracking-tighter">Subtotal</span>
                    <span className="font-black text-gray-900">${subtotal.toFixed(2)}</span>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-gray-400">Shipping (Taxable)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input 
                        type="number" 
                        value={shipping} 
                        onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-7 pr-3 text-sm font-black focus:outline-none focus:border-black"
                      />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-gray-400">Postage (Non-Taxable)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input 
                        type="number" 
                        value={postage} 
                        onChange={(e) => setPostage(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-7 pr-3 text-sm font-black focus:outline-none focus:border-black"
                      />
                    </div>
                 </div>

                 <div className="pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-center text-xs mb-2">
                       <span className="text-gray-400 font-bold uppercase">Estimated Tax ({(currentTaxRate * 100).toFixed(3)}%)</span>
                       <span className="font-bold text-gray-900">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl">
                       <span className="font-black text-gray-900 uppercase tracking-tighter">Total Due</span>
                       <span className="font-black text-emerald-600">${total.toFixed(2)}</span>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-gray-50 space-y-2">
                    <label className="block text-[10px] font-black uppercase text-gray-400">Already Paid / Deposit</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-sm">$</span>
                      <input 
                        type="number" 
                        value={paidAmount} 
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-red-50/30 border border-red-100 rounded-xl py-2 pl-7 pr-3 text-sm font-black text-red-700 focus:outline-none focus:border-red-400"
                      />
                    </div>
                 </div>

                 <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex justify-between items-center mt-6">
                    <div>
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Final Balance</p>
                      <p className="text-2xl font-black text-emerald-900 tracking-tighter">${balance.toFixed(2)}</p>
                    </div>
                    <CheckCircle className="text-emerald-500" size={32}/>
                 </div>
              </div>
           </div>
           
           <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 shadow-inner">
             <AlertTriangle className="text-amber-500 flex-shrink-0" size={20}/>
             <p className="text-xs font-bold text-amber-800 leading-relaxed">
               Verify all line items and tax status before saving. Once generated, invoices move to the ledger and are assigned a formal number.
             </p>
           </div>
        </div>

      </div>
    </div>
  );
}
