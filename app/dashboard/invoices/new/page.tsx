'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, DollarSign, Loader2, User, Building2, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

const PAYMENT_TERMS = ['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'];

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillJobId = searchParams.get('job_id');

  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [brandId, setBrandId] = useState('');
  const [linkedJobId, setLinkedJobId] = useState(prefillJobId || '');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0 },
  ]);

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

    const [pResult, bResult, jResult] = await Promise.all([
      supabase.from('profiles').select('id, email, first_name, last_name, company, role').order('email'),
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('jobs').select('id, title, user_id, guest_email').order('created_at', { ascending: false }).limit(100),
    ]);

    if (pResult.data) {
      const customers = pResult.data.filter((p: any) => p.role === 'customer' || p.role === 'admin' || p.role === 'staff');
      setProfiles(customers);
      if (customers.length > 0) setSelectedCustomerId(customers[0].id);
    }
    if (bResult.data) {
      setBrands(bResult.data);
      if (bResult.data.length > 0) setBrandId(bResult.data[0].id);
    }
    if (jResult.data) {
      setJobs(jResult.data);

      // If pre-filling from a job, load job details
      if (prefillJobId) {
        const job = jResult.data.find((j: any) => j.id === prefillJobId);
        if (job) {
          setLinkedJobId(job.id);
          if (job.user_id) setSelectedCustomerId(job.user_id);
          if (job.guest_email) { setIsGuest(true); setGuestEmail(job.guest_email); }
          // Pre-fill one line item with job title
          setLineItems([{ id: '1', description: job.title, quantity: 1, unit_price: 0 }]);
        }
      }
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter(i => i.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const selectedProfile = profiles.find(p => p.id === selectedCustomerId);

  const generateInvoiceNumber = () => {
    const now = new Date();
    return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!brandId) { alert('Please select a company/brand.'); return; }
    if (!isGuest && !selectedCustomerId) { alert('Please select a customer.'); return; }
    if (isGuest && !guestEmail.includes('@')) { alert('Please enter a valid guest email.'); return; }
    const validItems = lineItems.filter(i => i.description.trim());
    if (validItems.length === 0) { alert('Please add at least one line item.'); return; }

    setSaving(true);
    try {
      const customerEmail = isGuest ? guestEmail : selectedProfile?.email || '';
      const customerName = isGuest
        ? (guestName || guestEmail.split('@')[0])
        : selectedProfile
          ? `${selectedProfile.first_name || ''} ${selectedProfile.last_name || ''}`.trim() || selectedProfile.email
          : '';

      const invoiceNumber = generateInvoiceNumber();

      const { data: inv, error: invError } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        status: asDraft ? 'Draft' : 'Sent',
        customer_id:    isGuest ? null : selectedCustomerId,
        customer_email: customerEmail,
        customer_name:  customerName,
        brand_id:       brandId,
        job_id:         linkedJobId || null,
        subtotal,
        tax_rate:       taxRate,
        tax_amount:     taxAmount,
        total,
        due_date:       dueDate || null,
        payment_terms:  paymentTerms,
        notes:          notes || null,
      }).select().single();

      if (invError) throw invError;

      // Insert line items
      const itemRows = validItems.map((item, idx) => ({
        invoice_id:  inv.id,
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unit_price,
        total:       item.quantity * item.unit_price,
        sort_order:  idx,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows);
      if (itemsError) throw itemsError;

      router.push(`/dashboard/invoices/${inv.id}`);
    } catch (e: any) {
      alert('Error creating invoice: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/invoices" className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
            <p className="text-gray-500 text-sm mt-0.5">Create a new invoice for a customer or job.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="col-span-2 space-y-6">

            {/* Customer & Brand */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><User size={16} className="text-gray-400" /> Customer & Company</h3>

              <div className="space-y-4">
                {/* Company/Brand */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Company / Brand *</label>
                  <select
                    value={brandId}
                    onChange={e => setBrandId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black bg-white font-medium"
                  >
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {/* Customer Toggle */}
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Customer *</label>
                  <button
                    type="button"
                    onClick={() => setIsGuest(!isGuest)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {isGuest ? '← Select Existing' : '+ Guest / New Customer'}
                  </button>
                </div>

                {isGuest ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email *</label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="Full name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black bg-white"
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.first_name ? `${p.first_name} ${p.last_name || ''}` : p.email}
                        {p.company ? ` (${p.company})` : ''}
                        {p.role !== 'customer' ? ` [${p.role.toUpperCase()}]` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {/* Linked Job (optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Link to Job (optional)</label>
                  <select
                    value={linkedJobId}
                    onChange={e => setLinkedJobId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black bg-white"
                  >
                    <option value="">— No linked job —</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>
                        #{j.id.substring(0, 8).toUpperCase()} – {j.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={16} className="text-gray-400" /> Line Items</h3>
                <button onClick={addLineItem} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <Plus size={13} /> Add Item
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 gap-2 px-6 py-2 text-[10px] font-bold uppercase text-gray-400 bg-gray-50">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-3 text-right">Unit Price</div>
                  <div className="col-span-1" />
                </div>
                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 px-6 py-3 items-center">
                    <div className="col-span-6">
                      <input
                        value={item.description}
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="e.g. Business Cards (1000 qty, 4/0)"
                        className="w-full text-sm rounded border border-gray-200 px-3 py-2 outline-none focus:border-black"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full text-sm rounded border border-gray-200 px-3 py-2 outline-none focus:border-black text-right font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price || ''}
                          onChange={e => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full text-sm rounded border border-gray-200 pl-7 pr-3 py-2 outline-none focus:border-black text-right font-mono"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <button onClick={() => removeLineItem(item.id)} disabled={lineItems.length === 1} className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="max-w-xs ml-auto space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium">{fmt(subtotal)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax ({taxRate}%)</span>
                      <span className="font-mono font-medium">{fmt(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-300 pt-2">
                    <span>Total</span>
                    <span className="font-mono">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><DollarSign size={16} className="text-gray-400" /> Invoice Settings</h3>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black bg-white"
                >
                  {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate || ''}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Notes / Terms</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Payment instructions, thank you note, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black resize-none"
                />
              </div>

              {/* Total Preview */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Invoice Total</p>
                <p className="text-3xl font-black text-gray-900">{fmt(total)}</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Create & Send Invoice
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
