'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, DollarSign, LayoutGrid, ArrowLeft, Save, Loader2, Users, Tag, Mail, SlidersHorizontal, ChevronDown, ChevronUp, Bug, GitCompareArrows } from 'lucide-react';
import Link from 'next/link';
import { applyOverridesToList, CustomerPricingOverride, formatCurrency } from '@/utils/pricing';
import { PRODUCT_TEMPLATES, getDefaultSizeForTemplate, getTemplate, ProductTemplateKey } from '@/utils/productTemplates';
import { calculateProposals, EstimatorContext } from '@/lib/estimator';

type ProfileLite = {
  id: string;
  email: string;
  first_name?: string;
  company?: string;
  role?: string;
};

type PricingComponent = {
  id: string;
  name: string;
  type: string;
  price_amount: number;
  cost_amount: number;
  parent_sheet_width?: number;
  parent_sheet_height?: number;
  max_sheet_width?: number;
  cost_unit?: string;
  setup_minutes?: number;
  run_speed_per_hour?: number;
};

type ProductMeta = {
  key: ProductTemplateKey;
  label: string;
  sizeLabel: string;
  size: { width: number; height: number };
  pageCount?: number;
  coverStock?: string;
  insideStock?: string;
  customLabel?: string;
  templateKey?: string;
};

type QuoteRecord = {
  id: string;
};

