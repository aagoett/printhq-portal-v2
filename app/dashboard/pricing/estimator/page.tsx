'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { AlertTriangle, Calculator, Save, Plus, ArrowLeft, Loader2, Settings, ClipboardList, ChevronDown, RefreshCw, GitCompareArrows, Wand2 } from 'lucide-react';
import { calculateEstimate, EstimateResult, evaluatePressRoutes, FinishingOp, Markup, Press, ProductTemplate, Stock } from '@/lib/estimator';
import type { QuantityRouteEvaluation } from '@/lib/estimator';
import { deleteFinishing, deleteMarkup, deletePress, deleteStock, deleteTemplate, fetchEstimatorData, saveQuote, upsertFinishing, upsertMarkup, upsertPress, upsertStock, upsertTemplate } from '@/app/actions/estimator';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Role = 'admin' | 'staff' | 'customer' | string;
type EstimatorHealth = Awaited<ReturnType<typeof fetchEstimatorData>>['health'];
type PressMode = 'auto' | 'manual';

export default function EstimatorPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('customer');
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const [presses, setPresses] = useState<Press[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [finishingOps, setFinishingOps] = useState<FinishingOp[]>([]);
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [health, setHealth] = useState<EstimatorHealth | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPressId, setSelectedPressId] = useState<string>('');
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [selectedMarkupId, setSelectedMarkupId] = useState<string>('');
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [pressMode, setPressMode] = useState<PressMode>('auto');

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
      setRole(profile?.role || 'customer');

      await loadData();
      setLoading(false);
    })();
  }, []);

  const applyLoadedData = (payload: Awaited<ReturnType<typeof fetchEstimatorData>>) => {
    const pressList = (payload.presses || []) as Press[];
    const stockList = (payload.stocks || []) as Stock[];
    const finishList = (payload.finishingOps || []) as FinishingOp[];
    const markupList = (payload.markups || []) as Markup[];
    const templateList = (payload.templates || []) as ProductTemplate[];

    setPresses(pressList);
    setStocks(stockList);
    setFinishingOps(finishList);
    setMarkups(markupList);
    setTemplates(templateList);
    setHealth(payload.health);

    setSelectedTemplateId((current) => current || templateList[0]?.id || '');
    setSelectedPressId((current) => current || pressList[0]?.id || '');
    setSelectedStockId((current) => current || stockList[0]?.id || '');
    setSelectedMarkupId((current) => current || markupList[0]?.id || '');
  };

  const loadData = async () => {
    const payload = await fetchEstimatorData();
    applyLoadedData(payload);
    return payload;
  };

  const reloadData = async () => {
    setReloading(true);
    try {
      await loadData();
    } finally {
      setReloading(false);
    }
  };

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === selectedTemplateId) || templates[0], [templates, selectedTemplateId]);
  const templateDefaultPress = useMemo(() => presses.find((p) => p.id === selectedTemplate?.default_press_id), [presses, selectedTemplate]);
  const selectedPress = useMemo(() => presses.find((p) => p.id === selectedPressId) || templateDefaultPress || presses[0], [presses, selectedPressId, templateDefaultPress]);
  const selectedStock = useMemo(() => stocks.find((s) => s.id === (selectedTemplate?.default_stock_id || selectedStockId)) || stocks.find((s) => s.id === selectedStockId) || stocks[0], [stocks, selectedStockId, selectedTemplate]);
  const selectedMarkup = useMemo(() => markups.find((m) => m.id === (selectedTemplate?.default_markup_id || selectedMarkupId)) || markups.find((m) => m.id === selectedMarkupId) || null, [markups, selectedMarkupId, selectedTemplate]);
  const selectedFinishing = useMemo(() => {
    const ids = selectedTemplate?.finishing_op_ids?.length ? selectedTemplate.finishing_op_ids : selectedFinishingIds;
    return finishingOps.filter((f) => ids?.includes(f.id));
  }, [finishingOps, selectedFinishingIds, selectedTemplate]);

  const parsedQuantities = useMemo(() => {
    return quantities.split(',').map((q) => parseInt(q.trim(), 10)).filter((q) => !isNaN(q) && q > 0);
  }, [quantities]);

  const routeSummary = useMemo(() => {
    if (!selectedTemplate || !selectedStock || presses.length === 0) return null;
    return evaluatePressRoutes({
      quantities: parsedQuantities,
      presses,
      template: selectedTemplate,
      stock: selectedStock,
      finishingOps: selectedFinishing,
      markup: selectedMarkup,
    });
  }, [parsedQuantities, presses, selectedTemplate, selectedStock, selectedFinishing, selectedMarkup]);

  const autoResults = useMemo(() => {
    return routeSummary?.evaluations
      .map((evaluation) => evaluation.recommended?.result)
      .filter((result): result is EstimateResult => Boolean(result)) || [];
  }, [routeSummary]);

  const manualResults = useMemo(() => {
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

  const results: EstimateResult[] = pressMode === 'manual' ? manualResults : autoResults;

  const effectiveQuotePress = useMemo(() => {
    if (pressMode === 'manual') return selectedPress || null;
    return routeSummary?.evaluations[0]?.recommended?.press || null;
  }, [pressMode, routeSummary, selectedPress]);

  const firstQuantityEvaluation = routeSummary?.evaluations[0] || null;
  const ineligibleCount = routeSummary?.evaluations[0]?.ineligiblePresses.length || 0;

  const totals = useMemo(() => {
    return results.reduce((acc, result) => {
      acc.cost += result.totalCost;
      acc.price += result.totalPrice;
      acc.grossProfit += result.grossProfit;
      return acc;
    }, { cost: 0, price: 0, grossProfit: 0 });
  }, [results]);
  const totalMarginPercent = totals.price > 0 ? (totals.grossProfit / totals.price) * 100 : 0;

  const hardLoadFailure = Boolean(health && health.loadErrors.length > 0);
  const readyToEstimate = Boolean(selectedTemplate && selectedStock && !hardLoadFailure && (pressMode === 'auto' ? routeSummary : selectedPress));

  const handleToggleFinishing = (id: string) => {
    setSelectedFinishingIds((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  const handleSaveQuote = async () => {
    if (!results.length || !effectiveQuotePress || !selectedStock) return;
    setSaving(true);
    try {
      await saveQuote({
        title: quoteTitle || 'Quote',
        contact,
        templateId: selectedTemplate?.id,
        pressId: effectiveQuotePress.id,
        stockId: selectedStock.id,
        markupId: selectedMarkup?.id,
        quantities: parsedQuantities,
        results,
        finishingIds: selectedFinishing.map((f) => f.id),
      });
      alert('Quote saved');
      router.push('/dashboard/quotes');
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
        <EstimatorDiagnostics health={health} role={role} onRefresh={reloadData} reloading={reloading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
              <Calculator size={16}/> Quote Builder
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500">Template</label>
              <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" disabled={!templates.length}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {!templates.length && <p className="text-xs text-amber-700">No templates loaded yet.</p>}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Routing mode</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPressMode('auto')} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${pressMode === 'auto' ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
                    Auto / Best Route
                  </button>
                  <button type="button" onClick={() => setPressMode('manual')} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${pressMode === 'manual' ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
                    Manual Override
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {pressMode === 'auto'
                  ? 'Quote uses the lowest-cost eligible press per quantity break.'
                  : 'Quote stays on the manually selected press for all quantities.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Press</label>
                <select value={selectedPress?.id || ''} onChange={(e) => setSelectedPressId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" disabled={!presses.length || pressMode !== 'manual'}>
                  {presses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {pressMode === 'auto' && <p className="mt-1 text-[11px] text-gray-500">Manual press stays available as an override.</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Stock</label>
                <select value={selectedStock?.id || ''} onChange={(e) => setSelectedStockId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" disabled={!stocks.length}>
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Markup</label>
                <select value={selectedMarkup?.id || ''} onChange={(e) => setSelectedMarkupId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" disabled={!markups.length}>
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

            <button onClick={handleSaveQuote} disabled={!results.length || saving || !readyToEstimate || !effectiveQuotePress} className="w-full bg-black text-white rounded-lg py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save Quote
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard label="Combined Cost" value={`$${totals.cost.toFixed(2)}`} tone="slate" />
              <MetricCard label="Combined Price" value={`$${totals.price.toFixed(2)}`} tone="green" />
              <MetricCard label="Gross Profit" value={`$${totals.grossProfit.toFixed(2)}`} tone={totals.grossProfit >= 0 ? 'emerald' : 'rose'} />
              <MetricCard label="Gross Margin" value={`${totalMarginPercent.toFixed(1)}%`} tone={totalMarginPercent >= 0 ? 'blue' : 'rose'} />
            </div>

            {readyToEstimate && routeSummary && (
              <>
                <RecommendedRouteCard
                  pressMode={pressMode}
                  effectiveQuotePress={effectiveQuotePress}
                  routeSummary={routeSummary}
                  firstQuantityEvaluation={firstQuantityEvaluation}
                  ineligibleCount={ineligibleCount}
                />
                <CrossoverSummaryCard routeSummary={routeSummary} />
                <AlternatesCard evaluation={firstQuantityEvaluation} />
              </>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-gray-400 font-bold">Estimate</div>
                  <h2 className="text-lg font-bold text-gray-900">Breakdown by quantity</h2>
                </div>
                <div className="text-sm font-bold text-gray-800">Total ${totals.price.toFixed(2)}</div>
              </div>
              <div className="divide-y">
                {!readyToEstimate && (
                  <div className="p-6 text-sm text-amber-700 bg-amber-50">Estimator inputs are unavailable. Resolve the diagnostics above before calculating or saving quotes.</div>
                )}
                {readyToEstimate && results.length === 0 && (
                  <div className="p-6 text-gray-500 text-sm">Add a quantity to see pricing.</div>
                )}
                {readyToEstimate && results.map((res, index) => {
                  const evaluation = routeSummary?.evaluations.find((item) => item.quantity === res.quantity) || null;
                  const autoRoute = evaluation?.recommended || null;
                  const isManualOverride = pressMode === 'manual' && selectedPress && autoRoute && selectedPress.id !== autoRoute.press.id;

                  return (
                    <div key={res.quantity} className="p-6 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4">
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

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${pressMode === 'auto' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {pressMode === 'auto' ? <Wand2 size={12} /> : <GitCompareArrows size={12} />}
                          {pressMode === 'auto' ? `Best route: ${evaluation?.recommended?.press.name || 'N/A'}` : `Manual route: ${selectedPress?.name || 'N/A'}`}
                        </span>
                        {autoRoute && pressMode === 'manual' && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                            Auto winner: {autoRoute.press.name}
                          </span>
                        )}
                        {isManualOverride && autoRoute && (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                            Override delta +${(res.totalCost - autoRoute.result.totalCost).toFixed(2)} cost
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <MetricChip label="Cost" value={`$${res.totalCost.toFixed(2)}`} />
                        <MetricChip label="Gross Profit" value={`$${res.grossProfit.toFixed(2)}`} positive={res.grossProfit >= 0} />
                        <MetricChip label="Gross Margin" value={`${res.grossMarginPercent.toFixed(1)}%`} positive={res.grossMarginPercent >= 0} />
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

                      {pressMode === 'auto' && evaluation && evaluation.alternates.length > 0 && index === 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="text-xs font-bold uppercase text-gray-500">Alternate routes for {evaluation.quantity.toLocaleString()}</div>
                          <div className="mt-3 space-y-2">
                            {evaluation.alternates.slice(0, 3).map((route) => (
                              <div key={route.press.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <div className="font-semibold text-gray-900">#{route.rank} {route.press.name}</div>
                                  <div className="text-xs text-gray-500">{route.result.pressHours.toFixed(2)} hrs • {route.result.sheets.toLocaleString()} sheets</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">${route.result.totalPrice.toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">Cost ${route.result.totalCost.toFixed(2)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                blocked={hardLoadFailure}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendedRouteCard({
  pressMode,
  effectiveQuotePress,
  routeSummary,
  firstQuantityEvaluation,
  ineligibleCount,
}: {
  pressMode: PressMode;
  effectiveQuotePress: Press | null;
  routeSummary: ReturnType<typeof evaluatePressRoutes>;
  firstQuantityEvaluation: QuantityRouteEvaluation | null;
  ineligibleCount: number;
}) {
  const recommendedCount = routeSummary.evaluations.filter((evaluation) => evaluation.recommended).length;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold text-emerald-700">Recommended route</div>
          <h2 className="mt-1 text-lg font-bold text-emerald-950">
            {pressMode === 'manual' ? `Manual override on ${effectiveQuotePress?.name || 'selected press'}` : effectiveQuotePress?.name || 'No eligible route'}
          </h2>
          <p className="mt-2 text-sm text-emerald-900">
            {pressMode === 'manual'
              ? 'Manual mode keeps the quote on your selected press, while auto recommendations stay visible for comparison.'
              : `${recommendedCount} quantity break${recommendedCount === 1 ? '' : 's'} routed automatically to the lowest-cost eligible press.`}
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
          <div className="text-[11px] font-bold uppercase text-gray-500">First quantity</div>
          <div className="text-lg font-black text-gray-900">{firstQuantityEvaluation?.quantity.toLocaleString() || '—'}</div>
          <div className="text-xs text-gray-500">{firstQuantityEvaluation?.recommended?.press.name || effectiveQuotePress?.name || 'No route'}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {routeSummary.evaluations.slice(0, 3).map((evaluation) => (
          <div key={evaluation.quantity} className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
            <div className="text-[11px] uppercase font-bold text-gray-500">Qty {evaluation.quantity.toLocaleString()}</div>
            <div className="mt-1 font-semibold text-gray-900">{evaluation.recommended?.press.name || 'No eligible press'}</div>
            {evaluation.recommended && (
              <div className="text-xs text-gray-500">Cost ${evaluation.recommended.result.totalCost.toFixed(2)} • Price ${evaluation.recommended.result.totalPrice.toFixed(2)}</div>
            )}
          </div>
        ))}
      </div>
      {ineligibleCount > 0 && (
        <div className="mt-4 text-xs text-emerald-800">Excluded {ineligibleCount} ineligible press{ineligibleCount === 1 ? '' : 'es'} based on current size-fit rules.</div>
      )}
    </div>
  );
}

function CrossoverSummaryCard({ routeSummary }: { routeSummary: ReturnType<typeof evaluatePressRoutes> }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <div className="text-xs uppercase font-bold text-blue-700">Crossover summary</div>
      <div className="mt-1 text-lg font-bold text-blue-950">{routeSummary.crossoverNote}</div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        {routeSummary.evaluations.map((evaluation) => (
          <div key={evaluation.quantity} className="rounded-xl border border-blue-100 bg-white px-4 py-3">
            <div className="font-semibold text-gray-900">{evaluation.quantity.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Winner: {evaluation.recommended?.press.name || 'No eligible press'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlternatesCard({ evaluation }: { evaluation: QuantityRouteEvaluation | null }) {
  if (!evaluation) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold text-gray-500">Route comparison</div>
          <h2 className="mt-1 text-lg font-bold text-gray-900">Top routes for {evaluation.quantity.toLocaleString()}</h2>
        </div>
        <div className="text-xs text-gray-500">Ranked by lowest total cost</div>
      </div>
      <div className="mt-4 space-y-3">
        {evaluation.routes.slice(0, 4).map((route) => (
          <div key={route.press.id} className={`rounded-xl border px-4 py-3 ${route.rank === 1 ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900">#{route.rank} {route.press.name}</div>
                <div className="text-xs text-gray-500">{route.result.sheets.toLocaleString()} sheets • {route.result.pressHours.toFixed(2)} hrs • {route.press.type}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">${route.result.totalPrice.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Cost ${route.result.totalCost.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {evaluation.ineligiblePresses.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs uppercase font-bold text-amber-700">Excluded presses</div>
          <div className="mt-2 space-y-1 text-sm text-amber-900">
            {evaluation.ineligiblePresses.slice(0, 3).map(({ press, reason }) => (
              <div key={press.id}><span className="font-semibold">{press.name}:</span> {reason}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EstimatorDiagnostics({ health, role, onRefresh, reloading }: {
  health: EstimatorHealth | null;
  role: Role;
  onRefresh: () => Promise<void>;
  reloading: boolean;
}) {
  if (!health) return null;

  const showBootstrapHint = role !== 'customer' && (health.missingTables.length > 0 || health.emptyTables.length > 0);

  return (
    <div className="space-y-3">
      {health.loadErrors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5" size={18} />
              <div>
                <div className="font-bold">Estimator pricing tables failed to load</div>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-red-800">
                  {health.loadErrors.map((error) => <li key={error.table}>{error.message}</li>)}
                </ul>
                {showBootstrapHint && (
                  <p className="mt-3 text-red-800">Bootstrap path: run <span className="font-mono">{health.bootstrapSqlPath}</span> in Supabase SQL editor, then refresh.</p>
                )}
              </div>
            </div>
            <button onClick={onRefresh} disabled={reloading} className="shrink-0 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-800 font-semibold flex items-center gap-2 disabled:opacity-60">
              {reloading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Refresh
            </button>
          </div>
        </div>
      )}

      {(health.emptyTables.length > 0 && health.loadErrors.length === 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-bold">Estimator tables are reachable but incomplete</div>
          <p className="mt-1">Empty tables: {health.emptyTables.join(', ')}.</p>
          {showBootstrapHint && <p className="mt-2">Seed baseline data with <span className="font-mono">{health.bootstrapSqlPath}</span> if this environment has not been initialized yet.</p>}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="text-xs font-bold uppercase text-gray-500 mb-3">Estimator health</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          {health.checks.map((check) => (
            <div key={check.table} className={`rounded-xl border px-3 py-2 ${check.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="font-semibold text-gray-900">{check.table}</div>
              <div className="text-xs text-gray-600 mt-1">{check.ok ? `${check.count} row(s)` : check.code || 'error'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminRates({ presses, stocks, finishingOps, markups, templates, onRefresh, blocked }: {
  presses: Press[];
  stocks: Stock[];
  finishingOps: FinishingOp[];
  markups: Markup[];
  templates: ProductTemplate[];
  onRefresh: () => Promise<any>;
  blocked: boolean;
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
        <div className="p-6 space-y-4">
          {blocked && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Estimator admin writes are blocked until the missing pricing tables are restored.</div>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SimpleTable title="Presses" columns={['name','type','impressions_per_hour']} rows={presses} onSave={(row) => handleUpsert('presses', row)} onDelete={(id) => handleDelete('presses', id)} disabled={blocked} />
            <SimpleTable title="Stocks" columns={['name','sheet_width','sheet_height','cost_per_sheet']} rows={stocks} onSave={(row) => handleUpsert('stocks', row)} onDelete={(id) => handleDelete('stocks', id)} disabled={blocked} />
            <SimpleTable title="Finishing" columns={['name','setup_minutes','run_minutes_per_thousand','cost_per_hour']} rows={finishingOps} onSave={(row) => handleUpsert('finishing_ops', row)} onDelete={(id) => handleDelete('finishing_ops', id)} disabled={blocked} />
            <SimpleTable title="Markups" columns={['name','percent']} rows={markups} onSave={(row) => handleUpsert('markups', row)} onDelete={(id) => handleDelete('markups', id)} disabled={blocked} />
            <SimpleTable title="Templates" columns={['name','finished_width','finished_height','default_press_id','default_stock_id','default_markup_id','setup_waste_sheets']} rows={templates} onSave={(row) => handleUpsert('product_templates', row)} onDelete={(id) => handleDelete('product_templates', id)} disabled={blocked} />
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleTable({ title, columns, rows, onSave, onDelete, disabled }: { title: string; columns: string[]; rows: any[]; onSave: (row: any) => Promise<void>; onDelete: (id: string) => Promise<void>; disabled?: boolean; }) {
  const [editing, setEditing] = useState<any | null>(null);

  const handleEdit = (row?: any) => {
    if (disabled) return;
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
        <button onClick={() => handleEdit()} disabled={disabled} className="text-xs px-2 py-1 border rounded-lg flex items-center gap-1 hover:bg-white disabled:opacity-50"><Plus size={12}/> New</button>
      </div>
      <div className="divide-y text-sm">
        {rows.map((row) => (
          <div key={row.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-800 truncate">{row.name || row.id}</div>
              <div className="text-[11px] text-gray-500 break-words">{columns.map((c) => `${c}: ${row[c] ?? '--'}`).join(' • ')}</div>
            </div>
            <div className="shrink-0 flex items-center gap-3 whitespace-nowrap">
              <button onClick={() => handleEdit(row)} disabled={disabled} className="text-xs font-semibold text-blue-600 disabled:opacity-50">Edit</button>
              <button onClick={() => onDelete(row.id)} disabled={disabled} className="text-xs font-semibold text-red-600 disabled:opacity-50">Delete</button>
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

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'green' | 'emerald' | 'blue' | 'rose' }) {
  const tones = {
    slate: 'border-gray-200 bg-white text-gray-900',
    green: 'border-green-200 bg-green-50 text-green-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    blue: 'border-blue-200 bg-blue-50 text-blue-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
  };

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${tones[tone]}`}>
      <div className="text-xs uppercase font-bold opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function MetricChip({ label, value, positive = true }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${positive ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-rose-200 bg-rose-50 text-rose-950'}`}>
      <div className="text-[11px] uppercase font-bold opacity-70">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}
