'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { ArrowLeft, Layers, Save, RefreshCcw, Trash2, Edit2, FileSpreadsheet, Ruler, Weight, Tag, Building2, Search, Filter } from 'lucide-react';
import { PRICING_PROFILES } from '@/lib/estimator';
import { formatCurrency } from '@/utils/pricing';
import { coerceDecimal, parseDecimalInput } from '@/utils/number';

const emptyForm = {
  id: null as string | null,
  name: '',
  brand: '',
  sku: '',
  parentWidth: '',
  parentHeight: '',
  cost: '',
  price: '',
  costUnit: 'per_sheet',
  priceUnit: 'per_sheet',
  weight: '',
  caliper: '',
};

type PaperRow = {
  id: string;
  name: string;
  brand?: string | null;
  sku?: string | null;
  parent_sheet_width?: number | null;
  parent_sheet_height?: number | null;
  cost_amount?: number | null;
  price_amount?: number | null;
  price_override?: number | null;
  cost_unit?: string | null;
  price_unit?: string | null;
  weight?: number | null;
  caliper?: number | null;
  notes?: string | null;
};

export default function PaperCatalogPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [papers, setPapers] = useState<PaperRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [basisFilter, setBasisFilter] = useState<'all' | 'per_sheet' | 'per_1000'>('all');

  const fetchPapers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('paper_catalog')
      .select('*')
      .order('brand', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error('load papers', error.message);
    }
    const normalized = (data || []).map((row) => ({
      ...row,
      parent_sheet_width: coerceDecimal(row.parent_sheet_width),
      parent_sheet_height: coerceDecimal(row.parent_sheet_height),
      weight: coerceDecimal(row.weight),
      caliper: coerceDecimal(row.caliper),
      cost_amount: coerceDecimal(row.cost_amount) ?? 0,
      price_amount: coerceDecimal(row.price_amount),
      price_override: coerceDecimal(row.price_override),
    })) as PaperRow[];
    setPapers(normalized);
    setLoading(false);
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const resetForm = () => setForm(emptyForm);

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Stock name required');
    if (!form.parentWidth || !form.parentHeight) return alert('Parent sheet size required');

    setSaving(true);

    let parentWidth: number;
    let parentHeight: number;
    let costValue: number;
    let priceOverride: number | null;
    let weightValue: number | null;
    let caliperValue: number | null;

    try {
      parentWidth = parseDecimalInput(form.parentWidth, { fieldName: 'Parent width' }) ?? 0;
      parentHeight = parseDecimalInput(form.parentHeight, { fieldName: 'Parent height' }) ?? 0;
      costValue = parseDecimalInput(form.cost, { defaultValue: 0, fieldName: 'Internal cost' }) ?? 0;
      priceOverride = parseDecimalInput(form.price, { allowNull: true, fieldName: 'Sell override' });
      weightValue = parseDecimalInput(form.weight, { allowNull: true, fieldName: 'Weight' });
      caliperValue = parseDecimalInput(form.caliper, { allowNull: true, fieldName: 'Caliper' });
    } catch (err: any) {
      setSaving(false);
      alert(err?.message || 'Please enter valid numeric values.');
      return;
    }

    const payload: any = {
      name: form.name.trim(),
      brand: form.brand?.trim() || null,
      sku: form.sku?.trim() || null,
      parent_sheet_width: parentWidth,
      parent_sheet_height: parentHeight,
      cost_amount: costValue,
      price_override: priceOverride,
      cost_unit: form.costUnit,
      price_unit: form.priceUnit || form.costUnit,
      weight: weightValue,
      caliper: caliperValue,
    };

    const query = form.id
      ? supabase.from('paper_catalog').update(payload).eq('id', form.id)
      : supabase.from('paper_catalog').insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
    fetchPapers();
  };

  const handleEdit = (row: PaperRow) => {
    setForm({
      id: row.id,
      name: row.name || '',
      brand: row.brand || '',
      sku: row.sku || '',
      parentWidth: row.parent_sheet_width?.toString() || '',
      parentHeight: row.parent_sheet_height?.toString() || '',
      cost: row.cost_amount?.toString() || '',
      price: (row.price_override ?? row.price_amount)?.toString() || '',
      costUnit: row.cost_unit || 'per_sheet',
      priceUnit: row.price_unit || row.cost_unit || 'per_sheet',
      weight: row.weight?.toString() || '',
      caliper: row.caliper?.toString() || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this paper stock?')) return;
    const { error } = await supabase.from('paper_catalog').delete().eq('id', id);
    if (error) alert(error.message);
    fetchPapers();
  };

  const perSheet = (row: PaperRow, value: number | null | undefined, unitField: 'cost_unit' | 'price_unit') => {
    const unit = (row as any)[unitField] || row.cost_unit;
    const val = Number(value || 0);
    return unit === 'per_1000' ? val / 1000 : val;
  };

  const sortedPapers = useMemo(() => papers.filter((paper) => {
    const hay = [paper.name, paper.brand, paper.sku, paper.weight, paper.caliper].filter(Boolean).join(' ').toLowerCase();
    const searchOk = !search.trim() || hay.includes(search.trim().toLowerCase());
    const basisOk = basisFilter === 'all' || (paper.price_unit || paper.cost_unit || 'per_sheet') === basisFilter;
    return searchOk && basisOk;
  }), [papers, search, basisFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Layers size={18}/> Paper Catalog</h1>
            <p className="text-sm text-gray-500">Administer stocked sheets with cost/price, size, weight, brand & SKU.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/pricing" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={16}/> Cost Engine</Link>
          <Link href="/dashboard/pricing/estimator" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold">Estimator</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold text-gray-400">{form.id ? 'Edit Stock' : 'Add Stock'}</p>
              <h3 className="text-lg font-bold text-gray-900">{form.name || 'New Stock'}</h3>
            </div>
            <button onClick={resetForm} className="text-xs flex items-center gap-1 text-gray-500 hover:text-black"><RefreshCcw size={14}/> Reset</button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Tag size={12}/> Stock Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 100# Gloss Text" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Building2 size={12}/> Brand</span>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Lynx / Cougar" />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600">SKU</span>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="INT-100G-2418" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Weight size={12}/> Weight (lb)</span>
                <input value={form.weight} inputMode="decimal" step="0.001" onChange={(e) => setForm({ ...form, weight: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="100" />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Ruler size={12}/> Caliper (pt/mil)</span>
                <input value={form.caliper} inputMode="decimal" step="0.001" onChange={(e) => setForm({ ...form, caliper: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="10" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600">Parent Width (in)</span>
                <input type="number" inputMode="decimal" step="0.001" value={form.parentWidth} onChange={(e) => setForm({ ...form, parentWidth: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600">Parent Height (in)</span>
                <input type="number" inputMode="decimal" step="0.001" value={form.parentHeight} onChange={(e) => setForm({ ...form, parentHeight: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600">Cost Basis</span>
                <select value={form.costUnit} onChange={(e) => setForm({ ...form, costUnit: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="per_sheet">Per sheet</option>
                  <option value="per_1000">Per 1,000</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600">Price Basis</span>
                <select value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="per_sheet">Per sheet</option>
                  <option value="per_1000">Per 1,000</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600">Internal Cost</span>
                <input type="number" inputMode="decimal" step="0.001" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm bg-red-50 border-red-100" placeholder="0.045" />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold text-gray-600">Sell override (optional)</span>
                <input type="number" inputMode="decimal" step="0.001" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm bg-green-50 border-green-100" placeholder="0.09" />
              </label>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full bg-black text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-60">
              <Save size={18}/> {form.id ? 'Update Stock' : 'Add Stock'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Paper Catalog</p>
                <p className="text-sm text-gray-500">{sortedPapers.length} of {papers.length} stocks • normalized for estimator use</p>
              </div>
              <button onClick={fetchPapers} className="text-xs flex items-center gap-1 text-gray-500 hover:text-black"><RefreshCcw size={14}/> Refresh</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="md:col-span-2 flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
                <Search size={14} className="text-gray-400"/>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stock, brand, SKU, weight" className="w-full text-sm outline-none" />
              </label>
              <label className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
                <Filter size={14} className="text-gray-400"/>
                <select value={basisFilter} onChange={(e) => setBasisFilter(e.target.value as any)} className="w-full text-sm bg-transparent outline-none">
                  <option value="all">All basis types</option>
                  <option value="per_sheet">Per sheet only</option>
                  <option value="per_1000">Per 1,000 only</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Stock</th>
                  <th className="px-4 py-3 text-left">Size</th>
                  <th className="px-4 py-3 text-left">Weight / Caliper</th>
                  <th className="px-4 py-3 text-left">Cost</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPapers.map((paper) => (
                  <tr key={paper.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{paper.name}</div>
                      <div className="text-[11px] text-gray-500 flex gap-2 flex-wrap">
                        {paper.brand && <span className="px-2 py-0.5 bg-gray-100 rounded">{paper.brand}</span>}
                        {paper.sku && <span className="px-2 py-0.5 bg-gray-100 rounded font-mono">SKU: {paper.sku}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{paper.parent_sheet_width} x {paper.parent_sheet_height}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {paper.weight ? `${paper.weight}#` : '—'}
                      {paper.caliper ? <span className="ml-2 text-gray-500">{paper.caliper} cal</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      <span className="font-mono font-bold">${perSheet(paper, paper.cost_amount, 'cost_unit').toFixed(4)}</span> /sht
                      <span className="text-gray-400 ml-1">({paper.cost_unit || 'per_sheet'})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {(() => {
                        const baseCostPerSheet = perSheet(paper, paper.cost_amount, 'cost_unit');
                        const overrideValue = paper.price_override ?? paper.price_amount;
                        const baseSell = overrideValue != null ? perSheet(paper, overrideValue, 'price_unit') : baseCostPerSheet;
                        const isOverride = overrideValue != null;
                        return (
                          <>
                            <div>
                              <span className="font-mono font-bold">${baseSell.toFixed(4)}</span> /sht
                              <span className="text-gray-400 ml-1">{isOverride ? 'override' : '(profile-based)'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-gray-600">
                              {Object.entries(PRICING_PROFILES).map(([k, v]) => {
                                const price = isOverride ? baseSell : baseCostPerSheet * v;
                                return (
                                  <span key={k} className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded">
                                    {k.substring(0,3)} {formatCurrency(price)}/sht
                                  </span>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(paper)} className="text-gray-400 hover:text-black"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(paper.id)} className="text-gray-300 hover:text-red-600"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
                {sortedPapers.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-10">No paper stocks yet.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-10">Loading…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
