'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, Paperclip, Send, Sparkles } from 'lucide-react';
import { applyOverridesToList, parseQuantityList, formatCurrency } from '@/utils/pricing';
import { PRODUCT_TEMPLATES, getDefaultSizeForTemplate, getTemplate, ProductTemplateKey } from '@/utils/productTemplates';
import { calculateProposals, PricingProfileKey, PRICING_PROFILES } from '@/lib/estimator';
import { getCustomerClassDefaultProfile } from '@/lib/customerClass';

export default function BotIntakePanel({
  supabase,
  currentUser,
  brandList,
  workflowOptions,
  customers,
  onJobCreated,
  mode = 'quote',
}: {
  supabase: any;
  currentUser: any;
  brandList: any[];
  workflowOptions: any[];
  customers: any[];
  onJobCreated?: () => void;
  mode?: 'quote' | 'quick-order' | 'internal-job';
}) {
  const modeCopy = {
    quote: {
      eyebrow: 'New Quote',
      title: 'Build a priced quote from intake details',
      helper: 'Capture customer context, estimate quantity breaks, and turn the winning route into a review-ready job.',
      status: 'Quote-first flow',
      defaultTitle: 'New Quote Request',
    },
    'quick-order': {
      eyebrow: 'Quick Order',
      title: 'Turn a clear request into a fast order',
      helper: 'Use this when specs are mostly known and speed matters more than discovery.',
      status: 'Fast-path order flow',
      defaultTitle: 'Quick Order',
    },
    'internal-job': {
      eyebrow: 'Internal Job',
      title: 'Create an internal production job',
      helper: 'Use for house jobs, samples, reprints, press tests, and non-customer work that still needs estimator logic.',
      status: 'Internal production flow',
      defaultTitle: 'Internal Job',
    },
  }[mode];

  const defaultProductSize = getDefaultSizeForTemplate('flyer');
  const [transcript, setTranscript] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [itemTitle, setItemTitle] = useState(modeCopy.defaultTitle);
  const [productKey, setProductKey] = useState<ProductTemplateKey>('flyer');
  const [productSizeLabel, setProductSizeLabel] = useState<string>(defaultProductSize?.label || '');
  const [customProductName, setCustomProductName] = useState('');
  const [pageCount, setPageCount] = useState(8);
  const [finishW, setFinishW] = useState(defaultProductSize?.width || 8.5);
  const [finishH, setFinishH] = useState(defaultProductSize?.height || 11);
  const [qtyInput, setQtyInput] = useState('250,500,1000');
  const [templateKey, setTemplateKey] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandList?.[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(mode === 'internal-job' ? '' : (currentUser?.id || ''));
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [coverPaperId, setCoverPaperId] = useState<string>('');
  const [insidePaperId, setInsidePaperId] = useState<string>('');
  const [selectedMailingId, setSelectedMailingId] = useState<string>('');
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [pricingProfile, setPricingProfile] = useState<PricingProfileKey>(getCustomerClassDefaultProfile(currentUser?.customer_class));
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [proposals, setProposals] = useState<{ quantity: number; winner: any }[]>([]);
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null);
  const [papers, setPapers] = useState<any[]>([]);
  const [presses, setPresses] = useState<any[]>([]);
  const [finishing, setFinishing] = useState<any[]>([]);
  const [mailing, setMailing] = useState<any[]>([]);
  const [customerOverrides, setCustomerOverrides] = useState<any[]>([]);

  useEffect(() => {
    fetchPricing();
  }, []);

  useEffect(() => {
    setItemTitle(modeCopy.defaultTitle);
    if (mode === 'internal-job') {
      setSelectedCustomerId('');
      setContactEmail('internal@printhq.local');
      setContactName('Internal');
    }
  }, [mode]);

  useEffect(() => {
    const defaultSz = getDefaultSizeForTemplate(productKey);
    if (defaultSz) {
      setProductSizeLabel(defaultSz.label);
      setFinishW(defaultSz.width);
      setFinishH(defaultSz.height);
    }
  }, [productKey]);

  useEffect(() => {
    if (brandList?.length && !selectedBrandId) setSelectedBrandId(brandList[0].id);
  }, [brandList, selectedBrandId]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadOverrides(selectedCustomerId);
      const selected = customers.find((c) => c.id === selectedCustomerId) || (currentUser?.id === selectedCustomerId ? currentUser : null);
      if (selected?.customer_class) setPricingProfile(getCustomerClassDefaultProfile(selected.customer_class));
    } else {
      setCustomerOverrides([]);
    }
  }, [selectedCustomerId, customers, currentUser]);

  useEffect(() => {
    if (papers.length > 0) {
      if (!selectedPaperId) setSelectedPaperId(papers[0].id);
      if (!insidePaperId) setInsidePaperId(papers[0].id);
      if (!coverPaperId) setCoverPaperId(papers[0].id);
    }
  }, [papers, selectedPaperId, insidePaperId, coverPaperId]);

  const fetchPricing = async () => {
    const { data: pData } = await supabase.from('paper_catalog').select('*').order('name');
    const { data: mData } = await supabase.from('pricing_components').select('*').in('type', ['press_digital', 'press_offset']);
    const { data: fData } = await supabase.from('pricing_components').select('*').eq('type', 'finishing').order('name');
    const { data: mailData } = await supabase.from('pricing_components').select('*').eq('type', 'mailing').order('name');
    if (pData) setPapers(pData as any);
    if (mData) setPresses(mData as any);
    if (fData) setFinishing(fData as any);
    if (mailData) setMailing(mailData as any);
  };

  const loadOverrides = async (customerId: string) => {
    const { data, error } = await supabase.from('customer_pricing').select('*').eq('customer_id', customerId);
    if (error) {
      console.error('customer_pricing', error.message);
      setCustomerOverrides([]);
      return;
    }
    setCustomerOverrides(data || []);
  };

  const papersWithOverrides = useMemo(() => applyOverridesToList(papers, customerOverrides, { templateKey, componentType: 'paper' }), [papers, customerOverrides, templateKey]);
  const pressesWithOverrides = useMemo(() => applyOverridesToList(presses, customerOverrides, { templateKey, componentType: 'press' }), [presses, customerOverrides, templateKey]);
  const finishingWithOverrides = useMemo(() => applyOverridesToList(finishing, customerOverrides, { templateKey, componentType: 'finishing' }), [finishing, customerOverrides, templateKey]);
  const mailingWithOverrides = useMemo(() => applyOverridesToList(mailing, customerOverrides, { templateKey, componentType: 'mailing' }), [mailing, customerOverrides, templateKey]);

  const coverPaperName = papersWithOverrides.find((p) => p.id === coverPaperId)?.name;
  const insidePaperName = papersWithOverrides.find((p) => p.id === (productKey === 'booklet' ? insidePaperId : selectedPaperId))?.name;
  const productMeta = {
    key: productKey,
    label: getTemplate(productKey).name,
    sizeLabel: productSizeLabel || `${finishW}x${finishH}`,
    size: { width: finishW, height: finishH },
    pageCount: productKey === 'booklet' ? pageCount : undefined,
    coverStock: productKey === 'booklet' ? coverPaperName : undefined,
    insideStock: productKey === 'booklet' ? insidePaperName : undefined,
    customLabel: customProductName || undefined,
  };

  const paperSellPerSheet = (paper: any) => {
    const baseCost = Number(paper?.cost_amount || 0) / ((paper?.cost_unit === 'per_1000' || Number(paper?.cost_amount || 0) > 1) ? 1000 : 1);
    const overrideValue = paper?.price_override ?? paper?.price_amount;
    const priceUnit = paper?.price_unit || paper?.cost_unit;
    const divisor = priceUnit === 'per_1000' || Number(overrideValue || 0) > 1 ? 1000 : 1;
    const baseSell = overrideValue != null ? Number(overrideValue || 0) / divisor : baseCost;
    return overrideValue != null ? baseSell : baseCost * (PRICING_PROFILES[pricingProfile] ?? 1);
  };

  const calculateWinner = (qty: number) => {
    const activePaperId = productKey === 'booklet' ? (insidePaperId || selectedPaperId) : selectedPaperId;
    const selectedPaperIds = activePaperId ? [activePaperId] : undefined;
    const proposalResults = calculateProposals(
      {
        finishW,
        finishH,
        qtyList: [qty],
        selectedPaperIds,
        selectedFinishingIds,
        selectedMailingId,
        templateKey,
        pricingProfile,
      },
      {
        papers: papersWithOverrides as any,
        presses: pressesWithOverrides as any,
        finishing: finishingWithOverrides as any,
        mailing: mailingWithOverrides as any,
        overrides: [],
      }
    );

    const winnerRoute = proposalResults[0]?.winner;
    if (!winnerRoute) return null;
    return { ...winnerRoute, product: productMeta } as any;
  };

  const handleEstimate = () => {
    setIsEstimating(true);
    const quantities = parseQuantityList(qtyInput);
    const results: { quantity: number; winner: any }[] = [];
    quantities.forEach((q) => {
      const winner = calculateWinner(q);
      if (winner) results.push({ quantity: q, winner });
    });
    results.sort((a, b) => a.quantity - b.quantity);
    setProposals(results);
    setSelectedQuantity(results[0]?.quantity || null);
    setIsEstimating(false);
  };

  const handleCreateJob = async () => {
    if (isCreating) return;
    if (!selectedQuantity) return alert('Select a quantity to create the job.');
    const chosen = proposals.find((p) => p.quantity === selectedQuantity);
    if (!chosen?.winner) return alert('Run estimator and pick a quantity first.');
    setIsCreating(true);
    setStatusNote('');
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ user_id: selectedCustomerId || null, status: 'New', brand_id: selectedBrandId || null })
        .select()
        .single();
      if (orderError || !order) throw orderError;

      const combinedPaperStock = productKey === 'booklet'
        ? `Cover: ${coverPaperName || insidePaperName || chosen.winner.paperName} / Inside: ${insidePaperName || chosen.winner.paperName}`
        : chosen.winner.paperName || null;
      const productNote = `Mode: ${modeCopy.eyebrow}\nProduct: ${productMeta.customLabel || productMeta.label} ${productMeta.sizeLabel}${productMeta.pageCount ? ` • ${productMeta.pageCount} pages` : ''}${productMeta.coverStock ? ` • Cover ${productMeta.coverStock}` : ''}${productMeta.insideStock ? ` • Inside ${productMeta.insideStock}` : ''}`;

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          order_id: order.id,
          user_id: selectedCustomerId || null,
          guest_email: selectedCustomerId ? null : (contactEmail || null),
          title: itemTitle || productMeta.customLabel || productMeta.label || modeCopy.defaultTitle,
          quantity: selectedQuantity,
          status: 'Pending Review',
          created_by: currentUser?.id || null,
          notes: [transcript, productNote, contactName ? `Contact: ${contactName}` : null].filter(Boolean).join('\n'),
          paper_stock: combinedPaperStock,
          size: `${finishW}x${finishH}`,
        })
        .select()
        .single();
      if (jobError || !job) throw jobError;

      const { data: jobItem, error: itemError } = await supabase
        .from('job_items')
        .insert({
          job_id: job.id,
          description: itemTitle || productMeta.customLabel || productMeta.label || modeCopy.defaultTitle,
          quantity: selectedQuantity,
          paper_stock: combinedPaperStock,
          size: `${finishW}x${finishH}`,
          internal_notes: [transcript, productNote, contactName ? `Contact: ${contactName}` : null].filter(Boolean).join('\n'),
          status: 'Pending',
        })
        .select()
        .single();
      if (itemError || !jobItem) throw itemError;

      const steps = (workflowOptions?.length ? workflowOptions : [{ name: 'Prepress' }]).map((w: any) => w.name || w.step_name || w);
      for (const stepName of steps) {
        await supabase.from('job_item_steps').insert({ job_item_id: jobItem.id, step_name: stepName, status: 'Pending', is_internal: true });
      }

      for (const file of attachments) {
        const cleanName = `${job.id}-intake-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
        const { data: uploaded, error: uploadErr } = await supabase.storage.from('uploads').upload(cleanName, file);
        if (uploadErr) {
          console.error('upload failed', uploadErr.message);
          continue;
        }
        if (uploaded) {
          await supabase.from('job_assets').insert({
            job_id: job.id,
            job_item_id: jobItem.id,
            uploader_id: currentUser?.id || null,
            file_url: uploaded.path,
            file_name: file.name,
            asset_type: 'source',
            status: 'pending',
          });
        }
      }

      await supabase.from('job_logs').insert({
        job_id: job.id,
        user_id: currentUser?.id || null,
        action: modeCopy.eyebrow,
        details: `${modeCopy.eyebrow} created job with ${selectedQuantity} qty (${chosen.winner.method}).`,
        job_item_id: jobItem.id,
      });

      await supabase.from('messages').insert({
        job_id: job.id,
        user_id: currentUser?.id || null,
        content: `${modeCopy.eyebrow} Summary: ${transcript}\nQuantity: ${selectedQuantity}\nRoute: ${chosen.winner.method}\nPrice: ${formatCurrency(chosen.winner.totalPrice)}`,
      });

      setStatusNote('Job created and routed into review.');
      setAttachments([]);
      setProposals([]);
      setSelectedQuantity(null);
      setSelectedFinishingIds([]);
      setSelectedPaperId(papersWithOverrides[0]?.id || '');
      onJobCreated?.();
    } catch (err: any) {
      console.error('bot intake create failed', err?.message || err);
      alert('Failed to create job from intake.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachments(Array.from(files));
    setIsDragging(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2"><Bot size={14}/>{modeCopy.eyebrow}</p>
          <h3 className="text-lg font-bold text-gray-900">{modeCopy.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{modeCopy.helper}</p>
        </div>
        <div className="text-xs text-gray-500 text-right">
          <div>{customerOverrides.length} override(s) active</div>
          <div>{modeCopy.status}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500">Conversation / Scope</label>
            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full border rounded-xl p-3 h-40 text-sm" placeholder="Paste customer notes, sales chat, or internal production direction..." />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500">Contact Email</label>
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder={mode === 'internal-job' ? 'Optional for internal work' : 'customer@email.com'} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500">Contact Name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="CSR / customer contact" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500">Brand</label>
              <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                {brandList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500">Customer</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                <option value="">{mode === 'internal-job' ? 'No customer (internal)' : 'Guest / no account'}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name || c.company || c.email}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500">Template / SKU</label>
            <input value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Optional template or known SKU" />
          </div>
          <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files); }} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}>
            <input type="file" multiple className="hidden" id={`bot-intake-files-${mode}`} onChange={(e) => handleFileDrop(e.target.files)} />
            <label htmlFor={`bot-intake-files-${mode}`} className="flex flex-col items-center text-sm text-gray-600">
              <Paperclip className="mb-2" size={18}/> Drop files here or attach art/specs
            </label>
          </div>
          {attachments.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y">
              {attachments.map((f, idx) => (
                <div key={idx} className="px-3 py-2 text-sm flex justify-between items-center gap-3">
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 text-xs font-bold">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase text-gray-500">Item Title</label>
              <input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500">Product</label>
              <select value={productKey} onChange={(e) => setProductKey(e.target.value as ProductTemplateKey)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                {PRODUCT_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500">Preset Size</label>
              <select value={productSizeLabel || 'custom'} onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') setProductSizeLabel('Custom');
                else {
                  setProductSizeLabel(val);
                  const opt = getTemplate(productKey).sizes.find((s) => s.label === val);
                  if (opt) { setFinishW(opt.width); setFinishH(opt.height); }
                }
              }} className="w-full border rounded px-3 py-2 text-sm bg-white">
                {getTemplate(productKey).sizes.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                <option value="custom">Custom Size</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase text-gray-500">Finished Size</label>
              <div className="flex gap-2 items-center">
                <input type="number" value={finishW} onChange={(e) => { setFinishW(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full border rounded px-2 py-2 text-sm" />
                <span className="text-gray-400">×</span>
                <input type="number" value={finishH} onChange={(e) => { setFinishH(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full border rounded px-2 py-2 text-sm" />
              </div>
            </div>
            {productKey === 'other' && (
              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase text-gray-500">Custom Product</label>
                <input value={customProductName} onChange={(e) => setCustomProductName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Describe the product" />
              </div>
            )}
            {productKey === 'booklet' && (
              <div className="col-span-2 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Page Count</label>
                  <input type="number" value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value) || 0)} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500">Cover Stock</label>
                    <select value={coverPaperId} onChange={(e) => setCoverPaperId(e.target.value)} className="w-full border rounded px-2 py-2 text-sm bg-white">
                      {papersWithOverrides.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500">Inside Stock</label>
                    <select value={insidePaperId} onChange={(e) => setInsidePaperId(e.target.value)} className="w-full border rounded px-2 py-2 text-sm bg-white">
                      {papersWithOverrides.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase text-gray-500">Quantity Breaks</label>
              <input value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="250,500,1000" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500">Pricing Profile</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['wholesale','competitive','retail'] as PricingProfileKey[]).map((k) => (
                <button key={k} type="button" onClick={() => setPricingProfile(k)} className={`border rounded-lg px-2 py-2 text-sm font-bold ${pricingProfile === k ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:border-black'}`}>
                  <div className="flex items-center justify-between"><span className="capitalize">{k}</span><span className="text-[10px] font-mono">×{PRICING_PROFILES[k].toFixed(2)}</span></div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500">Paper</label>
            <select value={productKey === 'booklet' ? insidePaperId : selectedPaperId} onChange={(e) => productKey === 'booklet' ? setInsidePaperId(e.target.value) : setSelectedPaperId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
              {papersWithOverrides.map((p) => {
                const perSheet = paperSellPerSheet(p);
                const overrideTag = p.price_override != null || p.price_amount != null;
                const suffix = overrideTag ? 'override' : `${pricingProfile} profile`;
                return <option key={p.id} value={p.id}>{p.name} ({formatCurrency(perSheet)}/sht • {suffix}{p.__override ? ' • customer' : ''})</option>;
              })}
            </select>
            {productKey === 'booklet' && coverPaperId && <p className="text-[11px] text-gray-500 mt-1">Cover: {coverPaperName || 'Select'} · Inside: {insidePaperName || 'Select'}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500">Finishing</label>
            <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {finishingWithOverrides.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedFinishingIds.includes(f.id)} onChange={(e) => e.target.checked ? setSelectedFinishingIds([...selectedFinishingIds, f.id]) : setSelectedFinishingIds(selectedFinishingIds.filter((id) => id !== f.id))} />
                  <span className="truncate">{f.name}</span>
                  {f.__override && <span className="text-[10px] text-green-700 font-bold">override</span>}
                </label>
              ))}
              {finishingWithOverrides.length === 0 && <p className="text-xs text-gray-400">No finishing options.</p>}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500">Mailing</label>
            <select value={selectedMailingId} onChange={(e) => setSelectedMailingId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
              <option value="">No mailing</option>
              {mailingWithOverrides.map((m) => {
                const unitLabel = (m.cost_unit || 'per_job').replace('per_', '');
                const rate = m.cost_unit === 'per_1000' ? (m.price_amount || 0) / 1000 : m.price_amount;
                return <option key={m.id} value={m.id}>{m.name} ({formatCurrency(rate)}/{unitLabel}{m.__override ? ' • override' : ''})</option>;
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleEstimate} disabled={isEstimating} className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-bold hover:border-black flex items-center justify-center gap-2">
              {isEstimating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} Run Estimator
            </button>
            <button onClick={handleCreateJob} disabled={isCreating || !selectedQuantity} className="flex-1 bg-black text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-60">
              {isCreating ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Create Job
            </button>
          </div>

          {proposals.length > 0 && (
            <div className="border border-gray-200 rounded-xl divide-y">
              {proposals.map((p) => (
                <button key={p.quantity} onClick={() => setSelectedQuantity(p.quantity)} className={`w-full text-left px-4 py-3 flex items-center justify-between ${selectedQuantity === p.quantity ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.quantity.toLocaleString()} qty</p>
                    <p className="text-xs text-gray-500">{p.winner.method} • {p.winner.sheet} • {p.winner.nUp}-up</p>
                    <p className="text-[10px] text-gray-500 capitalize">Profile: {p.winner.pricingProfile || pricingProfile} ×{(p.winner.profileFactor || PRICING_PROFILES[pricingProfile]).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gray-900">{formatCurrency(p.winner.totalPrice)}</p>
                    <p className="text-[11px] text-gray-500">{formatCurrency(p.winner.unitCost)} / unit</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {statusNote && <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg px-3 py-2 text-sm">{statusNote}</div>}
        </div>
      </div>
    </div>
  );
}
