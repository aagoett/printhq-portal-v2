'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { ArrowLeft, Package2, Truck, Save, RefreshCcw, Trash2, DollarSign, LayoutGrid, Calculator, ClipboardList } from 'lucide-react';
import { PRICING_PROFILES } from '@/lib/estimator';
import { formatCurrency } from '@/utils/pricing';

const defaultForm = {
  id: null as string | null,
  name: '',
  type: 'finishing',
  cost: '',
  price: '',
  costUnit: 'per_sheet',
  priceUnit: 'per_sheet',
  notes: '',
};

const UNIT_OPTIONS = [
  { value: 'per_sheet', label: 'Per sheet' },
  { value: 'per_1000', label: 'Per 1,000' },
  { value: 'per_item', label: 'Per piece' },
  { value: 'per_piece', label: 'Per piece (alias)' },
  { value: 'per_job', label: 'Per job (flat)' },
  { value: 'per_hour', label: 'Per hour' },
];

type Row = {
  id: string;
  name: string;
  type: string;
  cost_amount?: number | null;
  price_amount?: number | null;
  cost_unit?: string | null;
  price_unit?: string | null;
  notes?: string | null;
};

export default function FinishingCatalogPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'finishing' | 'mailing' | 'all'>('all');

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pricing_components')
      .select('*')
      .in('type', ['finishing', 'mailing'])
      .order('type')
      .order('name');
    if (error) console.error('finishing load', error.message);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Name required');
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      type: form.type,
      cost_amount: parseFloat(form.cost || '0') || 0,
      price_amount: parseFloat(form.price || form.cost || '0') || 0,
      cost_unit: form.costUnit,
      price_unit: form.priceUnit || form.costUnit,
      notes: form.notes?.trim() || null,
    };

    const query = form.id
      ? supabase.from('pricing_components').update(payload).eq('id', form.id)
      : supabase.from('pricing_components').insert(payload);

    const { error } = await query;
    setSaving(false);
    if (error) return alert(error.message);
    setForm(defaultForm);
    fetchRows();
  };

  const handleEdit = (row: Row) => {
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      cost: row.cost_amount?.toString() || '',
      price: row.price_amount?.toString() || '',
      costUnit: row.cost_unit || 'per_sheet',
      priceUnit: row.price_unit || row.cost_unit || 'per_sheet',
      notes: row.notes || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this component?')) return;
    const { error } = await supabase.from('pricing_components').delete().eq('id', id);
    if (error) alert(error.message);
    fetchRows();
  };

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return rows;
    return rows.filter((r) => r.type === activeFilter);
  }, [rows, activeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Package2 size={18}/> Finishing & Mailing Catalog</h1>
            <p className="text-sm text-gray-500">Configure finishing steps and mailing components with cost + sell + units.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/pricing/paper-catalog" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> Paper</Link>
          <Link href="/dashboard/pricing/estimator" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><Calculator size={16}/> Estimator</Link>
          <Link href="/dashboard/pricing" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><DollarSign size={16}/> Costs</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold text-gray-400">{form.id ? 'Edit Component' : 'Add Component'}</p>
              <h3 className="text-lg font-bold text-gray-900">{form.name || 'New Component'}</h3>
            </div>
            <button onClick={() => setForm(defaultForm)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-black"><RefreshCcw size={14}/> Reset</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-gray-600">Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1 bg-white">
                <option value="finishing">Finishing</option>
                <option value="mailing">Mailing</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600">Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1" placeholder="e.g. UV Coat / Addressing" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-red-600">Internal Cost
              <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full border border-red-100 bg-red-50 rounded px-3 py-2 text-sm mt-1" placeholder="0.02" />
            </label>
            <label className="text-xs font-bold text-green-700">Client Price
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-green-100 bg-green-50 rounded px-3 py-2 text-sm mt-1" placeholder="0.05" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-gray-600">Cost Basis
              <select value={form.costUnit} onChange={(e) => setForm({ ...form, costUnit: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1 bg-white">
                {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600">Price Basis
              <select value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1 bg-white">
                {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
          </div>

          <label className="text-xs font-bold text-gray-600">Notes
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1" placeholder="When to apply, min qty, etc." />
          </label>

          <button onClick={handleSave} disabled={saving} className="w-full bg-black text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-60">
            <Save size={18}/> {form.id ? 'Update' : 'Add'} Component
          </button>

          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="font-bold mb-1">Pricing Profiles (preview)</p>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {Object.entries(PRICING_PROFILES).map(([k, v]) => (
                <div key={k} className="px-2 py-1 bg-white rounded border text-gray-700 flex justify-between">
                  <span className="capitalize">{k}</span>
                  <span className="font-mono">×{v.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Finishing & Mailing Catalog</p>
              <p className="text-sm text-gray-500">{rows.length} components • cost + price basis stored</p>
            </div>
            <div className="flex gap-2 items-center text-xs font-bold text-gray-500">
              <button onClick={() => setActiveFilter('all')} className={`px-3 py-1 rounded-full border ${activeFilter === 'all' ? 'bg-black text-white border-black' : 'bg-white'}`}>All</button>
              <button onClick={() => setActiveFilter('finishing')} className={`px-3 py-1 rounded-full border ${activeFilter === 'finishing' ? 'bg-black text-white border-black' : 'bg-white'}`}>Finishing</button>
              <button onClick={() => setActiveFilter('mailing')} className={`px-3 py-1 rounded-full border ${activeFilter === 'mailing' ? 'bg-black text-white border-black' : 'bg-white'}`}>Mailing</button>
              <button onClick={fetchRows} className="text-gray-500 hover:text-black flex items-center gap-1"><RefreshCcw size={14}/> Refresh</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Cost</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${row.type === 'mailing' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{row.type}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{row.cost_unit || 'per_sheet'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <div className="font-mono font-bold">{formatCurrency((row.cost_amount || 0))}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <div className="font-mono font-bold">{formatCurrency((row.price_amount || 0))}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{row.notes || '—'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(row)} className="text-gray-400 hover:text-black">Edit</button>
                      <button onClick={() => handleDelete(row.id)} className="text-gray-300 hover:text-red-600"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-10">No finishing/mailing components yet.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-10">Loading…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
