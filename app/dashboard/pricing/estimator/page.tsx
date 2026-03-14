'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Calculator, Save, Plus, ArrowLeft, Loader2, Settings, ClipboardList, ChevronDown } from 'lucide-react';
import { calculateEstimate, EstimateResult, FinishingOp, Markup, Press, ProductTemplate, Stock } from '@/lib/estimator';
import { deleteFinishing, deleteMarkup, deletePress, deleteStock, deleteTemplate, saveQuote, upsertFinishing, upsertMarkup, upsertPress, upsertStock, upsertTemplate } from '@/app/actions/estimator';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Role = 'admin' | 'staff' | 'customer' | string;

export default function EstimatorPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('customer');
  const [loading, setLoading] = useState(true);

  const [presses, setPresses] = useState<Press[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [finishingOps, setFinishingOps] = useState<FinishingOp[]>([]);
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPressId, setSelectedPressId] = useState<string>('');
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [selectedMarkupId, setSelectedMarkupId] = useState<string>('');
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);

  const [quantities, setQuantities] = useState<string>('500,1000');
  const [quoteTitle, setQuoteTitle] = useState('Quick Quote');
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const detectedRole = profile?.role || 'customer';
      setRole(detectedRole);

      await loadData();
      setLoading(false);
    })();
  }, []);

  const loadData = async () => {
    const [pressRes, stockRes, finishRes, markupRes, templateRes] = await Promise.all([
      supabase.from('presses').select('*').order('name'),
      supabase.from('stocks').select('*').order('name'),
      supabase.from('finishing_ops').select('*').order('name'),
      supabase.from('markups').select('*').order('name'),
      supabase.from('product_templates').select('*').order('name'),
    ]);

    const pressList = pressRes.data || [];
    const stockList = stockRes.data || [];
    const finishList = finishRes.data || [];
    const markupList = markupRes.data || [];
    const templateList = templateRes.data || [];

    setPresses(pressList as Press[]);
    setStocks(stockList as Stock[]);
    setFinishingOps(finishList as FinishingOp[]);
    setMarkups(markupList as Markup[]);
    setTemplates(templateList as ProductTemplate[]);

    if (!selectedTemplateId && templateList[0]?.id) setSelectedTemplateId(templateList[0].id);
    if (!selectedPressId && pressList[0]?.id) setSelectedPressId(pressList[0].id);
    if (!selectedStockId && stockList[0]?.id) setSelectedStockId(stockList[0].id);
    if (!selectedMarkupId && markupList[0]?.id) setSelectedMarkupId(markupList[0].id);
  };

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === selectedTemplateId) || templates[0], [templates, selectedTemplateId]);
  const selectedPress = useMemo(() => presses.find((p) => p.id === (selectedTemplate?.default_press_id || selectedPressId)) || presses.find((p) => p.id === selectedPressId) || presses[0], [presses, selectedPressId, selectedTemplate]);
  const selectedStock = useMemo(() => stocks.find((s) => s.id === (selectedTemplate?.default_stock_id || selectedStockId)) || stocks.find((s) => s.id === selectedStockId) || stocks[0], [stocks, selectedStockId, selectedTemplate]);
  const selectedMarkup = useMemo(() => markups.find((m) => m.id === (selectedTemplate?.default_markup_id || selectedMarkupId)) || markups.find((m) => m.id === selectedMarkupId) || null, [markups, selectedMarkupId, selectedTemplate]);
  const selectedFinishing = useMemo(() => {
    const ids = selectedTemplate?.finishing_op_ids?.length ? selectedTemplate.finishing_op_ids : selectedFinishingIds;
    return finishingOps.filter((f) => ids?.includes(f.id));
  }, [finishingOps, selectedFinishingIds, selectedTemplate]);

  const parsedQuantities = useMemo(() => {
    return quantities.split(',').map((q) => parseInt(q.trim(), 10)).filter((q) => !isNaN(q) && q > 0);
  }, [quantities]);

  const results: EstimateResult[] = useMemo(() => {
    if (!selectedTemplate || !selectedPress || !selectedStock) return [];
    return parsedQuantities.map((qty) => calculateEstimate({
      quantity: qty,
      template: selectedTemplate,
      press: selectedPress,
      stock: selectedStock,
      finishingOps: selectedFinishing,
      markup: selectedMarkup,
    }));
  }, [parsedQuantities, selectedTemplate, selectedPress, selectedStock, selectedFinishing, selectedMarkup]);

  const totalPrice = results.reduce((sum, r) => sum + r.totalPrice, 0);

  const handleToggleFinishing = (id: string) => {
    setSelectedFinishingIds((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  const handleSaveQuote = async () => {
    if (!results.length) return;
    setSaving(true);
    try {
      const quote = await saveQuote({
        title: quoteTitle || 'Quote',
        contact,
        templateId: selectedTemplate?.id,
        pressId: selectedPress?.id,
        stockId: selectedStock?.id,
        markupId: selectedMarkup?.id,
        quantities: parsedQuantities,
        results,
        finishingIds: selectedFinishing.map((f) => f.id),
      });
      alert('Quote saved');
      router.push('/dashboard/quotes');
      return quote;
    } catch (err: any) {
      alert(err?.message || 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-full border text-gray-500 hover:bg-gray-50"><ArrowLeft size={18} /></Link>
            <div>
              <div className="text-xs uppercase text-gray-400 font-bold">Estimator</div>
              <h1 className="text-xl font-bold text-gray-900">Quantity breaks, press selection, and saved quotes</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/quotes" className="px-3 py-2 text-sm border rounded-lg bg-white text-gray-700 hover:bg-gray-50">Quotes</Link>
            {role !== 'customer' && <Link href="/dashboard/pricing" className="px-3 py-2 text-sm border rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Settings size={16}/>Costs</Link>}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
              <Calculator size={16}/> Quote Builder
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500">Template</label>
              <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Press</label>
                <select value={selectedPress?.id} onChange={(e) => setSelectedPressId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  {presses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Stock</label>
                <select value={selectedStock?.id} onChange={(e) => setSelectedStockId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Markup</label>
                <select value={selectedMarkup?.id || ''} onChange={(e) => setSelectedMarkupId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">No markup</option>
                  {markups.map(m => <option key={m.id} value={m.id}>{m.name} ({m.percent}%)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Quantities (comma separated)</label>
                <input value={quantities} onChange={(e) => setQuantities(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Finishing</label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                {finishingOps.map(f => (
                  <label key={f.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(selectedTemplate?.finishing_op_ids || selectedFinishingIds).includes(f.id)} onChange={() => handleToggleFinishing(f.id)} />
                    <span className="flex-1">{f.name}</span>
                    <span className="text-xs text-gray-400">setup {f.setup_minutes ?? 0}m</span>
                  </label>
                ))}
                {finishingOps.length === 0 && <div className="text-xs text-gray-400">No finishing ops</div>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Quote Title</label>
              <input value={quoteTitle} onChange={(e) => setQuoteTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact / Company" className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>

            <button onClick={handleSaveQuote} disabled={!results.length || saving} className="w-full bg-black text-white rounded-lg py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save Quote
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-gray-400 font-bold">Estimate</div>
                  <h2 className="text-lg font-bold text-gray-900">Breakdown by quantity</h2>
                </div>
                <div className="text-sm font-bold text-gray-800">Total ${totalPrice.toFixed(2)}</div>
              </div>
              <div className="divide-y">
                {results.length === 0 && (
                  <div className="p-6 text-gray-500 text-sm">Add a quantity to see pricing.</div>
                )}
                {results.map((res) => (
                  <div key={res.quantity} className="p-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase text-gray-400 font-bold">Quantity</div>
                        <div className="text-xl font-bold text-gray-900">{res.quantity.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{res.sheets.toLocaleString()} sheets • {res.pressHours.toFixed(2)} hrs press</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase text-gray-400 font-bold">Price</div>
                        <div className="text-3xl font-black text-gray-900">${res.totalPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Cost ${res.totalCost.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg border text-sm divide-y">
                      {res.breakdown.map((b, i) => (
                        <div key={i} className="px-4 py-2 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-800">{b.label}</div>
                            {b.detail && <div className="text-xs text-gray-500">{b.detail}</div>}
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-gray-800">${b.price.toFixed(2)}</div>
                            <div className="text-[10px] text-gray-500">Cost ${b.cost.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {role !== 'customer' && (
              <AdminRates
                presses={presses}
                stocks={stocks}
                finishingOps={finishingOps}
                markups={markups}
                templates={templates}
                onRefresh={loadData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminRates({ presses, stocks, finishingOps, markups, templates, onRefresh }: {
  presses: Press[];
  stocks: Stock[];
  finishingOps: FinishingOp[];
  markups: Markup[];
  templates: ProductTemplate[];
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);

  const handleUpsert = async (table: string, values: any) => {
    try {
      if (table === 'presses') await upsertPress(values);
      if (table === 'stocks') await upsertStock(values);
      if (table === 'finishing_ops') await upsertFinishing(values);
      if (table === 'markups') await upsertMarkup(values);
      if (table === 'product_templates') await upsertTemplate(values);
      await onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Save failed');
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('Delete record?')) return;
    try {
      if (table === 'presses') await deletePress(id);
      if (table === 'stocks') await deleteStock(id);
      if (table === 'finishing_ops') await deleteFinishing(id);
      if (table === 'markups') await deleteMarkup(id);
      if (table === 'product_templates') await deleteTemplate(id);
      await onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <button onClick={() => setOpen((p) => !p)} className="w-full flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800"><ClipboardList size={16}/> Admin Rates</div>
        <ChevronDown className={`transition ${open ? 'rotate-180' : ''}`} size={16} />
      </button>
      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
          <SimpleTable title="Presses" columns={['name','type','impressions_per_hour']} rows={presses} onSave={(row) => handleUpsert('presses', row)} onDelete={(id) => handleDelete('presses', id)} />
          <SimpleTable title="Stocks" columns={['name','sheet_width','sheet_height','cost_per_sheet']} rows={stocks} onSave={(row) => handleUpsert('stocks', row)} onDelete={(id) => handleDelete('stocks', id)} />
          <SimpleTable title="Finishing" columns={['name','setup_minutes','run_minutes_per_thousand','cost_per_hour']} rows={finishingOps} onSave={(row) => handleUpsert('finishing_ops', row)} onDelete={(id) => handleDelete('finishing_ops', id)} />
          <SimpleTable title="Markups" columns={['name','percent']} rows={markups} onSave={(row) => handleUpsert('markups', row)} onDelete={(id) => handleDelete('markups', id)} />
          <SimpleTable title="Templates" columns={['name','finished_width','finished_height','default_press_id','default_stock_id','default_markup_id','setup_waste_sheets']} rows={templates} onSave={(row) => handleUpsert('product_templates', row)} onDelete={(id) => handleDelete('product_templates', id)} />
        </div>
      )}
    </div>
  );
}

function SimpleTable({ title, columns, rows, onSave, onDelete }: { title: string; columns: string[]; rows: any[]; onSave: (row: any) => void; onDelete: (id: string) => void; }) {
  const [editing, setEditing] = useState<any | null>(null);

  const handleEdit = (row?: any) => {
    setEditing(row || { id: undefined });
  };

  const handleChange = (key: string, value: any) => {
    setEditing((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    await onSave(editing);
    setEditing(null);
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div className="text-sm font-bold text-gray-800">{title}</div>
        <button onClick={() => handleEdit()} className="text-xs px-2 py-1 border rounded-lg flex items-center gap-1 hover:bg-white"><Plus size={12}/> New</button>
      </div>
      <div className="divide-y text-sm">
        {rows.map((row) => (
          <div key={row.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{row.name || row.id}</div>
              <div className="text-[11px] text-gray-500 truncate">{columns.map((c) => `${c}: ${row[c] ?? '--'}`).join(' • ')}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(row)} className="text-xs text-blue-600">Edit</button>
              <button onClick={() => onDelete(row.id)} className="text-xs text-red-600">Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-3 text-xs text-gray-500">No records.</div>}
      </div>

      {editing && (
        <div className="p-4 bg-white border-t border-gray-100 space-y-3">
          <div className="text-xs uppercase text-gray-500 font-bold">{editing.id ? 'Edit' : 'New'} {title.slice(0,-1)}</div>
          {columns.map((col) => (
            <div key={col} className="space-y-1">
              <label className="text-[11px] text-gray-500 font-semibold">{col}</label>
              <input value={editing[col] ?? ''} onChange={(e) => handleChange(col, e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-xs px-3 py-2 border rounded-lg">Cancel</button>
            <button onClick={handleSubmit} className="text-xs px-3 py-2 bg-black text-white rounded-lg">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