export default function AutoEstimatorPage() {
  const router = useRouter();
  
  // --- INPUTS ---
  const [productKey, setProductKey] = useState<ProductTemplateKey>('flyer');
  const [productSizeLabel, setProductSizeLabel] = useState<string>(getDefaultSizeForTemplate('flyer')?.label || '');
  const [customProductName, setCustomProductName] = useState('');
  const [pageCount, setPageCount] = useState(8);

  const defaultSize = getDefaultSizeForTemplate('flyer');
  const [finishW, setFinishW] = useState(defaultSize?.width || 8.5);
  const [finishH, setFinishH] = useState(defaultSize?.height || 11);
  const [quantity, setQuantity] = useState(5000);
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [coverPaperId, setCoverPaperId] = useState('');
  const [insidePaperId, setInsidePaperId] = useState('');
  const [quoteTitle, setQuoteTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Customer context for overrides
  const [currentProfile, setCurrentProfile] = useState<ProfileLite | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [customers, setCustomers] = useState<ProfileLite[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerOverrides, setCustomerOverrides] = useState<CustomerPricingOverride[]>([]);

  // --- DATA ---
  const [papers, setPapers] = useState<PricingComponent[]>([]);
  const [presses, setPresses] = useState<PricingComponent[]>([]);
  const [finishing, setFinishing] = useState<PricingComponent[]>([]);
  const [mailing, setMailing] = useState<PricingComponent[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [winner, setWinner] = useState<any>(null);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [selectedMailingId, setSelectedMailingId] = useState<string | null>(null);
  const [showPaperAdvanced, setShowPaperAdvanced] = useState(false);
  const [showRouteDebug, setShowRouteDebug] = useState(true);
  const [showRouteComparison, setShowRouteComparison] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [lastSavedQuoteId, setLastSavedQuoteId] = useState<string | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const selectedTemplateDef = getTemplate(productKey);
  const selectedSizeOption = selectedTemplateDef.sizes.find((s) => s.label === productSizeLabel) || null;
  const showManualSize = productSizeLabel === 'Custom' || productKey === 'other';

  const asPerSheet = (value?: number, unit?: string, threshold = 1) => {
    const raw = Number(value || 0);
    if (unit === 'per_1000' || raw > threshold) return raw / 1000;
    return raw;
  };

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    // When switching product types, snap to the default size
    const defaultSizeForTemplate = getDefaultSizeForTemplate(productKey);
    if (defaultSizeForTemplate) {
      setProductSizeLabel(defaultSizeForTemplate.label);
      setFinishW(defaultSizeForTemplate.width);
      setFinishH(defaultSizeForTemplate.height);
    }
    setLastSavedQuoteId(null);
  }, [productKey]);

  useEffect(() => {
    if (finishW > 0 && finishH > 0 && quantity > 0) {
        calculateBestRoute();
    }
  }, [finishW, finishH, quantity, selectedPaperId, insidePaperId, selectedFinishingIds, selectedMailingId, customerOverrides, selectedTemplate, papers, presses, finishing, mailing, productKey, productSizeLabel, pageCount, coverPaperId, customProductName, showPaperAdvanced]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadOverrides(selectedCustomerId);
    } else {
      setCustomerOverrides([]);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (winner) {
      setEmailStatus(null);
    }
  }, [winner]);

  const paperOptions = useMemo(
    () => applyOverridesToList(papers, customerOverrides, { templateKey: selectedTemplate, componentType: 'paper' }),
    [papers, customerOverrides, selectedTemplate]
  );
  const finishingOptions = useMemo(
    () => applyOverridesToList(finishing, customerOverrides, { templateKey: selectedTemplate, componentType: 'finishing' }),
    [finishing, customerOverrides, selectedTemplate]
  );
  const mailingOptions = useMemo(
    () => applyOverridesToList(mailing, customerOverrides, { templateKey: selectedTemplate, componentType: 'mailing' }),
    [mailing, customerOverrides, selectedTemplate]
  );

  useEffect(() => {
    // ensure paper selectors have defaults
    if (paperOptions.length > 0) {
      if (!selectedPaperId) setSelectedPaperId(paperOptions[0].id);
      if (!insidePaperId) setInsidePaperId(paperOptions[0].id);
      if (!coverPaperId) setCoverPaperId(paperOptions[0].id);
    }
  }, [paperOptions, selectedPaperId, insidePaperId, coverPaperId]);

  const bootstrap = async () => {
    // Fetch auth + profile
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
      if (profileData) {
        const internal = profileData.role === 'admin' || profileData.role === 'staff';
        setCurrentProfile(profileData);
        setIsInternal(internal);
        setSelectedCustomerId(auth.user.id);

        if (internal) {
          const { data: people } = await supabase
            .from('profiles')
            .select('id, email, first_name, company, role')
            .order('email');
          if (people) setCustomers(people);
        } else {
          setCustomers([profileData]);
        }
      }
    }

    await fetchInventory();
    setLoadingBootstrap(false);
  };

  const fetchInventory = async () => {
    const { data: pData } = await supabase.from('pricing_components').select('*').eq('type', 'paper').order('name');
    const { data: mData } = await supabase.from('pricing_components').select('*').in('type', ['press_digital', 'press_offset']);
    const { data: fData } = await supabase.from('pricing_components').select('*').eq('type', 'finishing').order('name');
    const { data: mailData } = await supabase.from('pricing_components').select('*').eq('type', 'mailing').order('name');

    if (pData) {
        setPapers(pData as any);
        if (pData.length > 0 && !selectedPaperId) {
          setSelectedPaperId(pData[0].id);
          setCoverPaperId(pData[0].id);
          setInsidePaperId(pData[0].id);
        }
    }
    if (mData) setPresses(mData as any);
    if (fData) setFinishing(fData as any);
    if (mailData) setMailing(mailData as any);
  };

  const loadOverrides = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('customer_id', customerId);
      if (error) {
        console.error('customer_pricing error', error.message);
        setCustomerOverrides([]);
        return;
      }
      setCustomerOverrides(data || []);
    } catch (err) {
      console.error('customer_pricing unexpected error', err);
      setCustomerOverrides([]);
    }
  };

  const coverPaperName = paperOptions.find((p) => p.id === coverPaperId)?.name;
  const insidePaperName = paperOptions.find((p) => p.id === (productKey === 'booklet' ? insidePaperId : selectedPaperId))?.name;
  const selectedMailing = mailingOptions.find((m) => m.id === selectedMailingId);
  const activePaperId = productKey === 'booklet' ? (insidePaperId || selectedPaperId) : selectedPaperId;
  const activePaperName = paperOptions.find((p) => p.id === activePaperId)?.name;

  const productMeta: ProductMeta = useMemo(() => {
    return {
      key: productKey,
      label: selectedTemplateDef.name,
      sizeLabel: selectedSizeOption?.label || `${finishW} x ${finishH}`,
      size: { width: finishW, height: finishH },
      pageCount: productKey === 'booklet' ? pageCount : undefined,
      coverStock: productKey === 'booklet' ? coverPaperName : undefined,
      insideStock: productKey === 'booklet' ? insidePaperName : undefined,
      customLabel: customProductName?.trim() || undefined,
      templateKey: selectedTemplate || undefined,
    };
  }, [productKey, selectedTemplateDef.name, selectedSizeOption?.label, finishW, finishH, pageCount, coverPaperName, insidePaperName, customProductName, selectedTemplate]);

  const calculateBestRoute = () => {
      const context: EstimatorContext = {
        papers,
        presses,
        finishing,
        mailing,
        overrides: customerOverrides,
      };

      const proposals = calculateProposals(
        {
          finishW,
          finishH,
          qtyList: [quantity],
          selectedPaperIds: showPaperAdvanced && activePaperId ? [activePaperId] : undefined,
          selectedFinishingIds,
          selectedMailingId,
          templateKey: selectedTemplate,
        },
        context
      );

      const mappedRoutes = proposals.flatMap((p) =>
        p.routes.map((r) => ({
          ...r,
          quantity: p.quantity,
          product: productMeta,
        }))
      );

      mappedRoutes.sort((a, b) => a.totalPrice - b.totalPrice);

      const primary = proposals[0];
      const best = primary?.winner
        ? { ...primary.winner, quantity: primary.quantity, product: productMeta }
        : null;

      setRouteOptions(mappedRoutes);
      setEstimates(mappedRoutes);

      if (best) {
        setWinner(best);
        if (!showPaperAdvanced && best.paperId) {
          setSelectedPaperId(best.paperId);
        }
      } else {
        setWinner(null);
      }
      setLastSavedQuoteId(null);
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const quoteRecipient = selectedCustomer?.email || currentProfile?.email;
  const winningPrice = winner?.totalPrice || 0;

  const buildQuotePayload = () => {
    if (!winner) throw new Error('No estimate ready to save.');
    const fallbackTitle = productMeta.customLabel || productMeta.label;
    const title = quoteTitle || `${fallbackTitle} ${productMeta.sizeLabel}`;

    const combinedPaperStock = productKey === 'booklet'
      ? `Cover: ${coverPaperName || insidePaperName || winner.paperName} / Inside: ${insidePaperName || winner.paperName}`
      : winner.paperName;

    const finishingDetail = winner.finishingDetail || (selectedFinishingIds.length ? finishingOptions.filter((f) => selectedFinishingIds.includes(f.id)).map((f) => f.name).join(', ') : 'None');
    const mailingDetail = winner.mailingDetail || (selectedMailing?.name || 'None');
    const breakdown = winner.breakdown || [
      { name: 'Paper', cost: winner.paperCost || 0, price: winner.paperPrice || 0, detail: winner.paperName },
      { name: 'Press', cost: winner.pressCost || 0, price: winner.pressPrice || 0, detail: winner.detail },
      { name: 'Finishing', cost: winner.finishingCost || 0, price: winner.finishingPrice || 0, detail: finishingDetail },
      { name: 'Mailing', cost: winner.mailingCost || 0, price: winner.mailingPrice || 0, detail: mailingDetail },
    ];

    return {
      title,
      quantity,
      width: finishW,
      height: finishH,
      paper_stock: combinedPaperStock,
      production_method: winner.method,
      total_cost: winner.totalCost,
      total_price: winner.totalPrice,
      cost_breakdown: { ...winner, product: productMeta, breakdown, finishingDetail, mailingDetail, routes: routeOptions },
      status: 'Draft',
      user_id: selectedCustomerId || null,
      customer_email: selectedCustomer?.email || currentProfile?.email || null,
    };
  };

  const saveQuoteRecord = async (opts?: { redirect?: boolean; silentLoading?: boolean }): Promise<QuoteRecord | null> => {
    if (!winner) return null;
    if (!opts?.silentLoading) setIsSaving(true);
    try {
      const payload = buildQuotePayload();
      const { data, error } = await supabase.from('quotes').insert(payload).select().single();

      if (error) throw error;
      setLastSavedQuoteId(data?.id || null);
      if (opts?.redirect) router.push('/dashboard/quotes');
      return data as QuoteRecord;
    } finally {
      if (!opts?.silentLoading) setIsSaving(false);
    }
  };

  const handleSaveQuote = async () => {
      try {
        await saveQuoteRecord({ redirect: true });
      } catch (err: any) {
        alert('Error saving quote: ' + (err?.message || err));
      }
  };

  const handleEmailQuote = async () => {
    if (!winner) return;
    if (!quoteRecipient) {
      alert('Add a customer email before emailing the quote.');
      return;
    }

    setIsEmailing(true);
    setEmailStatus(null);

    try {
      const saved = await saveQuoteRecord({ redirect: false, silentLoading: true });
      const quoteId = saved?.id || lastSavedQuoteId;
      if (!quoteId) throw new Error('Quote could not be saved before emailing.');

      const response = await fetch('/api/quotes/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, to: quoteRecipient, cc: currentProfile?.email }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to email quote');
      }

      setEmailStatus(`Quote emailed to ${quoteRecipient}`);
    } catch (err: any) {
      console.error('Email quote failed', err);
      alert('Failed to email quote. ' + (err?.message || err));
    } finally {
      setIsEmailing(false);
    }
  };

  const handleSizeSelect = (label: string) => {
    setProductSizeLabel(label);
    const opt = selectedTemplateDef.sizes.find((s) => s.label === label);
    if (opt) {
      setFinishW(opt.width);
      setFinishH(opt.height);
    }
  };

  if (loadingBootstrap) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* NAV */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <h1 className="text-xl font-bold text-gray-900">Auto-Estimator</h1>
            </div>
            <div className="flex gap-2">
                <Link href="/dashboard/pricing" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><DollarSign size={16}/> Costs</Link>
                <Link href="/dashboard/quotes" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> My Quotes</Link>
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* INPUTS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit space-y-6">
                {isInternal && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2"><Users size={14}/> Customer (for overrides)</label>
                    <select 
                      value={selectedCustomerId} 
                      onChange={(e) => setSelectedCustomerId(e.target.value)} 
                      className="w-full border rounded p-2 text-sm bg-white"
                    >
                      <option value="">-- None / Guest --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name || c.company ? `${c.first_name || c.company} (${c.email})` : c.email}
                        </option>
                      ))}
                    </select>
                    {customerOverrides.length > 0 && (
                      <p className="text-[11px] text-green-700 mt-1">{customerOverrides.length} override(s) will be applied.</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-2"><Tag size={12}/> Product Template</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={productKey}
                      onChange={(e) => setProductKey(e.target.value as ProductTemplateKey)}
                      className="w-full border rounded p-2 text-sm bg-white"
                    >
                      {PRODUCT_TEMPLATES.map((t) => (
                        <option key={t.key} value={t.key}>{t.name}</option>
                      ))}
                    </select>
                    {productKey === 'other' && (
                      <input
                        type="text"
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="Describe the product"
                        className="w-full border rounded p-2 text-sm focus:border-black"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={productSizeLabel || 'custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setProductSizeLabel('Custom');
                        } else {
                          handleSizeSelect(val);
                        }
                      }}
                      className="w-full border rounded p-2 text-sm bg-white"
                    >
                      {selectedTemplateDef.sizes.map((s) => (
                        <option key={s.label} value={s.label}>{s.label}</option>
                      ))}
                      <option value="custom">Custom Size</option>
                    </select>
                    {showManualSize ? (
                      <div className="md:col-span-2 flex gap-2 items-center">
                          <input type="number" value={finishW} onChange={(e) => { setFinishW(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full border rounded p-2 text-sm font-bold text-center" />
                          <span className="text-gray-400">x</span>
                          <input type="number" value={finishH} onChange={(e) => { setFinishH(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full border rounded p-2 text-sm font-bold text-center" />
                          <span className="text-xs text-gray-400 ml-2">in</span>
                      </div>
                    ) : (
                      <div className="md:col-span-2 flex items-center text-sm text-gray-600 bg-gray-50 border rounded p-2">Preset size • {productSizeLabel}</div>
                    )}
                  </div>
                  {productKey === 'booklet' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Page Count</label>
                        <input type="number" value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value) || 0)} className="w-full border rounded p-2 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Cover Stock</label>
                          <select value={coverPaperId} onChange={(e) => setCoverPaperId(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                            {paperOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Inside Stock</label>
                          <select value={insidePaperId} onChange={(e) => setInsidePaperId(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                            {paperOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Quote Reference</label>
                    <input type="text" placeholder="e.g. Haleigh's Flyers" value={quoteTitle} onChange={(e) => setQuoteTitle(e.target.value)} className="w-full border rounded p-2 text-sm focus:border-black outline-none"/>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Template / SKU (optional)</label>
                    <input type="text" placeholder="e.g. bc-template-16pt" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full border rounded p-2 text-sm focus:border-black outline-none"/>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">1. Finished Size</label>
                    {showManualSize ? (
                      <div className="flex gap-2 items-center">
                          <input type="number" value={finishW} onChange={(e) => { setFinishW(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-20 border rounded p-2 text-sm font-bold text-center"/>
                          <span className="text-gray-400">x</span>
                          <input type="number" value={finishH} onChange={(e) => { setFinishH(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-20 border rounded p-2 text-sm font-bold text-center"/>
                          <span className="text-xs text-gray-400 ml-2">in</span>
                      </div>
                    ) : (
                      <div className="px-3 py-2 border rounded bg-gray-50 text-sm text-gray-700">Preset: {productSizeLabel}</div>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">2. Quantity</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} className="w-full border rounded p-3 text-lg font-bold"/>
                </div>
                <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <span>3. Paper Stock</span>
                        <span className="text-[10px] font-medium text-gray-400">{showPaperAdvanced ? 'Manual' : 'Auto-selected'}</span>
                      </div>
                      <button type="button" onClick={() => setShowPaperAdvanced(!showPaperAdvanced)} className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        <SlidersHorizontal size={14}/> {showPaperAdvanced ? 'Hide' : 'Advanced'}
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 flex items-center gap-2">
                      <div className="px-2 py-1 bg-white border rounded text-xs font-bold text-gray-800">{activePaperName || 'Auto choose best fit'}</div>
                      <span className="text-xs text-gray-500">{showPaperAdvanced ? 'Using manual stock choice' : 'Auto-selecting best paper/imposition'}</span>
                    </div>
                    {showPaperAdvanced && (
                      <div className="mt-3 space-y-2">
                        {productKey === 'booklet' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <select value={coverPaperId} onChange={(e) => setCoverPaperId(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                              {paperOptions.map(p => {
                                const perSheet = asPerSheet(p.price_amount, p.cost_unit, 1);
                                return <option key={p.id} value={p.id}>{p.name} ({formatCurrency(perSheet)}/sht{(p as any).__override ? ' • override' : ''})</option>;
                              })}
                            </select>
                            <select value={insidePaperId} onChange={(e) => setInsidePaperId(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                              {paperOptions.map(p => {
                                const perSheet = asPerSheet(p.price_amount, p.cost_unit, 1);
                                return <option key={p.id} value={p.id}>{p.name} ({formatCurrency(perSheet)}/sht{(p as any).__override ? ' • override' : ''})</option>;
                              })}
                            </select>
                          </div>
                        ) : (
                          <select value={selectedPaperId} onChange={(e) => setSelectedPaperId(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                              {paperOptions.map(p => {
                                const perSheet = asPerSheet(p.price_amount, p.cost_unit, 1);
                                return <option key={p.id} value={p.id}>{p.name} ({formatCurrency(perSheet)}/sht{(p as any).__override ? ' • override' : ''})</option>;
                              })}
                          </select>
                        )}
                      </div>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">4. Finishing Options</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded bg-gray-50">
                        {finishingOptions.map(f => (
                            <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selectedFinishingIds.includes(f.id)} 
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedFinishingIds([...selectedFinishingIds, f.id]);
                                        else setSelectedFinishingIds(selectedFinishingIds.filter(id => id !== f.id));
                                    }}
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                />
                                <span className="flex-1">{f.name}</span>
                                <span className="text-xs font-mono text-gray-400">{formatCurrency(f.price_amount)}</span>
                                {(f as any).__override && <span className="text-[10px] text-green-700 font-bold">override</span>}
                            </label>
                        ))}
                        {finishingOptions.length === 0 && <p className="text-xs text-gray-400 italic">No finishing options found.</p>}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Selected: {selectedFinishingIds.length > 0 ? finishingOptions.filter((f) => selectedFinishingIds.includes(f.id)).map((f) => f.name).join(', ') : 'None'}
                    </p>
                </div>
                <div className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase text-gray-500">5. Mailing</label>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${selectedMailing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {selectedMailing ? 'Selected' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {selectedMailing ? `Including mailing: ${selectedMailing.name}` : 'Choose a mailing option to add addressing/postage.'}
                    </p>
                    <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded border bg-gray-50 px-2 py-1 text-gray-600">Product: <span className="font-bold text-gray-900">{productMeta.customLabel || productMeta.label}</span></div>
                      <div className="rounded border bg-gray-50 px-2 py-1 text-gray-600">Mailing status: <span className="font-bold text-gray-900">{selectedMailing ? 'Applied to route pricing' : 'Not included'}</span></div>
                    </div>
                    <select 
                        value={selectedMailingId || ''} 
                        onChange={(e) => setSelectedMailingId(e.target.value || null)} 
                        className="w-full border rounded p-3 text-sm bg-white"
                    >
                        <option value="">No Mailing</option>
                        {mailingOptions.map(m => {
                          const unitLabel = m.cost_unit?.replace('per_', '') || 'job';
                          const rate = m.cost_unit === 'per_1000' ? (m.price_amount || 0) / 1000 : m.price_amount;
                          return <option key={m.id} value={m.id}>{m.name} ({formatCurrency(rate)}/{unitLabel}{(m as any).__override ? ' • override' : ''})</option>;
                        })}
                    </select>
                </div>
            </div>

            {/* RESULTS */}
            <div className="lg:col-span-2 space-y-6">
                {winner ? (
                    <div className="bg-green-50 rounded-xl border-2 border-green-500 p-6 relative shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Trophy size={16} className="text-green-600"/>
                                    <span className="text-xs font-bold uppercase text-green-600 tracking-wider">Best Production Route</span>
                                </div>
                                <h2 className="text-3xl font-black text-green-900 uppercase">{productMeta.customLabel || productMeta.label}</h2>
                                <p className="text-sm font-bold text-green-700 mt-1">
                                    {productMeta.sizeLabel} • {winner.nUp}-up on {winner.sheet}
                                </p>
                                {productMeta.pageCount && <p className="text-xs text-green-700 mt-1">{productMeta.pageCount} pages</p>}
                                {productMeta.coverStock && <p className="text-xs text-green-700 mt-1">Cover: {productMeta.coverStock} | Inside: {productMeta.insideStock}</p>}
                                {selectedTemplate && <p className="text-xs text-green-700 mt-1">Template: {selectedTemplate}</p>}
                                {winner.finishingDetail && <p className="text-xs text-green-700 mt-1">Finishing: {winner.finishingDetail}</p>}
                                {selectedMailing && <p className="text-xs text-green-700 mt-1">Mailing: {selectedMailing.name}</p>}
                              </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-green-600 uppercase mb-1">Client Price</p>
                                <p className="text-4xl font-black text-green-900">${winner.totalPrice.toFixed(2)}</p>
                                <p className="text-xs text-green-700 font-mono mt-1">${winner.unitCost.toFixed(3)} / unit</p>
                            </div>
                        </div>

                        <div className="mt-4 grid md:grid-cols-3 gap-3">
                          <div className="p-3 bg-white/80 border border-green-100 rounded-lg">
                            <p className="text-[11px] font-bold uppercase text-green-800">Run Plan</p>
                            <p className="text-sm font-bold text-green-900">{winner.nUp}-up on {winner.usableSheet} usable</p>
                            <p className="text-xs text-green-700 mt-1">Raw sheet: {winner.sheet}</p>
                          </div>
                          <div className="p-3 bg-white/80 border border-green-100 rounded-lg">
                            <p className="text-[11px] font-bold uppercase text-green-800">Sheets & Overs</p>
                            <p className="text-sm font-bold text-green-900">{winner.sheetsNeeded} + {winner.overs} overs = {winner.totalSheets}</p>
                            <p className="text-xs text-green-700 mt-1">Waste factor included</p>
                          </div>
                          <div className="p-3 bg-white/80 border border-green-100 rounded-lg">
                            <p className="text-[11px] font-bold uppercase text-green-800">Component Totals</p>
                            <p className="text-sm font-bold text-green-900">Paper {formatCurrency(winner.paperPrice)} • Press {formatCurrency(winner.pressPrice)}</p>
                            <p className="text-xs text-green-700 mt-1">Finishing {formatCurrency(winner.finishingPrice)} • Mailing {formatCurrency(winner.mailingPrice)}</p>
                          </div>
                        </div>

                        {winner.breakdown && winner.breakdown.length > 0 && (
                          <div className="mt-4 grid sm:grid-cols-2 gap-3">
                            {winner.breakdown.map((item: any) => (
                              <div key={item.name} className="bg-white rounded-lg border border-green-100 p-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[11px] font-bold uppercase text-gray-500">{item.name}</p>
                                    <p className="text-sm font-semibold text-gray-900">{item.detail}</p>
                                  </div>
                                  <div className="text-right text-sm font-mono">
                                    <p className="font-bold text-gray-900">{formatCurrency(item.price)}</p>
                                    <p className="text-[11px] text-gray-500">Cost {formatCurrency(item.cost)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-6 flex gap-1 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-400 h-full" style={{ width: `${(winner.paperPrice / winner.totalPrice) * 100}%` }}></div>
                            <div className="bg-orange-400 h-full" style={{ width: `${(winner.pressPrice / winner.totalPrice) * 100}%` }}></div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-green-200 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                            <button onClick={handleSaveQuote} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-lg transition-all">
                                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                Save as Quote
                            </button>
                            <button onClick={handleEmailQuote} disabled={isEmailing || !quoteRecipient} className="bg-white border border-gray-300 hover:border-black text-gray-800 font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-sm transition-all disabled:opacity-60">
                                {isEmailing ? <Loader2 className="animate-spin" size={20}/> : <Mail size={20}/>}
                                Email quote
                            </button>
                        </div>
                        {emailStatus && <p className="text-xs text-green-700 mt-2">{emailStatus}</p>}
                        {!quoteRecipient && <p className="text-xs text-orange-600 mt-2">Add a customer email to send the quote.</p>}
                    </div>
                ) : (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
                        Enter specs to see the best route.
                    </div>
                )}

                {/* COMPARISON + DEBUG */}
                {estimates.length > 0 && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setShowRouteComparison(!showRouteComparison)}
                              className="w-full px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between text-left"
                            >
                              <div>
                                <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><GitCompareArrows size={14}/> Route Comparison</h3>
                                <p className="text-sm text-gray-600 mt-1">Make the production decision obvious. Winner first, then deltas against it.</p>
                              </div>
                              {showRouteComparison ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                            </button>

                            {showRouteComparison && (
                              <div className="p-4 space-y-3 bg-gray-50/60">
                                {estimates.map((est, i) => {
                                  const delta = (est.totalPrice || 0) - winningPrice;
                                  const isWinner = i === 0;
                                  return (
                                    <div key={i} className={`rounded-xl border p-4 ${isWinner ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-base font-bold text-gray-900">{est.method}</span>
                                            {isWinner && <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">CHEAPEST</span>}
                                            {!isWinner && <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-bold">+{formatCurrency(delta)} vs winner</span>}
                                          </div>
                                          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 text-xs">
                                            <div className="rounded-lg border bg-white/80 px-3 py-2"><span className="block text-gray-500 uppercase font-bold text-[10px]">Layout</span><span className="font-semibold text-gray-900">{est.nUp}-up on {est.usableSheet}</span></div>
                                            <div className="rounded-lg border bg-white/80 px-3 py-2"><span className="block text-gray-500 uppercase font-bold text-[10px]">Sheets</span><span className="font-semibold text-gray-900">{est.sheetsNeeded} + {est.overs} = {est.totalSheets}</span></div>
                                            <div className="rounded-lg border bg-white/80 px-3 py-2"><span className="block text-gray-500 uppercase font-bold text-[10px]">Paper</span><span className="font-semibold text-gray-900">{est.paperName}</span></div>
                                            <div className="rounded-lg border bg-white/80 px-3 py-2"><span className="block text-gray-500 uppercase font-bold text-[10px]">Mailing</span><span className="font-semibold text-gray-900">{est.mailingDetail || 'None'}</span></div>
                                          </div>
                                          <p className="text-xs text-gray-600">{est.detail}</p>
                                        </div>
                                        <div className="lg:text-right min-w-[150px]">
                                          <p className="text-[11px] uppercase font-bold text-gray-500">Sell Price</p>
                                          <p className="text-2xl font-black text-gray-900">{formatCurrency(est.totalPrice)}</p>
                                          <p className="text-xs text-gray-500 font-mono">{formatCurrency(est.unitCost)}/ea</p>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid sm:grid-cols-4 gap-2 text-xs">
                                        <div className="rounded-lg bg-white border px-3 py-2"><span className="block text-[10px] uppercase font-bold text-gray-500">Paper</span><span className="font-semibold text-gray-900">{formatCurrency(est.paperPrice)}</span></div>
                                        <div className="rounded-lg bg-white border px-3 py-2"><span className="block text-[10px] uppercase font-bold text-gray-500">Press</span><span className="font-semibold text-gray-900">{formatCurrency(est.pressPrice)}</span></div>
                                        <div className="rounded-lg bg-white border px-3 py-2"><span className="block text-[10px] uppercase font-bold text-gray-500">Finishing</span><span className="font-semibold text-gray-900">{formatCurrency(est.finishingPrice)}</span></div>
                                        <div className="rounded-lg bg-white border px-3 py-2"><span className="block text-[10px] uppercase font-bold text-gray-500">Mailing</span><span className="font-semibold text-gray-900">{formatCurrency(est.mailingPrice)}</span></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setShowRouteDebug(!showRouteDebug)}
                              className="w-full px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between text-left"
                            >
                              <div>
                                <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Bug size={14}/> Debug Breakdown</h3>
                                <p className="text-sm text-gray-600 mt-1">For estimators only. Raw cost lines so you can spot bad units, weird overs, or a broken route.</p>
                              </div>
                              {showRouteDebug ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                            </button>

                            {showRouteDebug && (
                              <div className="divide-y divide-gray-100">
                                {estimates.map((est, i) => (
                                  <div key={i} className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div>
                                        <p className="font-bold text-gray-900">{est.method} {i === 0 && <span className="ml-2 bg-green-200 text-green-800 text-[9px] px-1.5 py-0.5 rounded">WINNER</span>}</p>
                                        <p className="text-xs text-gray-500">{est.paperName} • {est.nUp}-up • {est.sheetsNeeded}+{est.overs} overs</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{formatCurrency(est.totalPrice)}</p>
                                        <p className="text-[11px] text-gray-500">Cost {formatCurrency(est.totalCost)}</p>
                                      </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-3">
                                      {(est.breakdown || []).map((item: any) => (
                                        <div key={item.name} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="text-[10px] uppercase font-bold text-gray-500">{item.name}</p>
                                              <p className="text-sm font-medium text-gray-900">{item.detail}</p>
                                            </div>
                                            <div className="text-right text-xs font-mono">
                                              <p className="font-bold text-gray-900">Sell {formatCurrency(item.price)}</p>
                                              <p className="text-gray-500">Cost {formatCurrency(item.cost)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
