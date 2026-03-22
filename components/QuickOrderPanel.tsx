'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Plus, ShoppingCart, Trash2, UploadCloud, User, X } from 'lucide-react';
import {
  PRODUCT_TEMPLATES,
  ProductTemplate,
  ProductTemplateKey,
  getDefaultSizeForTemplate,
  getTemplate,
} from '@/utils/productTemplates';

const MODE_COPY = {
  quote: {
    eyebrow: 'New Quote',
    helper: 'Use when specs are mostly known and you want to group multiple items under one intake.',
  },
  'quick-order': {
    eyebrow: 'Quick Order',
    helper: 'Fast path for repeat or clear work. Add multiple items, upload art, and push straight into production review.',
  },
  'internal-job': {
    eyebrow: 'Internal Job',
    helper: 'House work, samples, and tests without forcing a customer record.',
  },
} as const;

const COATING_OPTIONS = ['None', 'UV Gloss', 'AQ Satin', 'Soft Touch', 'Matte Lamination'];
const FOLD_OPTIONS = ['Half Fold', 'Tri-Fold', 'Z-Fold', 'Gate Fold', 'Double Parallel'];
const SUBSTRATE_OPTIONS = ['Foamcore 3/16"', 'Gatorboard', 'PVC', 'Coroplast 4mm', 'Banner Vinyl 13oz', 'Poster Paper', 'Adhesive Vinyl', 'Acrylic'];
const WIDE_FINISHING = ['Grommets', 'Hems', 'Pole Pockets', 'Lamination', 'Mounting'];

// Cart items now carry structured product metadata so internal notes stay consistent
export type CartItem = {
  id: string;
  file: File | null;
  title: string;
  quantity: number;
  size: string;
  size_label?: string;
  product_key?: string;
  product_name?: string;
  paper_stock: string;
  notes: string;
  page_count?: number;
  cover_stock?: string;
  inside_stock?: string;
  fold?: string;
  coating?: string;
  mailing?: boolean;
  mailing_notes?: string;
  substrate?: string;
  finishing?: string[];
  waitingOnArt?: boolean;
};

type QuickOrderProps = {
  currentUser: any;
  role: string;
  customers: any[];
  brandList: any[];
  stockLibrary: any[];
  workflowOptions: any[];
  productTemplates?: ProductTemplate[];
  onJobCreated?: () => void;
  mode?: 'quote' | 'quick-order' | 'internal-job';
};

function formatSizeLabel(label: string, width: number, height: number) {
  if (label && label !== 'Custom') return label;
  if (width && height) return `${width} x ${height}`;
  return label || 'Size TBD';
}

function resolveStockName(stockLibrary: any[], value: string) {
  if (!value) return '';
  const match = stockLibrary.find((s) => s.name === value);
  return match?.name || value;
}

