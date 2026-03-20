'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, DollarSign, LayoutGrid, Save, Loader2, Users, Tag, Mail, SlidersHorizontal, Table, PlusCircle, RefreshCcw, Target, Package2, Truck, AlertTriangle, BadgeDollarSign, Scale } from 'lucide-react';
import Link from 'next/link';
import InternalPageHeader from '@/components/InternalPageHeader';
import { applyOverridesToList, CustomerPricingOverride, formatCurrency } from '@/utils/pricing';
import { PRODUCT_TEMPLATES, getDefaultSizeForTemplate, getTemplate, ProductTemplateKey } from '@/utils/productTemplates';
import { calculateProposals, EstimatorContext, RouteOption, PricingComponent, PricingProfileKey, PRICING_PROFILES } from '@/lib/estimator';
import { CUSTOMER_CLASS_DEFAULTS, getCustomerClassDefaultProfile, normalizeCustomerClass } from '@/lib/customerClass';
import { coerceDecimal } from '@/utils/number';

type ProfileLite = {
  id: string;
  email: string;
  first_name?: string;
  company?: string;
  role?: string;
  customer_class?: string | null;
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

type WorksheetLine = {
  id: string;
  label: string;
  detail?: string;
  cost: number;
  price: number;
  type?: string;
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
  const [pricingProfile, setPricingProfile] = useState<PricingProfileKey>('competitive');
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
  const [estimates, setEstimates] = useState<RouteOption[]>([]);
  const [winner, setWinner] = useState<RouteOption | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [selectedMailingId, setSelectedMailingId] = useState<string | null>(null);
  const [showPaperAdvanced, setShowPaperAdvanced] = useState(false);

  const [worksheetLines, setWorksheetLines] = useState<WorksheetLine[]>([]);
  const [newLine, setNewLine] = useState<{ label: string; cost: string; price: string }>({ label: '', cost: '', price: '' });

  const [validationQuotes, setValidationQuotes] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [validationRunning, setValidationRunning] = useState(false);
  const [crossoverRows, setCrossoverRows] = useState<any[]>([]);
  const [crossoverRunning, setCrossoverRunning] = useState(false);

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
  const pricingProfiles: { key: PricingProfileKey; label: string; note: string }[] = [
    { key: 'wholesale', label: 'Wholesale', note: 'Lean margin for contract / reseller work' },
    { key: 'competitive', label: 'Competitive', note: 'Default market price for normal quoting' },
    { key: 'retail', label: 'Retail', note: 'Higher margin for walk-in / convenience buys' },
  ];

  const asPerSheet = (value?: number, unit?: string, threshold = 1) => {
    const raw = Number(value || 0);
    if (unit === 'per_1000' || raw > threshold) return raw / 1000;
    return raw;
  };

  const paperSellPerSheet = (paper: any) => {
    const baseCost = asPerSheet(paper?.cost_amount, (paper as any)?.cost_unit, 1);
    const overrideValue = paper?.price_override ?? paper?.price_amount;
    const baseSell = overrideValue != null
      ? asPerSheet(overrideValue, (paper as any)?.price_unit || (paper as any)?.cost_unit, 1)
      : baseCost;
    return overrideValue != null ? baseSell : baseCost * (PRICING_PROFILES[pricingProfile] ?? 1);
  };

  const effectiveCustomerClass = normalizeCustomerClass(
    customers.find((c) => c.id === selectedCustomerId)?.customer_class || currentProfile?.customer_class
  );
  const customerClassConfig = CUSTOMER_CLASS_DEFAULTS[effectiveCustomerClass];

  const validationFeedback = useMemo(() => {
    const issues: { level: 'error' | 'warning'; message: string }[] = [];
    if (!quoteTitle.trim()) issues.push({ level: 'warning', message: 'Quote reference is blank. Save now and nobody will know what this is later.' });
    if (!quantity || quantity <= 0) issues.push({ level: 'error', message: 'Quantity must be greater than zero.' });
    if (!finishW || !finishH || finishW <= 0 || finishH <= 0) issues.push({ level: 'error', message: 'Finished size is incomplete. Enter width and height before trusting the route.' });
    if (!winner) issues.push({ level: 'error', message: 'No valid route found. Check stock, size, or press coverage.' });
    if (winner && winner.totalPrice <= winner.totalCost) issues.push({ level: 'warning', message: 'This quote is at or below cost. Margin needs attention before release.' });
    if (winner && winner.method?.toLowerCase().includes('digital') && quantity >= 5000) issues.push({ level: 'warning', message: 'Large digital run. Check the crossover board—offset may deserve a second look.' });
    if (winner && winner.method?.toLowerCase().includes('offset') && quantity <= 1000) issues.push({ level: 'warning', message: 'Small offset run. Digital may land faster and cleaner at this quantity.' });
    return issues;
  }, [quoteTitle, quantity, finishW, finishH, winner]);

  const seedWorksheetFromRoute = (route: RouteOption | null) => {
    if (!route) {
      setWorksheetLines([]);
      return;
    }
    const base = (route.breakdown || []).map((item, idx) => ({
      id: `${item.name}-${idx}`,
      label: item.name,
      detail: item.detail,
      cost: Number(item.cost || 0),
      price: Number(item.price || 0),
      type: item.name.toLowerCase(),
    }));
    setWorksheetLines(base);
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
  }, [finishW, finishH, quantity, selectedPaperId, insidePaperId, selectedFinishingIds, selectedMailingId, customerOverrides, selectedTemplate, pricingProfile, papers, presses, finishing, mailing, productKey, productSizeLabel, pageCount, coverPaperId, customProductName, showPaperAdvanced]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadOverrides(selectedCustomerId);
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || (currentProfile?.id === selectedCustomerId ? currentProfile : null);
      if (selectedCustomer?.customer_class) {
        setPricingProfile(getCustomerClassDefaultProfile(selectedCustomer.customer_class));
      }
    } else {
      setCustomerOverrides([]);
    }
  }, [selectedCustomerId, customers, currentProfile]);

  useEffect(() => {
    if (winner) {
      setEmailStatus(null);
      seedWorksheetFromRoute(winner);
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
        if (profileData.customer_class) {
          setPricingProfile(getCustomerClassDefaultProfile(profileData.customer_class));
        }

        if (internal) {
          const { data: people } = await supabase
            .from('profiles')
            .select('id, email, first_name, company, role, customer_class')
            .order('email');
          if (people) setCustomers(people);
        } else {
          setCustomers([profileData]);
        }
      }
    }

    await fetchInventory();
    await loadValidationQuotes();
    setLoadingBootstrap(false);
  };

  const normalizePaper = (row: any) => ({
    ...row,
    parent_sheet_width: coerceDecimal(row.parent_sheet_width),
    parent_sheet_height: coerceDecimal(row.parent_sheet_height),
    weight: coerceDecimal(row.weight),
    caliper: coerceDecimal(row.caliper),
    cost_amount: coerceDecimal(row.cost_amount) ?? 0,
    price_amount: coerceDecimal(row.price_amount),
    price_override: coerceDecimal(row.price_override),
  });

  const normalizeComponent = (row: any) => ({
    ...row,
    cost_amount: coerceDecimal(row.cost_amount) ?? 0,
    price_amount: coerceDecimal(row.price_amount),
    price_override: coerceDecimal((row as any).price_override),
    setup_minutes: coerceDecimal((row as any).setup_minutes),
    run_speed_per_hour: coerceDecimal((row as any).run_speed_per_hour),
    parent_sheet_width: coerceDecimal((row as any).parent_sheet_width),
    parent_sheet_height: coerceDecimal((row as any).parent_sheet_height),
  });

  const fetchInventory = async () => {
    const { data: pData } = await supabase.from('paper_catalog').select('*').order('name');
    const { data: mData } = await supabase.from('pricing_components').select('*').in('type', ['press_digital', 'press_offset']);
    const { data: fData } = await supabase.from('pricing_components').select('*').eq('type', 'finishing').order('name');
    const { data: mailData } = await supabase.from('pricing_components').select('*').eq('type', 'mailing').order('name');

    if (pData) {
        const normalized = (pData as any[]).map(normalizePaper) as any;
        setPapers(normalized);
        if (normalized.length > 0 && !selectedPaperId) {
          setSelectedPaperId(normalized[0].id);
          setCoverPaperId(normalized[0].id);
          setInsidePaperId(normalized[0].id);
        }
    }
    if (mData) setPresses((mData as any[]).map(normalizeComponent) as any);
    if (fData) setFinishing((fData as any[]).map(normalizeComponent) as any);
    if (mailData) setMailing((mailData as any[]).map(normalizeComponent) as any);
  };

  const loadValidationQuotes = async () => {
    const { data, error } = await supabase
      .from("quotes")
      .select("id, quote_number, title, quantity, width, height, total_price, status, cost_breakdown, customer_name, customer_email, production_method")
      .in("status", ["Approved", "Converted"])
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) {
      console.error("validation quotes", error.message);
      return;
    }
    setValidationQuotes(data || []);
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
  const activePaper = paperOptions.find((p) => p.id === activePaperId);
  const activePaperName = activePaper?.name;

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
          pricingProfile,
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
        setWinner(best as any);
        seedWorksheetFromRoute(best as any);
        if (!showPaperAdvanced && (best as any).paperId) {
          setSelectedPaperId((best as any).paperId);
        }
      } else {
        setWinner(null);
        setWorksheetLines([]);
      }
      setLastSavedQuoteId(null);
  };

  const resolveFinishingIdsFromDetail = (detail?: string | null) => {
    if (!detail) return [] as string[];
    return finishingOptions
      .filter((f) => detail.toLowerCase().includes((f.name || '').toLowerCase()))
      .map((f) => f.id);
  };

  const resolveMailingIdFromDetail = (detail?: string | null) => {
    if (!detail) return null;
    const match = mailingOptions.find((m) => detail.toLowerCase().includes((m.name || '').toLowerCase()));
    return match?.id || null;
  };

  const runValidationChecks = () => {
    if (!validationQuotes.length) return;
    setValidationRunning(true);
    const rows: any[] = [];

    validationQuotes.forEach((quote) => {
      const baseline = quote.cost_breakdown || {};
      const finishingDetail = baseline.finishingDetail || baseline.breakdown?.find((b: any) => b.name === 'Finishing')?.detail;
      const mailingDetail = baseline.mailingDetail || baseline.breakdown?.find((b: any) => b.name === 'Mailing')?.detail;

      const guessedFinishingIds = resolveFinishingIdsFromDetail(finishingDetail);
      const guessedMailingId = resolveMailingIdFromDetail(mailingDetail);
      const paperId = baseline.paperId || paperOptions.find((p) => p.name === baseline.paperName)?.id || paperOptions.find((p) => p.id === baseline.paperId)?.id || activePaperId;

      const proposals = calculateProposals(
        {
          finishW: Number(quote.width),
          finishH: Number(quote.height),
          qtyList: [Number(quote.quantity)],
          selectedPaperIds: paperId ? [paperId] : undefined,
          selectedFinishingIds: guessedFinishingIds,
          selectedMailingId: guessedMailingId,
          templateKey: baseline?.product?.templateKey,
          pricingProfile: baseline.pricingProfile || pricingProfile,
        },
        {
          papers: paperOptions,
          presses,
          finishing: finishingOptions,
          mailing: mailingOptions,
          overrides: [],
        }
      );

      const rerun = proposals[0]?.winner;
      rows.push({
        id: quote.id,
        title: quote.title,
        qty: quote.quantity,
        storedPrice: quote.total_price,
        rerunPrice: rerun?.totalPrice || null,
        delta: rerun?.totalPrice ? rerun.totalPrice - quote.total_price : null,
        storedMethod: baseline.method || quote.production_method,
        rerunMethod: rerun?.method,
        quoteNumber: quote.quote_number,
      });
    });

    setValidationResults(rows);
    setValidationRunning(false);
  };

  const runCrossoverTest = () => {
    setCrossoverRunning(true);
    const qtyList = [100, 250, 500, 1000, 2500, 5000, 7500, 10000];
    const proposals = calculateProposals(
      {
        finishW,
        finishH,
        qtyList,
        selectedPaperIds: showPaperAdvanced && activePaperId ? [activePaperId] : undefined,
        selectedFinishingIds,
        selectedMailingId,
        templateKey: selectedTemplate,
        pricingProfile,
      },
      { papers, presses, finishing, mailing, overrides: customerOverrides }
    );

    const rows = proposals.map((p) => ({
      quantity: p.quantity,
      method: p.winner?.method,
      price: p.winner?.totalPrice,
      unit: p.winner?.unitCost,
      profile: p.winner?.pricingProfile || pricingProfile,
    }));

    let crossoverQty: number | null = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].method && rows[i - 1].method && rows[i].method !== rows[i - 1].method) {
        crossoverQty = rows[i].quantity;
        break;
      }
    }

    setCrossoverRows(rows.map((r) => ({ ...r, crossover: crossoverQty === r.quantity })));
    setCrossoverRunning(false);
  };

  const worksheetTotals = useMemo(() => {
    const cost = worksheetLines.reduce((acc, l) => acc + (Number(l.cost) || 0), 0);
    const price = worksheetLines.reduce((acc, l) => acc + (Number(l.price) || 0), 0);
    const margin = price - cost;
    const marginPct = price > 0 ? (margin / price) * 100 : 0;
    return { cost, price, margin, marginPct };
  }, [worksheetLines]);

  const effectivePrice = worksheetLines.length ? worksheetTotals.price : winner?.totalPrice || 0;
  const effectiveCost = worksheetLines.length ? worksheetTotals.cost : winner?.totalCost || 0;

  const worksheetLineMap = useMemo(() => {
    const map: Record<string, WorksheetLine> = {};
    worksheetLines.forEach((line) => {
      const key = (line.type || line.label || '').toLowerCase();
      if (key) map[key] = line;
    });
    return map;
  }, [worksheetLines]);

  const resolvedPaper = {
    price: (worksheetLineMap['paper']?.price ?? winner?.paperPrice) || 0,
    cost: (worksheetLineMap['paper']?.cost ?? winner?.paperCost) || 0,
    detail: worksheetLineMap['paper']?.detail || winner?.paperName || '',
  };
  const resolvedPress = {
    price: (worksheetLineMap['press']?.price ?? winner?.pressPrice) || 0,
    cost: (worksheetLineMap['press']?.cost ?? winner?.pressCost) || 0,
    detail: worksheetLineMap['press']?.detail || winner?.detail || '',
  };
  const resolvedFinishing = {
    price: (worksheetLineMap['finishing']?.price ?? winner?.finishingPrice) || 0,
    cost: (worksheetLineMap['finishing']?.cost ?? winner?.finishingCost) || 0,
    detail: worksheetLineMap['finishing']?.detail || winner?.finishingDetail || '',
  };
  const resolvedMailing = {
    price: (worksheetLineMap['mailing']?.price ?? winner?.mailingPrice) || 0,
    cost: (worksheetLineMap['mailing']?.cost ?? winner?.mailingCost) || 0,
    detail: worksheetLineMap['mailing']?.detail || winner?.mailingDetail || '',
  };

  const resolvedBreakdown = useMemo(() => {
    if (!winner) return [] as any[];
    const base = winner.breakdown || [];
    if (!worksheetLines.length) return base;

    const mapped = base.map((item) => {
      const key = (item.name || '').toLowerCase();
      const override = worksheetLineMap[key];
      return override
        ? { ...item, price: override.price, cost: override.cost, detail: override.detail || item.detail }
        : item;
    });

    const extras = worksheetLines
      .filter((line) => {
        const key = (line.type || line.label || '').toLowerCase();
        return key && !base.some((item) => (item.name || '').toLowerCase() === key);
      })
      .map((line, idx) => ({ name: line.label, cost: line.cost, price: line.price, detail: line.detail || '', id: `extra-${idx}` }));

    return [...mapped, ...extras];
  }, [winner, worksheetLines, worksheetLineMap]);

  const breakdownForDisplay = resolvedBreakdown.length ? resolvedBreakdown : (winner?.breakdown || []);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const quoteRecipient = selectedCustomer?.email || currentProfile?.email;

  const buildQuotePayload = () => {
    if (!winner) throw new Error('No estimate ready to save.');
    const fallbackTitle = productMeta.customLabel || productMeta.label;
    const title = quoteTitle || `${fallbackTitle} ${productMeta.sizeLabel}`;

    const combinedPaperStock = productKey === 'booklet'
      ? `Cover: ${coverPaperName || insidePaperName || winner.paperName} / Inside: ${insidePaperName || winner.paperName}`
      : winner.paperName;

    const finishingDetail = winner.finishingDetail || (selectedFinishingIds.length ? finishingOptions.filter((f) => selectedFinishingIds.includes(f.id)).map((f) => f.name).join(', ') : 'None');
    const mailingDetail = winner.mailingDetail || (selectedMailing?.name || 'None');
    const breakdown = worksheetLines.length > 0 ? worksheetLines.map((line) => ({ name: line.label, cost: line.cost, price: line.price, detail: line.detail || '' })) : (winner.breakdown || [
      { name: 'Paper', cost: winner.paperCost || 0, price: winner.paperPrice || 0, detail: winner.paperName },
      { name: 'Press', cost: winner.pressCost || 0, price: winner.pressPrice || 0, detail: winner.detail },
      { name: 'Finishing', cost: winner.finishingCost || 0, price: winner.finishingPrice || 0, detail: finishingDetail },
      { name: 'Mailing', cost: winner.mailingCost || 0, price: winner.mailingPrice || 0, detail: mailingDetail },
    ]);

    const resolvedWinnerEconomics = {
      ...winner,
      paperPrice: resolvedPaper.price,
      paperCost: resolvedPaper.cost,
      pressPrice: resolvedPress.price,
      pressCost: resolvedPress.cost,
      finishingPrice: resolvedFinishing.price,
      finishingCost: resolvedFinishing.cost,
      mailingPrice: resolvedMailing.price,
      mailingCost: resolvedMailing.cost,
      totalPrice: effectivePrice,
      totalCost: effectiveCost,
      unitCost: effectivePrice / quantity,
    };

    const routesForPayload = routeOptions.map((route, idx) => {
      const isWinnerRoute = idx === 0;
      if (worksheetLines.length && isWinnerRoute) {
        const qty = route.quantity || quantity || 1;
        return {
          ...route,
          paperPrice: resolvedPaper.price,
          paperCost: resolvedPaper.cost,
          pressPrice: resolvedPress.price,
          pressCost: resolvedPress.cost,
          finishingPrice: resolvedFinishing.price,
          finishingCost: resolvedFinishing.cost,
          mailingPrice: resolvedMailing.price,
          mailingCost: resolvedMailing.cost,
          totalPrice: effectivePrice,
          totalCost: effectiveCost,
          unitCost: effectivePrice / qty,
          breakdown: resolvedBreakdown.length ? resolvedBreakdown : route.breakdown,
        };
      }
      return route;
    });

    return {
      title,
      quantity,
      width: finishW,
      height: finishH,
      paper_stock: combinedPaperStock,
      production_method: winner.method,
      total_cost: effectiveCost,
      total_price: effectivePrice,
      cost_breakdown: { ...resolvedWinnerEconomics, pricingProfile, profileFactor: PRICING_PROFILES[pricingProfile], product: productMeta, breakdown, finishingDetail, mailingDetail, routes: routesForPayload, worksheet: { lines: worksheetLines, totals: worksheetTotals } },
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

  const updateLine = (id: string, key: 'label' | 'detail' | 'cost' | 'price', value: string) => {
    setWorksheetLines((prev) => prev.map((line) => line.id === id ? { ...line, [key]: key === 'label' || key === 'detail' ? value : Number(value) } : line));
  };

  const removeLine = (id: string) => setWorksheetLines((prev) => prev.filter((l) => l.id !== id));

  const addCustomLine = () => {
    if (!newLine.label.trim()) return;
    setWorksheetLines((prev) => [...prev, { id: `custom-${Date.now()}`, label: newLine.label.trim(), cost: Number(newLine.cost || 0), price: Number(newLine.price || 0), type: 'custom' }]);
    setNewLine({ label: '', cost: '', price: '' });
  };

  if (loadingBootstrap) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        <InternalPageHeader
          title="Auto-Estimator"
          description="Run winning routes, margins, and overrides without leaving the production context."
          icon={BadgeDollarSign}
          breadcrumbs={[{ label: 'Pricing', href: '/dashboard/pricing' }, { label: 'Estimator' }]}
          actions={
            <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/pricing/paper-catalog" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> Paper</Link>
                <Link href="/dashboard/pricing/finishing-catalog" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><Package2 size={16}/> Finishing</Link>
                <Link href="/dashboard/pricing/mailing-catalog" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><Truck size={16}/> Mailing</Link>
                <Link href="/dashboard/pricing" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><DollarSign size={16}/> Costs</Link>
                <Link href="/dashboard/quotes" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> My Quotes</Link>
            </div>
          }
          maxWidthClassName="max-w-6xl"
          sticky
        />

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

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-amber-700 flex items-center gap-2"><BadgeDollarSign size={13}/> Customer class default</p>
                      <p className="text-sm font-bold text-amber-900 mt-1">{customerClassConfig.label}</p>
                      <p className="text-xs text-amber-800 mt-1">Default margin profile: <span className="font-bold capitalize">{customerClassConfig.pricingProfile}</span> ×{PRICING_PROFILES[customerClassConfig.pricingProfile].toFixed(2)}</p>
                    </div>
                    <div className="text-right text-[11px] text-amber-700">
                      <p>Manual override</p>
                      <p className="font-bold text-amber-900 capitalize">{pricingProfile}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-2">Estimator starts from the customer class, then you can bump it up or down quote-by-quote.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2"><Target size={14}/> Pricing Profile</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {pricingProfiles.map((profile) => (
                      <button
                        type="button"
                        key={profile.key}
                        onClick={() => setPricingProfile(profile.key)}
                        className={`text-left rounded-xl border px-3 py-3 transition-all ${pricingProfile === profile.key ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'}`}
                      >
                        <p className="text-sm font-bold">{profile.label}</p>
                        <p className={`text-[11px] mt-1 ${pricingProfile === profile.key ? 'text-gray-200' : 'text-gray-500'}`}>{profile.note}</p>
                      </button>
                    ))}
                  </div>
                </div>

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
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">3. Pricing Profile <span className="text-[10px] text-gray-400">markup policy</span></label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {(['wholesale','competitive','retail'] as PricingProfileKey[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPricingProfile(key)}
                          className={`border rounded-lg px-3 py-2 text-sm font-bold text-left ${pricingProfile === key ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-gray-700 hover:border-black'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="capitalize">{key}</span>
                            <span className="text-[11px] font-mono">×{PRICING_PROFILES[key].toFixed(2)}</span>
                          </div>
                          <p className={`text-[11px] ${pricingProfile === key ? 'text-gray-200' : 'text-gray-500'}`}>
                            {key === 'wholesale' && 'Trade/volume pricing'}
                            {key === 'competitive' && 'House default'}
                            {key === 'retail' && 'Walk-in / rush'}
                          </p>
                        </button>
                      ))}
                    </div>
                </div>
                <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <span>4. Paper Stock</span>
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
                                const perSheet = paperSellPerSheet(p);
                                return <option key={p.id} value={p.id}>{p.name} ({formatCurrency(perSheet)}/sht{(p as any).__override ? ' • override' : ''})</option>;
                              })}
                            </select>
                            <select value={insidePaperId} onChange={(e) => setInsidePaperId(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                              {paperOptions.map(p => {
                                const perSheet = paperSellPerSheet(p);
                                return <option key={p.id} value={p.id}>{p.name} ({formatCurrency(perSheet)}/sht{(p as any).__override ? ' • override' : ''})</option>;
                              })}
                            </select>
                          </div>
                        ) : (
                          <select value={selectedPaperId} onChange={(e) => setSelectedPaperId(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                              {paperOptions.map(p => {
                                const perSheet = paperSellPerSheet(p);
                                const brandSku = [p.brand, p.sku].filter(Boolean).join(' • ');
                                const weight = p.weight ? `${p.weight}#` : '';
                                const cal = p.caliper ? `${p.caliper} cal` : '';
                                return <option key={p.id} value={p.id}>{p.name}{brandSku ? ` (${brandSku})` : ''}{weight || cal ? ` • ${[weight, cal].filter(Boolean).join(' ')}` : ''} ({formatCurrency(perSheet)}/sht{(p as any).__override ? ' • override' : ''})</option>;
                              })}
                          </select>
                        )}
                      </div>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2"><Package2 size={14}/> 5. Finishing Catalog</label>
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
                </div>
                <div className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Truck size={14}/> 6. Mailing Model</label>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${selectedMailing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {selectedMailing ? 'Selected' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {selectedMailing ? `Including mailing: ${selectedMailing.name}` : 'Choose a mailing option to add addressing/postage.'}
                    </p>
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
                {validationFeedback.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                    <div className="px-6 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-amber-700 flex items-center gap-2"><AlertTriangle size={14}/> Estimator validation</p>
                        <p className="text-sm text-amber-900">Flag problems before this quote leaves the building.</p>
                      </div>
                    </div>
                    <div className="divide-y divide-amber-100">
                      {validationFeedback.map((item, idx) => (
                        <div key={idx} className="px-6 py-3 flex items-start gap-3 text-sm">
                          <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${item.level === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                          <p className={item.level === 'error' ? 'text-red-700' : 'text-amber-800'}>{item.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {winner ? (
                    <div className="bg-green-50 rounded-xl border-2 border-green-500 p-6 relative shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Trophy size={16} className="text-green-600"/>
                                    <span className="text-xs font-bold uppercase text-green-600 tracking-wider">Best Production Route</span>
                                    <span className="px-2 py-0.5 rounded-full bg-white/60 text-[10px] font-black uppercase text-green-700 border border-green-200">
                                      {pricingProfile} ×{PRICING_PROFILES[pricingProfile].toFixed(2)}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-black text-green-900 uppercase">{productMeta.customLabel || productMeta.label}</h2>
                                <p className="text-sm font-bold text-green-700 mt-1">
                                    {productMeta.sizeLabel} • {winner.nUp}-up on {winner.sheet}
                                </p>
                                {productMeta.pageCount && <p className="text-xs text-green-700 mt-1">{productMeta.pageCount} pages</p>}
                                {productMeta.coverStock && <p className="text-xs text-green-700 mt-1">Cover: {productMeta.coverStock} | Inside: {productMeta.insideStock}</p>}
                                {selectedTemplate && <p className="text-xs text-green-700 mt-1">Template: {selectedTemplate}</p>}
                                <p className="text-xs text-green-700 mt-1">Pricing profile: <span className="font-bold capitalize">{pricingProfile}</span></p>
                                {winner.finishingDetail && <p className="text-xs text-green-700 mt-1">Finishing: {winner.finishingDetail}</p>}
                                {selectedMailing && <p className="text-xs text-green-700 mt-1">Mailing: {selectedMailing.name}</p>}
                              </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-green-600 uppercase mb-1">Client Price</p>
                                <p className="text-4xl font-black text-green-900">${effectivePrice.toFixed(2)}</p>
                                <p className="text-xs text-green-700 font-mono mt-1">${(effectivePrice / quantity).toFixed(3)} / unit</p>
                                <p className="text-[11px] text-green-700">Gross: ${(effectivePrice - effectiveCost >= 0 ? '' : '-')}${Math.abs(effectivePrice - effectiveCost).toFixed(2)} ({(effectivePrice ? ((effectivePrice - effectiveCost) / effectivePrice) * 100 : 0).toFixed(1)}%)</p>
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
                            <p className="text-sm font-bold text-green-900">Paper {formatCurrency(resolvedPaper.price)} • Press {formatCurrency(resolvedPress.price)}</p>
                            <p className="text-xs text-green-700 mt-1">Finishing {formatCurrency(resolvedFinishing.price)} • Mailing {formatCurrency(resolvedMailing.price)}</p>
                          </div>
                        </div>

                        {breakdownForDisplay && breakdownForDisplay.length > 0 && (
                          <div className="mt-4 grid sm:grid-cols-2 gap-3">
                            {breakdownForDisplay.map((item: any) => (
                              <div key={item.id || item.name} className="bg-white rounded-lg border border-green-100 p-3 shadow-sm">
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
                            <div className="bg-blue-400 h-full" style={{ width: `${(resolvedPaper.price / (effectivePrice || 1)) * 100}%` }}></div>
                            <div className="bg-orange-400 h-full" style={{ width: `${(resolvedPress.price / (effectivePrice || 1)) * 100}%` }}></div>
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

                {/* Worksheet */}
                {winner && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Table size={14}/> Worksheet + Economics</p>
                        <p className="text-sm text-gray-500">One sheet for line edits, sell, cost, and gross before saving the quote.</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-gray-900">${effectivePrice.toFixed(2)} total</p>
                        <p className="text-xs text-gray-500">Gross {worksheetLines.length ? worksheetTotals.margin.toFixed(2) : (winner.totalPrice - winner.totalCost).toFixed(2)} ({worksheetLines.length ? worksheetTotals.marginPct.toFixed(1) : ((winner.totalPrice - winner.totalCost) / (winner.totalPrice || 1) * 100).toFixed(1)}%)</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-gray-500 font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2">Line</th>
                            <th className="px-4 py-2">Detail</th>
                            <th className="px-4 py-2">Cost</th>
                            <th className="px-4 py-2">Price</th>
                            <th className="px-4 py-2 text-right">Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {worksheetLines.map((line) => (
                            <tr key={line.id}>
                              <td className="px-4 py-2">
                                <input value={line.label} onChange={(e) => updateLine(line.id, 'label', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                              </td>
                              <td className="px-4 py-2">
                                <input value={line.detail || ''} onChange={(e) => updateLine(line.id, 'detail', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                              </td>
                              <td className="px-4 py-2">
                                <input type="number" value={line.cost} onChange={(e) => updateLine(line.id, 'cost', e.target.value)} className="w-full border rounded px-2 py-1 text-sm bg-red-50" />
                              </td>
                              <td className="px-4 py-2">
                                <input type="number" value={line.price} onChange={(e) => updateLine(line.id, 'price', e.target.value)} className="w-full border rounded px-2 py-1 text-sm bg-green-50" />
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-gray-500">
                                {(line.price - line.cost).toFixed(2)}
                                <button onClick={() => removeLine(line.id)} className="ml-2 text-gray-300 hover:text-red-600">×</button>
                              </td>
                            </tr>
                          ))}
                          {worksheetLines.length === 0 && (
                            <tr><td colSpan={5} className="text-center text-gray-400 py-4">No worksheet entries yet. Using route economics.</td></tr>
                          )}
                        </tbody>
                        <tfoot className="bg-gray-50 text-sm">
                          <tr>
                            <td colSpan={2} className="px-4 py-2 text-right font-bold">Totals</td>
                            <td className="px-4 py-2 font-mono">${effectiveCost.toFixed(2)}</td>
                            <td className="px-4 py-2 font-mono">${(effectivePrice).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-600">{(effectivePrice - effectiveCost).toFixed(2)} ({(effectivePrice ? ((effectivePrice - effectiveCost)/effectivePrice*100) : 0).toFixed(1)}%)</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="px-4 py-4 flex flex-col gap-3 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <input value={newLine.label} onChange={(e) => setNewLine({ ...newLine, label: e.target.value })} placeholder="Add line item" className="md:col-span-2 border rounded px-3 py-2 text-sm" />
                        <input type="number" value={newLine.cost} onChange={(e) => setNewLine({ ...newLine, cost: e.target.value })} placeholder="Cost" className="border rounded px-3 py-2 text-sm" />
                        <input type="number" value={newLine.price} onChange={(e) => setNewLine({ ...newLine, price: e.target.value })} placeholder="Price" className="border rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="flex flex-wrap gap-2 justify-between items-center">
                        <div className="flex gap-2">
                          <button onClick={addCustomLine} className="px-3 py-2 bg-black text-white rounded-lg text-sm font-bold flex items-center gap-2"><PlusCircle size={16}/> Add Line</button>
                          <button onClick={() => seedWorksheetFromRoute(winner)} className="px-3 py-2 bg-white border rounded-lg text-sm font-bold flex items-center gap-2 text-gray-700"><RefreshCcw size={14}/> Reset to Route</button>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <p>Unit sell: ${(effectivePrice / quantity).toFixed(3)} • Unit cost: ${(effectiveCost / quantity).toFixed(3)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {winner && estimates.length > 1 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Scale size={14}/> Digital vs. offset crossover</p>
                        <p className="text-sm text-gray-500">Show both lanes so estimators can defend the chosen route.</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 p-6">
                      {(['Digital','Offset'] as const).map((lane) => {
                        const route = estimates.find((est) => est.method?.toLowerCase().includes(lane.toLowerCase()));
                        return (
                          <div key={lane} className={`rounded-xl border p-4 ${route ? 'border-gray-200 bg-gray-50' : 'border-dashed border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-bold uppercase text-gray-500">{lane} lane</p>
                                <p className="text-sm font-bold text-gray-900">{route?.method || `No ${lane.toLowerCase()} route`}</p>
                              </div>
                              {route && winner.method === route.method && <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-green-100 text-green-700">Chosen</span>}
                            </div>
                            {route ? (
                              <>
                                <p className="text-xs text-gray-600 mt-2">{route.nUp}-up on {route.usableSheet || route.sheet} • {route.sheetsNeeded}+{route.overs} overs</p>
                                <div className="mt-3 flex items-end justify-between">
                                  <div>
                                    <p className="text-[11px] uppercase font-bold text-gray-500">Sell</p>
                                    <p className="text-lg font-black text-gray-900">{formatCurrency(route.totalPrice)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] uppercase font-bold text-gray-500">Gross</p>
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(route.totalPrice - route.totalCost)}</p>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 mt-3">Current specs never generated a viable {lane.toLowerCase()} route.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* COMPARISON TABLE */}
                {estimates.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xs font-bold uppercase text-gray-500">Route Comparison — full line items</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-gray-400 font-bold border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-2">Method</th>
                                    <th className="px-6 py-2">Layout</th>
                                    <th className="px-6 py-2">Sheets</th>
                                    <th className="px-6 py-2">Paper</th>
                                    <th className="px-6 py-2">Press</th>
                                    <th className="px-6 py-2">Finishing</th>
                                    <th className="px-6 py-2">Mailing</th>
                                    <th className="px-6 py-2">Profile</th>
                                    <th className="px-6 py-2 text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {estimates.map((est, i) => {
                                    const isWinnerRow = i === 0;
                                    const displayPaperPrice = isWinnerRow && worksheetLines.length ? resolvedPaper.price : est.paperPrice;
                                    const displayPaperCost = isWinnerRow && worksheetLines.length ? resolvedPaper.cost : est.paperCost;
                                    const displayPressPrice = isWinnerRow && worksheetLines.length ? resolvedPress.price : est.pressPrice;
                                    const displayPressCost = isWinnerRow && worksheetLines.length ? resolvedPress.cost : est.pressCost;
                                    const displayFinishingPrice = isWinnerRow && worksheetLines.length ? resolvedFinishing.price : est.finishingPrice;
                                    const displayFinishingCost = isWinnerRow && worksheetLines.length ? resolvedFinishing.cost : est.finishingCost;
                                    const displayMailingPrice = isWinnerRow && worksheetLines.length ? resolvedMailing.price : est.mailingPrice;
                                    const displayMailingCost = isWinnerRow && worksheetLines.length ? resolvedMailing.cost : est.mailingCost;
                                    const displayTotalPrice = isWinnerRow && worksheetLines.length ? effectivePrice : est.totalPrice;
                                    const displayTotalCost = isWinnerRow && worksheetLines.length ? effectiveCost : est.totalCost;
                                    const displayUnit = isWinnerRow && worksheetLines.length ? (effectivePrice / (est.quantity || quantity)) : est.unitCost;
                                    return (
                                    <tr key={i} className={`hover:bg-gray-50 ${i === 0 ? 'bg-green-50/50' : ''}`}>
                                        <td className="px-6 py-3 font-bold text-gray-900">
                                            {est.method}
                                            {i === 0 && <span className="ml-2 bg-green-200 text-green-800 text-[9px] px-1.5 py-0.5 rounded">WINNER</span>}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 text-xs">
                                            {est.nUp}-up on {est.usableSheet} usable ({est.sheet})
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 text-xs">
                                            {est.sheetsNeeded} + {est.overs} overs = {est.totalSheets}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">
                                          <div className="font-semibold text-gray-700">{est.paperName}</div>
                                          <div>{formatCurrency(displayPaperPrice)} sell / {formatCurrency(displayPaperCost)} cost</div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">
                                          <div className="font-semibold text-gray-700">{est.method}</div>
                                          <div>{formatCurrency(displayPressPrice)} sell / {formatCurrency(displayPressCost)} cost</div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">
                                          <div className="font-semibold text-gray-700">{est.finishingDetail || 'None'}</div>
                                          <div>{formatCurrency(displayFinishingPrice)} sell / {formatCurrency(displayFinishingCost)} cost</div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">
                                          <div className="font-semibold text-gray-700">{est.mailingDetail || 'None'}</div>
                                          <div>{formatCurrency(displayMailingPrice)} sell / {formatCurrency(displayMailingCost)} cost</div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">
                                          <div className="font-semibold text-gray-700 capitalize">{est.pricingProfile || pricingProfile}</div>
                                          <div>{(est.profileFactor || PRICING_PROFILES[pricingProfile]).toFixed(2)}x</div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono font-bold text-gray-900">
                                            ${displayTotalPrice.toFixed(2)}
                                            <div className="text-[11px] text-gray-500">${displayUnit.toFixed(3)} ea</div>
                                            <div className="text-[11px] text-green-700">Gross ${(displayTotalPrice - displayTotalCost).toFixed(2)}</div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}


                {validationQuotes.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><BadgeDollarSign size={14}/> Estimator sanity checks</p>
                        <p className="text-sm text-gray-500">Re-run recent approved quotes against today's pricing to catch drift.</p>
                      </div>
                      <button onClick={runValidationChecks} disabled={validationRunning} className="px-3 py-2 text-sm font-bold bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-60">
                        {validationRunning ? 'Running…' : 'Run checks'}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-gray-500 font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2">Quote</th>
                            <th className="px-4 py-2">Qty</th>
                            <th className="px-4 py-2">Stored</th>
                            <th className="px-4 py-2">Re-run</th>
                            <th className="px-4 py-2">Delta</th>
                            <th className="px-4 py-2">Method</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(validationResults.length > 0 ? validationResults : validationQuotes).map((row: any) => {
                            const delta = row.delta ?? (row.rerunPrice && row.storedPrice ? row.rerunPrice - row.storedPrice : null);
                            const deltaColor = delta === null ? 'text-gray-400' : delta > 10 ? 'text-red-600' : delta < -10 ? 'text-green-700' : 'text-gray-700';
                            return (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-bold text-gray-900">#{row.quoteNumber || row.id?.slice(0,6)} {row.title || ''}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{Number(row.qty || row.quantity).toLocaleString()}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{row.storedPrice ? formatCurrency(row.storedPrice) : '--'}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{row.rerunPrice ? formatCurrency(row.rerunPrice) : '—'}</td>
                                <td className={`px-4 py-2 text-sm font-mono ${deltaColor}`}>
                                  {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700">{row.rerunMethod || row.storedMethod || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><AlertTriangle size={14}/> Digital vs offset crossover test</p>
                      <p className="text-sm text-gray-500">Run multiple quantities to see where lanes flip.</p>
                    </div>
                    <button onClick={runCrossoverTest} disabled={crossoverRunning} className="px-3 py-2 text-sm font-bold bg-white border rounded-lg hover:border-black">
                      {crossoverRunning ? 'Testing…' : 'Run crossover board'}
                    </button>
                  </div>
                  {crossoverRows.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">Run the board to see digital vs offset inflection points.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-gray-500 font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2">Qty</th>
                            <th className="px-4 py-2">Method</th>
                            <th className="px-4 py-2">Profile</th>
                            <th className="px-4 py-2">Price</th>
                            <th className="px-4 py-2">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {crossoverRows.map((row) => (
                            <tr key={row.quantity} className={`hover:bg-gray-50 ${row.crossover ? 'bg-yellow-50' : ''}`}>
                              <td className="px-4 py-2 font-mono font-bold text-gray-900">{row.quantity.toLocaleString()}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{row.method || '—'} {row.crossover && <span className="ml-2 text-[10px] font-black uppercase text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded">Crossover</span>}</td>
                              <td className="px-4 py-2 text-sm capitalize text-gray-700">{row.profile}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{row.price ? formatCurrency(row.price) : '—'}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{row.unit ? formatCurrency(row.unit) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
            </div>
        </div>
    </div>
  );
}
