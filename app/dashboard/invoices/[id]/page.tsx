'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, Send, CheckCircle, Printer, Trash2, Edit2, Save, X,
  Plus, DollarSign, Calendar, Building2, User, FileText, Loader2,
  AlertCircle, Clock, Ban, RefreshCcw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { sendInvoiceEmail } from '../../../server-actions';

type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  job_item_id?: string;
  sort_order: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  customer_id?: string;
  customer_email: string;
  customer_name: string;
  brand_id: string;
  job_id?: string;
  order_id?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  due_date?: string;
  payment_terms?: string;
  notes?: string;
  created_at: string;
  brands?: { name: string };
  profiles?: { first_name?: string; last_name?: string; email: string; company?: string };
};

const STATUS_STYLES: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-700 border-gray-200',
  Sent:      'bg-blue-50 text-blue-700 border-blue-200',
  Paid:      'bg-green-50 text-green-700 border-green-200',
  Overdue:   'bg-red-50 text-red-700 border-red-200',
  Cancelled: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};

const STATUS_TRANSITIONS: Record<InvoiceStatus, { label: string; next: InvoiceStatus; icon: any; cls: string }[]> = {
  Draft:     [{ label: 'Mark as Sent',  next: 'Sent',    icon: Send,         cls: 'bg-blue-600 text-white hover:bg-blue-700' }],
  Sent:      [
    { label: 'Mark as Paid',    next: 'Paid',    icon: CheckCircle,  cls: 'bg-green-600 text-white hover:bg-green-700' },
    { label: 'Mark as Overdue', next: 'Overdue', icon: AlertCircle,  cls: 'bg-red-600 text-white hover:bg-red-700' },
  ],
  Overdue:   [{ label: 'Mark as Paid',    next: 'Paid',      icon: CheckCircle,  cls: 'bg-green-600 text-white hover:bg-green-700' }],
  Paid:      [],
  Cancelled: [{ label: 'Reopen (Draft)', next: 'Draft',   icon: RefreshCcw,   cls: 'bg-gray-600 text-white hover:bg-gray-700' }],
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});

  // New line item form
  const [showLineForm, setShowLineForm] = useState(false);
  const [newLine, setNewLine] = useState({ description: '', quantity: '1', unit_price: '' });

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    const { data: inv, error } = await supabase
      .from('invoices')
      .select('*, brands(name), profiles:customer_id(first_name, last_name, email, company)')
      .eq('id', invoiceId)
      .single();

    if (error || !inv) {
      console.error('Invoice not found:', error);
      setLoading(false);
      return;
    }

    setInvoice(inv);
    setEditForm({
      customer_name:   inv.customer_name,
      customer_email:  inv.customer_email,
      due_date:        inv.due_date?.split('T')[0] || '',
      payment_terms:   inv.payment_terms || 'Net 30',
      tax_rate:        inv.tax_rate || 0,
      notes:           inv.notes || '',
    });

    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order');

    setLineItems(items || []);
    setLoading(false);
  };

  const recalcTotals = (items: LineItem[], taxRate: number) => {
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const tax_amount = subtotal * (taxRate / 100);
    return { subtotal, tax_amount, total: subtotal + tax_amount };
  };

  const handleAddLineItem = async () => {
    if (!newLine.description || !newLine.unit_price) return;
    const qty = parseFloat(newLine.quantity) || 1;
    const price = parseFloat(newLine.unit_price) || 0;
    const total = qty * price;
    const sortOrder = lineItems.length;

    const { data, error } = await supabase.from('invoice_items').insert({
      invoice_id:  invoiceId,
      description: newLine.description,
      quantity:    qty,
      unit_price:  price,
      total,
      sort_order:  sortOrder,
    }).select().single();

    if (error) { alert('Failed to add item: ' + error.message); return; }

    const updatedItems = [...lineItems, data];
    setLineItems(updatedItems);
    setNewLine({ description: '', quantity: '1', unit_price: '' });
    setShowLineForm(false);

    // Update invoice totals in DB
    const { subtotal, tax_amount, total: newTotal } = recalcTotals(updatedItems, invoice?.tax_rate || 0);
    await supabase.from('invoices').update({ subtotal, tax_amount, total: newTotal }).eq('id', invoiceId);
    setInvoice(prev => prev ? { ...prev, subtotal, tax_amount, total: newTotal } : prev);
  };

  const handleDeleteLineItem = async (id: string) => {
    await supabase.from('invoice_items').delete().eq('id', id);
    const updatedItems = lineItems.filter(i => i.id !== id);
    setLineItems(updatedItems);
    const { subtotal, tax_amount, total } = recalcTotals(updatedItems, invoice?.tax_rate || 0);
    await supabase.from('invoices').update({ subtotal, tax_amount, total }).eq('id', invoiceId);
    setInvoice(prev => prev ? { ...prev, subtotal, tax_amount, total } : prev);
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    const taxRate = parseFloat(String(editForm.tax_rate)) || 0;
    const { subtotal, tax_amount, total } = recalcTotals(lineItems, taxRate);

    const { error } = await supabase.from('invoices').update({
      customer_name:  editForm.customer_name,
      customer_email: editForm.customer_email,
      due_date:       editForm.due_date || null,
      payment_terms:  editForm.payment_terms,
      tax_rate:       taxRate,
      tax_amount,
      subtotal,
      total,
      notes:          editForm.notes,
    }).eq('id', invoiceId);

    if (error) { alert('Save failed: ' + error.message); setSaving(false); return; }
    await fetchInvoice();
    setIsEditing(false);
    setSaving(false);
  };

  const handleStatusChange = async (next: InvoiceStatus) => {
    const { error } = await supabase.from('invoices').update({ status: next }).eq('id', invoiceId);
    if (error) { alert('Status update failed: ' + error.message); return; }
    setInvoice(prev => prev ? { ...prev, status: next } : prev);
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this invoice? This cannot be undone.')) return;
    await supabase.from('invoices').delete().eq('id', invoiceId);
    router.push('/dashboard/invoices');
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    setSendingEmail(true);
    try {
      await sendInvoiceEmail(invoiceId, invoice.customer_email, invoice.invoice_number, invoice.total);
      await handleStatusChange('Sent');
      alert('Invoice emailed successfully!');
    } catch (e) {
      alert('Email failed. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const fmt = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={32} /></div>;
  }

  if (!invoice) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-gray-500">
        <FileText size={48} className="mb-4 text-gray-300" />
        <p className="font-bold text-lg">Invoice not found</p>
        <Link href="/dashboard/invoices" className="mt-4 text-blue-600 hover:underline text-sm">← Back to Invoices</Link>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[invoice.status] || [];
  const isDraft = invoice.status === 'Draft';
  const canEdit = invoice.status === 'Draft' || invoice.status === 'Sent';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Top Nav */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/invoices" className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-500">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Invoice #{invoice.invoice_number || invoice.id.substring(0, 8).toUpperCase()}
                </h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${STATUS_STYLES[invoice.status]}`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Created {new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {invoice.brands?.name && ` · ${invoice.brands.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors">
                <Edit2 size={14} /> Edit
              </button>
            )}
            {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sendingEmail ? 'Sending...' : 'Email Invoice'}
              </button>
            )}
            {transitions.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.next} onClick={() => handleStatusChange(t.next)} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${t.cls}`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
            {isDraft && (
              <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Invoice Area */}
          <div className="col-span-2 space-y-6">

            {/* Invoice Header Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 mb-4">Edit Invoice Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                      <input
                        value={editForm.customer_name || ''}
                        onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Email</label>
                      <input
                        type="email"
                        value={editForm.customer_email || ''}
                        onChange={e => setEditForm(f => ({ ...f, customer_email: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editForm.due_date || ''}
                        onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Terms</label>
                      <select
                        value={editForm.payment_terms || 'Net 30'}
                        onChange={e => setEditForm(f => ({ ...f, payment_terms: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black bg-white"
                      >
                        {['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editForm.tax_rate || ''}
                        onChange={e => setEditForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                      <textarea
                        rows={2}
                        value={editForm.notes || ''}
                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSaveEdits} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                    </button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-gray-200 rounded-lg hover:bg-gray-50">
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-1"><User size={12} /> Bill To</p>
                    <p className="font-bold text-gray-900">{invoice.customer_name || '—'}</p>
                    <p className="text-sm text-gray-600">{invoice.customer_email}</p>
                    {invoice.profiles?.company && <p className="text-sm text-gray-500">{invoice.profiles.company}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><Calendar size={12} /> Due Date</span>
                      <span className="text-sm font-medium text-gray-900">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><Clock size={12} /> Terms</span>
                      <span className="text-sm font-medium text-gray-900">{invoice.payment_terms || 'Net 30'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><Building2 size={12} /> Company</span>
                      <span className="text-sm font-medium text-gray-900">{invoice.brands?.name || '—'}</span>
                    </div>
                    {invoice.job_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><FileText size={12} /> Job</span>
                        <Link href={`/dashboard/jobs/${invoice.job_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                          #{invoice.job_id.substring(0, 8).toUpperCase()}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Line Items</h3>
                {canEdit && (
                  <button onClick={() => setShowLineForm(!showLineForm)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                    <Plus size={13} /> Add Item
                  </button>
                )}
              </div>

              {showLineForm && (
                <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-bold uppercase text-blue-800 block mb-1">Description</label>
                    <input
                      autoFocus
                      value={newLine.description}
                      onChange={e => setNewLine(l => ({ ...l, description: e.target.value }))}
                      placeholder="e.g. Business Cards 1000qty"
                      className="w-full text-sm rounded border border-blue-200 px-3 py-2 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] font-bold uppercase text-blue-800 block mb-1">Quantity</label>
                    <input
                      type="number"
                      value={newLine.quantity}
                      onChange={e => setNewLine(l => ({ ...l, quantity: e.target.value }))}
                      className="w-full text-sm rounded border border-blue-200 px-3 py-2 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-[10px] font-bold uppercase text-blue-800 block mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newLine.unit_price}
                      onChange={e => setNewLine(l => ({ ...l, unit_price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full text-sm rounded border border-blue-200 px-3 py-2 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddLineItem} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                    <button onClick={() => setShowLineForm(false)} className="px-3 py-2 text-sm font-bold border border-blue-200 text-blue-700 rounded hover:bg-blue-100">Cancel</button>
                  </div>
                </div>
              )}

              <table className="w-full text-sm">
                <thead className="text-xs font-bold uppercase text-gray-500 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-right w-20">Qty</th>
                    <th className="px-6 py-3 text-right w-28">Unit Price</th>
                    <th className="px-6 py-3 text-right w-28">Total</th>
                    {canEdit && <th className="px-6 py-3 w-12" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lineItems.map(item => (
                    <tr key={item.id} className="group hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-900">{item.description}</td>
                      <td className="px-6 py-3 text-right font-mono text-gray-600">{item.quantity}</td>
                      <td className="px-6 py-3 text-right font-mono text-gray-600">{fmt(item.unit_price)}</td>
                      <td className="px-6 py-3 text-right font-bold text-gray-900">{fmt(item.total)}</td>
                      {canEdit && (
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => handleDeleteLineItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                        No items yet. Add line items above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="max-w-xs ml-auto space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span><span className="font-mono">{fmt(invoice.subtotal)}</span>
                  </div>
                  {(invoice.tax_rate || 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax ({invoice.tax_rate}%)</span><span className="font-mono">{fmt(invoice.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
                    <span>Total</span><span className="font-mono">{fmt(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && !isEditing && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide text-gray-400">Notes</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Total Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center justify-center gap-1">
                <DollarSign size={12} /> Invoice Total
              </p>
              <p className="text-4xl font-black text-gray-900">{fmt(invoice.total)}</p>
              <p className={`mt-3 text-xs font-bold uppercase px-3 py-1 rounded-full inline-block border ${STATUS_STYLES[invoice.status]}`}>
                {invoice.status}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors"
                >
                  <Printer size={14} /> Print Invoice
                </button>
                {invoice.job_id && (
                  <Link
                    href={`/dashboard/jobs/${invoice.job_id}`}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors"
                  >
                    <FileText size={14} /> View Source Job
                  </Link>
                )}
                {invoice.customer_id && (
                  <Link
                    href={`/dashboard/customers/${invoice.customer_id}`}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors"
                  >
                    <User size={14} /> Customer Profile
                  </Link>
                )}
                {(invoice.status !== 'Cancelled' && invoice.status !== 'Paid') && (
                  <button
                    onClick={() => handleStatusChange('Cancelled')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Ban size={14} /> Cancel Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