export default function QuickOrderPanel({
  currentUser,
  role,
  customers,
  brandList,
  stockLibrary,
  workflowOptions,
  productTemplates,
  onJobCreated,
  mode = 'quick-order',
}: QuickOrderProps) {
  const copy = MODE_COPY[mode];
  const templates = useMemo(() => (productTemplates?.length ? productTemplates : PRODUCT_TEMPLATES), [productTemplates]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [productKey, setProductKey] = useState<ProductTemplateKey>((templates[0]?.key as ProductTemplateKey) || 'postcard');
  const [productSizeLabel, setProductSizeLabel] = useState<string>('');
  const [finishW, setFinishW] = useState<number>(0);
  const [finishH, setFinishH] = useState<number>(0);
  const [jobNotes, setJobNotes] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [customStockValue, setCustomStockValue] = useState('');
  const [customCoverStockValue, setCustomCoverStockValue] = useState('');
  const [customInsideStockValue, setCustomInsideStockValue] = useState('');
  const [coverStockId, setCoverStockId] = useState('');
  const [insideStockId, setInsideStockId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [pageCount, setPageCount] = useState(8);
  const [foldType, setFoldType] = useState(FOLD_OPTIONS[0]);
  const [coatingType, setCoatingType] = useState(COATING_OPTIONS[0]);
  const [mailingNeeded, setMailingNeeded] = useState(false);
  const [mailingNotes, setMailingNotes] = useState('');
  const [substrate, setSubstrate] = useState(SUBSTRATE_OPTIONS[0]);
  const [finishingSelections, setFinishingSelections] = useState<string[]>([]);
  const [waitingOnArt, setWaitingOnArt] = useState(false);

  const activeTemplate = useMemo(() => getTemplate(productKey, templates), [productKey, templates]);

  useEffect(() => {
    if (brandList?.length && !selectedBrandId) {
      setSelectedBrandId(brandList[0].id);
    }
  }, [brandList, selectedBrandId]);

  useEffect(() => {
    if (!selectedCustomerId && currentUser) {
      setSelectedCustomerId(currentUser.id);
    }
  }, [currentUser, selectedCustomerId]);

  useEffect(() => {
    if (stockLibrary?.length) {
      const defaultStock = stockLibrary[0].name;
      if (!selectedStockId) setSelectedStockId(defaultStock);
      if (!coverStockId) setCoverStockId(defaultStock);
      if (!insideStockId) setInsideStockId(defaultStock);
    }
  }, [stockLibrary, selectedStockId, coverStockId, insideStockId]);

  useEffect(() => {
    // Set defaults when template changes
    const defaultSize = getDefaultSizeForTemplate(productKey, templates);
    if (defaultSize) {
      setProductSizeLabel(defaultSize.label);
      setFinishW(defaultSize.width);
      setFinishH(defaultSize.height);
    } else {
      setProductSizeLabel('Custom');
      setFinishW(0);
      setFinishH(0);
    }

    if (activeTemplate?.fields?.some((f) => f.key === 'pageCount')) setPageCount(8);
    if (activeTemplate?.fields?.some((f) => f.key === 'fold')) setFoldType(FOLD_OPTIONS[0]);
    if (activeTemplate?.fields?.some((f) => f.key === 'coating')) setCoatingType(COATING_OPTIONS[0]);
    if (activeTemplate?.fields?.some((f) => f.key === 'substrate')) setSubstrate(SUBSTRATE_OPTIONS[0]);
    setFinishingSelections([]);
    setMailingNeeded(false);
    setMailingNotes('');
    if (!jobTitle) setJobTitle(activeTemplate?.name || 'Quick Order Item');
  }, [productKey, templates, activeTemplate, jobTitle]);

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCurrentFile(file);
      setWaitingOnArt(false);
      if (!jobTitle) setJobTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setCurrentFile(file);
      setWaitingOnArt(false);
      if (!jobTitle) setJobTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };

  const resetForm = () => {
    setCurrentFile(null);
    setJobTitle('');
    setJobQty('');
    setJobNotes('');
    setCustomStockValue('');
    setCustomCoverStockValue('');
    setCustomInsideStockValue('');
    setFinishingSelections([]);
    setMailingNeeded(false);
    setMailingNotes('');
    setCoatingType(COATING_OPTIONS[0]);
    setFoldType(FOLD_OPTIONS[0]);
    setPageCount(8);
    setWaitingOnArt(false);
    const defaultSize = getDefaultSizeForTemplate(productKey, templates);
    if (defaultSize) {
      setProductSizeLabel(defaultSize.label);
      setFinishW(defaultSize.width);
      setFinishH(defaultSize.height);
    } else {
      setProductSizeLabel('Custom');
      setFinishW(0);
      setFinishH(0);
    }
    if (stockLibrary.length > 0) {
      setSelectedStockId(stockLibrary[0].name);
      setCoverStockId(stockLibrary[0].name);
      setInsideStockId(stockLibrary[0].name);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddToCart = () => {
    if (!currentFile && !waitingOnArt) return alert('Upload a file or mark this item as Waiting on Art.');
    if (!jobQty) return alert('Please enter quantity.');

    const qtyNumber = parseInt(jobQty, 10);
    if (Number.isNaN(qtyNumber) || qtyNumber <= 0) return alert('Quantity must be greater than 0.');

    const resolvedStock = selectedStockId === 'custom' ? customStockValue.trim() : selectedStockId;
    if (!resolvedStock && productKey !== 'wide_format' && productKey !== 'booklet') {
      return alert('Select a stock or enter custom details.');
    }

    const resolvedCoverStock = coverStockId === 'custom' ? customCoverStockValue.trim() : coverStockId;
    const resolvedInsideStock = insideStockId === 'custom' ? customInsideStockValue.trim() : insideStockId;

    if (productKey === 'booklet' && (!resolvedCoverStock || !resolvedInsideStock)) {
      return alert('Select cover and inside stock for the booklet.');
    }

    const sizeLabel = formatSizeLabel(productSizeLabel, finishW, finishH);
    const productName = activeTemplate?.name || productKey;
    const paperStockValue = productKey === 'booklet'
      ? `Cover: ${resolveStockName(stockLibrary, resolvedCoverStock)} / Inside: ${resolveStockName(stockLibrary, resolvedInsideStock)}`
      : productKey === 'wide_format'
        ? substrate || 'Wide Format'
        : resolveStockName(stockLibrary, resolvedStock);

    const specParts = [
      `Product: ${productName}`,
      `Size: ${sizeLabel}`,
      productKey === 'booklet' ? `Pages: ${pageCount}` : null,
      productKey === 'booklet' ? `Cover: ${resolveStockName(stockLibrary, resolvedCoverStock)}` : null,
      productKey === 'booklet' ? `Inside: ${resolveStockName(stockLibrary, resolvedInsideStock)}` : null,
      productKey !== 'booklet' && productKey !== 'wide_format' ? `Stock: ${resolveStockName(stockLibrary, resolvedStock)}` : null,
      ['postcard', 'flyer', 'brochure'].includes(productKey) ? `Coating: ${coatingType}` : null,
      productKey === 'brochure' ? `Fold: ${foldType}` : null,
      productKey === 'wide_format' ? `Substrate: ${substrate}` : null,
      productKey === 'wide_format' && finishingSelections.length ? `Finishing: ${finishingSelections.join(', ')}` : null,
      mailingNeeded ? `Mailing: Yes${mailingNotes ? ` (${mailingNotes})` : ''}` : null,
    ].filter(Boolean);

    const combinedNotes = [specParts.join(' • '), jobNotes].filter(Boolean).join('\n');

    const newItem: CartItem = {
      id: Math.random().toString(36),
      file: waitingOnArt ? null : currentFile,
      title: jobTitle || productName,
      quantity: qtyNumber,
      size: sizeLabel,
      size_label: sizeLabel,
      product_key: productKey,
      product_name: productName,
      notes: combinedNotes,
      paper_stock: paperStockValue,
      page_count: productKey === 'booklet' ? pageCount : undefined,
      cover_stock: productKey === 'booklet' ? resolveStockName(stockLibrary, resolvedCoverStock) : undefined,
      inside_stock: productKey === 'booklet' ? resolveStockName(stockLibrary, resolvedInsideStock) : undefined,
      fold: productKey === 'brochure' ? foldType : undefined,
      coating: ['postcard', 'flyer', 'brochure'].includes(productKey) ? coatingType : undefined,
      mailing: mailingNeeded || undefined,
      mailing_notes: mailingNotes || undefined,
      substrate: productKey === 'wide_format' ? substrate : undefined,
      finishing: productKey === 'wide_format' ? finishingSelections : undefined,
    };

    setCart([...cart, newItem]);
    resetForm();
  };

  const handleRemoveFromCart = (id: string) => setCart(cart.filter((item) => item.id !== id));

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('Cart is empty.');
    if (isNewCustomer && !newCustomerEmail.includes('@')) return alert('Invalid email.');

    setIsUploading(true);
    setStatusNote('');
    try {
      const itemsPayload = cart.map(({ file, ...rest }) => rest);
      const formData = new FormData();
      formData.append('items', JSON.stringify(itemsPayload));

      cart.forEach((item) => {
        const placeholder = new File([], `waiting-on-art-${item.id}.txt`);
        const fileToSend = item.file && !item.waitingOnArt ? item.file : placeholder;
        formData.append('files', fileToSend);
      });

      formData.append('selectedBrandId', selectedBrandId || '');
      formData.append('isNewCustomer', String(isNewCustomer));
      formData.append('newCustomerEmail', newCustomerEmail || '');
      formData.append('selectedCustomerId', selectedCustomerId || '');
      formData.append('workflowOptions', JSON.stringify(workflowOptions || []));
      formData.append('mode', mode);

      const response = await fetch('/api/intake/quick-order', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to submit order');
      }

      setStatusNote(`Order created • ${cart.length} item(s)`);
      setCart([]);
      resetForm();
      onJobCreated?.();
    } catch (error: any) {
      console.error('Quick order failed', error?.message || error);
      setStatusNote(error?.message || 'Failed to submit order.');
    } finally {
      setIsUploading(false);
    }
  };

  const totalQty = useMemo(() => cart.reduce((acc, item) => acc + (item.quantity || 0), 0), [cart]);
  const showStockSelect = productKey !== 'booklet' && productKey !== 'wide_format';
  const showBookletStocks = productKey === 'booklet';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2">{copy.eyebrow}</p>
          <h3 className="text-lg font-bold text-gray-900">Multi-item quick builder</h3>
          <p className="text-sm text-gray-500">{copy.helper}</p>
        </div>
        {statusNote && (
          <div className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">{statusNote}</div>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {role !== 'customer' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase text-yellow-800 flex items-center">
                  <User size={14} className="mr-1" /> Customer
                </label>
                <button type="button" onClick={() => setIsNewCustomer(!isNewCustomer)} className="text-xs font-bold text-blue-600 hover:underline">
                  {isNewCustomer ? 'Select Existing' : '+ New Guest'}
                </button>
              </div>
              {isNewCustomer ? (
                <input type="email" placeholder="client@email.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm outline-none" />
              ) : (
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm outline-none">
                  {[currentUser, ...customers.filter((c) => c.id !== currentUser?.id)].map((c) => (
                    <option key={c?.id} value={c?.id}>
                      {c?.email} {c?.role && c?.role !== 'customer' ? `(${c.role.toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Company / Brand</label>
            <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm outline-none font-bold">
              {brandList.length > 0 ? brandList.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              )) : <option>No Brands Found</option>}
            </select>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-xs font-bold uppercase text-gray-500 flex justify-between">
              <span>Items in Order ({cart.length})</span>
              <span className="flex items-center gap-2">
                <span>Total</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 font-mono">{totalQty.toLocaleString()}</span>
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-white flex justify-between items-center">
                  <div className="flex items-center overflow-hidden gap-3">
                    <FileText size={16} className="text-blue-500 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                        <span className="truncate">{item.title}</span>
                        {item.waitingOnArt && <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 border border-amber-200">Waiting on Art</span>}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{item.product_name || item.product_key} • {item.size} • {item.paper_stock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-bold">{item.quantity}</span>
                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-6">
          <h4 className="font-bold text-gray-900 mb-4 flex items-center text-sm">
            <Plus size={16} className="mr-2 bg-black text-white rounded-full p-0.5" /> Add Item to Order
          </h4>

          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500">Product</label>
                <select
                  value={productKey}
                  onChange={(e) => setProductKey(e.target.value as ProductTemplateKey)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                </select>
                {activeTemplate?.description && <p className="text-[11px] text-gray-500 mt-1">{activeTemplate.description}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500">Preset Size</label>
                <select
                  value={productSizeLabel || 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setProductSizeLabel('Custom');
                    } else {
                      setProductSizeLabel(val);
                      const opt = (activeTemplate?.sizes || []).find((s) => s.label === val);
                      if (opt) {
                        setFinishW(opt.width);
                        setFinishH(opt.height);
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {(activeTemplate?.sizes || []).map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                  {activeTemplate?.allowCustom !== false && <option value="custom">Custom Size</option>}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500">Finished Size</label>
                <div className="flex gap-2 items-center">
                  <input type="number" step="0.01" value={finishW} onChange={(e) => { setFinishW(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
                  <span className="text-gray-400">×</span>
                  <input type="number" step="0.01" value={finishH} onChange={(e) => { setFinishH(parseFloat(e.target.value)); setProductSizeLabel('Custom'); }} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
                </div>
              </div>
            </div>

            {!currentFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFilePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerFilePicker();
                  }
                }}
                role="button"
                tabIndex={0}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}
              >
                <UploadCloud className={`mx-auto h-8 w-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className={`text-sm font-bold ${isDragging ? 'text-blue-700' : 'text-gray-600'}`}>
                  {isDragging ? 'Drop file here!' : 'Click or Drag artwork here'}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl text-blue-900 border border-blue-100">
                <div className="flex items-center overflow-hidden">
                  <FileText size={20} className="mr-3 text-blue-600 flex-shrink-0" />
                  <p className="text-sm font-medium truncate">{currentFile.name}</p>
                </div>
                <button type="button" onClick={() => setCurrentFile(null)} className="ml-2 text-blue-400 hover:text-red-500"><X size={16} /></button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={waitingOnArt}
                  onChange={(e) => {
                    setWaitingOnArt(e.target.checked);
                    if (e.target.checked) setCurrentFile(null);
                  }}
                />
                <span>No file yet — mark as Waiting on Art</span>
              </label>
              {waitingOnArt && <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">We'll log Waiting on Art for this item</span>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <input type="text" placeholder="Item Title (e.g. Business Cards)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
              </div>
              <div>
                <input type="number" placeholder="Qty" value={jobQty} onChange={(e) => setJobQty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
              </div>
              <div className="col-span-2">
                <input type="text" placeholder="Size (auto-filled from preset)" value={formatSizeLabel(productSizeLabel, finishW, finishH)} readOnly className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50" />
              </div>
            </div>

            {showStockSelect && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-gray-500">Paper / Stock</label>
                <select
                  value={selectedStockId}
                  onChange={(e) => setSelectedStockId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black"
                >
                  {stockLibrary.map((s: any) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  <option value="custom">-- Custom / Other --</option>
                </select>
                {selectedStockId === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom paper details..."
                    value={customStockValue}
                    onChange={(e) => setCustomStockValue(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-blue-50 focus:bg-white transition-colors"
                  />
                )}
              </div>
            )}

            {showBookletStocks && (
              <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Cover Stock</label>
                  <select value={coverStockId} onChange={(e) => setCoverStockId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm bg-white">
                    {stockLibrary.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    <option value="custom">-- Custom --</option>
                  </select>
                  {coverStockId === 'custom' && (
                    <input value={customCoverStockValue} onChange={(e) => setCustomCoverStockValue(e.target.value)} placeholder="Custom cover stock" className="mt-1 w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-blue-50" />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Inside Stock</label>
                  <select value={insideStockId} onChange={(e) => setInsideStockId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm bg-white">
                    {stockLibrary.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    <option value="custom">-- Custom --</option>
                  </select>
                  {insideStockId === 'custom' && (
                    <input value={customInsideStockValue} onChange={(e) => setCustomInsideStockValue(e.target.value)} placeholder="Custom inside stock" className="mt-1 w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-blue-50" />
                  )}
                </div>
              </div>
            )}

            {['brochure'].includes(productKey) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Fold</label>
                  <select value={foldType} onChange={(e) => setFoldType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                    {FOLD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Coating</label>
                  <select value={coatingType} onChange={(e) => setCoatingType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                    {COATING_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Mailing</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={mailingNeeded} onChange={(e) => setMailingNeeded(e.target.checked)} />
                    <span className="text-sm text-gray-700">Add addressing / mail prep</span>
                  </div>
                  {mailingNeeded && (
                    <input value={mailingNotes} onChange={(e) => setMailingNotes(e.target.value)} placeholder="Indicia, list, drop date" className="mt-2 w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-blue-50" />
                  )}
                </div>
              </div>
            )}

            {['postcard', 'flyer'].includes(productKey) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Coating</label>
                  <select value={coatingType} onChange={(e) => setCoatingType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                    {COATING_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Mailing</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={mailingNeeded} onChange={(e) => setMailingNeeded(e.target.checked)} />
                    <span className="text-sm text-gray-700">Include mailing?</span>
                  </div>
                  {mailingNeeded && (
                    <input value={mailingNotes} onChange={(e) => setMailingNotes(e.target.value)} placeholder="List, indicia, permits, drop date" className="mt-2 w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-blue-50" />
                  )}
                </div>
              </div>
            )}

            {productKey === 'booklet' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Page Count</label>
                  <input type="number" value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {productKey === 'wide_format' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Substrate</label>
                  <select value={substrate} onChange={(e) => setSubstrate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                    {SUBSTRATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">Finishing</label>
                  <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                    {WIDE_FINISHING.map((f) => (
                      <label key={f} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={finishingSelections.includes(f)} onChange={(e) => e.target.checked ? setFinishingSelections([...finishingSelections, f]) : setFinishingSelections(finishingSelections.filter((id) => id !== f))} />
                        <span className="truncate">{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <textarea
              value={jobNotes}
              onChange={(e) => setJobNotes(e.target.value)}
              placeholder="Internal notes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={(!currentFile && !waitingOnArt) || !jobQty}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${(!currentFile && !waitingOnArt) || !jobQty ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-md'}`}
            >
              {!currentFile && !waitingOnArt ? 'Upload art or mark Waiting on Art…' : !jobQty ? 'Enter Quantity...' : '+ Add Item to List'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmitOrder}
            disabled={isUploading || cart.length === 0}
            className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center shadow-lg"
          >
            {isUploading ? <Loader2 className="animate-spin mr-2" /> : <ShoppingCart className="mr-2" size={18} />} Submit Order ({cart.length} Items)
          </button>
        </div>
      </div>
    </div>
  );
}
