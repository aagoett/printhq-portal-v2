'use client';

import { createBrowserClient } from '@supabase/ssr';
import {
  UploadCloud,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard,
  Loader2,
  X,
  Scissors,
  User,
  Trash2,
  ArrowRightCircle,
  Briefcase,
  Plus,
  ShoppingCart,
  Paperclip,
  Bot,
  Sparkles,
  Send,
  MessageSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CsrChatPanel from '@/components/CsrChatPanel';
import { sendOrderConfirmation } from '../server-actions';
import { applyOverridesToList, parseQuantityList, formatCurrency } from '@/utils/pricing';
import { PRODUCT_TEMPLATES, getDefaultSizeForTemplate, getTemplate, ProductTemplateKey } from '@/utils/productTemplates';
import { calculateProposals, PricingProfileKey, PRICING_PROFILES } from '@/lib/estimator';
import { getCustomerClassDefaultProfile } from '@/lib/customerClass';

// --- TYPES ---
type Profile = {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  department?: string;
  customer_class?: string | null;
};

type Brand = {
  id: string;
  name: string;
};

type CartItem = {
  id: string;
  file: File;
  title: string;
  quantity: number;
  size: string;
  notes: string;
  paper_stock: string;
};

type PaperStock = {
  id: string;
  name: string;
};

type Job = {
  id: string;
};

export default function IntakePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [stockLibrary, setStockLibrary] = useState<PaperStock[]>([]);
  const [brandList, setBrandList] = useState<Brand[]>([]);

  // --- CART STATE ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [jobSize, setJobSize] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  // PAPER STOCK LOGIC
  const [selectedStockId, setSelectedStockId] = useState('');
  const [customStockValue, setCustomStockValue] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // --- BOT INTAKE STATE ---
  const [transcript, setTranscript] = useState('Bot said they need flyers with a QR code. Midnight blue background.');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [itemTitle, setItemTitle] = useState('Bot Intake Job');

  const defaultProductSize = getDefaultSizeForTemplate('flyer');
  const [productKey, setProductKey] = useState<ProductTemplateKey>('flyer');
  const [productSizeLabel, setProductSizeLabel] = useState<string>(defaultProductSize?.label || '');
  const [customProductName, setCustomProductName] = useState('');
  const [pageCount, setPageCount] = useState(8);
  const [finishW, setFinishW] = useState(defaultProductSize?.width || 8.5);
  const [finishH, setFinishH] = useState(defaultProductSize?.height || 11);
  const [qtyInput, setQtyInput] = useState('250,500,1000');
  const [templateKey, setTemplateKey] = useState('');
  const [selectedBotBrandId, setSelectedBotBrandId] = useState<string>('');
  const [selectedBotCustomerId, setSelectedBotCustomerId] = useState<string>('');
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [coverPaperId, setCoverPaperId] = useState<string>('');
  const [insidePaperId, setInsidePaperId] = useState<string>('');
  const [selectedMailingId, setSelectedMailingId] = useState<string>('');
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [pricingProfile, setPricingProfile] = useState<PricingProfileKey>('competitive');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isBotEstimating, setIsBotEstimating] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [proposals, setProposals] = useState<{ quantity: number; winner: any }[]>([]);
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null);

  const [papers, setPapers] = useState<any[]>([]);
  const [presses, setPresses] = useState<any[]>([]);
  const [finishing, setFinishing] = useState<any[]>([]);
  const [mailing, setMailing] = useState<any[]>([]);
  const [customerOverrides, setCustomerOverrides] = useState<any[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchIntakeData();
  }, []);

  useEffect(() => {
    const defaultSz = getDefaultSizeForTemplate(productKey);
    if (defaultSz) {
      setProductSizeLabel(defaultSz.label);
      setFinishW(defaultSz.width);
      setFinishH(defaultSz.height);
    }
  }, [productKey]);

  useEffect(() => {
    if (papers.length > 0) {
      if (!selectedPaperId) setSelectedPaperId(papers[0].id);
      if (!insidePaperId) setInsidePaperId(papers[0].id);
      if (!coverPaperId) setCoverPaperId(papers[0].id);
    }
  }, [papers, selectedPaperId, insidePaperId, coverPaperId]);

  useEffect(() => {
    if (selectedBotCustomerId) {
      loadOverrides(selectedBotCustomerId);
      const selected = customers.find((c) => c.id === selectedBotCustomerId) || (user?.id === selectedBotCustomerId ? user : null);
      if (selected?.customer_class) {
        setPricingProfile(getCustomerClassDefaultProfile(selected.customer_class));
      }
    } else {
      setCustomerOverrides([]);
    }
  }, [selectedBotCustomerId, customers, user]);

  useEffect(() => {
    if (brandList?.length && !selectedBotBrandId) {
      setSelectedBotBrandId(brandList[0].id);
    }
  }, [brandList]);

  const fetchIntakeData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUser(user);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'customer';
    setRole(userRole);

    if (userRole !== 'admin' && userRole !== 'staff') {
      router.push('/dashboard');
      return;
    }

    const { data: stockData } = await supabase.from('paper_stocks').select('*').order('name');
    if (stockData) {
      setStockLibrary(stockData);
      if (stockData.length > 0) setSelectedStockId(stockData[0].name);
    }

    const { data: brandsData } = await supabase.from('brands').select('*');
    if (brandsData) {
      setBrandList(brandsData);
      if (brandsData.length > 0) {
        setSelectedBrandId(brandsData[0].id);
        setSelectedBotBrandId(brandsData[0].id);
      }
    }

    const { data: allProfiles } = await supabase.from('profiles').select('*');
    if (allProfiles) {
      setCustomers(allProfiles);
      setStaff(allProfiles.filter(p => p.role === 'admin' || p.role === 'staff'));
      setSelectedCustomerId(user.id);
      setSelectedBotCustomerId(user.id);
    }

    const { data: pData } = await supabase.from('paper_catalog').select('*').order('name');
    const { data: mData } = await supabase.from('pricing_components').select('*').in('type', ['press_digital', 'press_offset']);
    const { data: fData } = await supabase.from('pricing_components').select('*').eq('type', 'finishing').order('name');
    const { data: mailData } = await supabase.from('pricing_components').select('*').eq('type', 'mailing');
    if (pData) setPapers(pData as any);
    if (mData) setPresses(mData as any);
    if (fData) setFinishing(fData as any);
    if (mailData) setMailing(mailData as any);

    const { data: qData } = await supabase.from('workflow_queues').select('*').order('rank');
    if (qData) setWorkflowOptions(qData);

    setLoading(false);
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

  // --- FILE + CART LOGIC ---
  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCurrentFile(file);
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
      if (!jobTitle) setJobTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };

  const resetForm = () => {
    setCurrentFile(null);
    setJobTitle('');
    setJobQty('');
    setJobSize('');
    setJobNotes('');
    if (stockLibrary.length > 0) setSelectedStockId(stockLibrary[0].name);
    setCustomStockValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditingItemId(null);
  };

  const handleAddToCart = () => {
    if (!currentFile) return alert('Please upload a file.');
    if (!jobQty) return alert('Please enter quantity.');

    let finalStock = selectedStockId;
    if (selectedStockId === 'custom') {
      if (!customStockValue.trim()) return alert('Please enter custom paper details.');
      finalStock = customStockValue;
    }

    const id = editingItemId || Math.random().toString(36);
    const newItem: CartItem = {
      id,
      file: currentFile,
      title: jobTitle,
      quantity: parseInt(jobQty),
      size: jobSize || 'N/A',
      notes: jobNotes,
      paper_stock: finalStock,
    };

    if (editingItemId) {
      setCart(cart.map((item) => item.id === editingItemId ? newItem : item));
    } else {
      setCart([...cart, newItem]);
    }
    resetForm();
  };

  const handleRemoveFromCart = (id: string) => setCart(cart.filter((item) => item.id !== id));

  const handleEditCartItem = (id: string) => {
    const item = cart.find((c) => c.id === id);
    if (!item) return;
    setEditingItemId(id);
    setCurrentFile(item.file);
    setJobTitle(item.title);
    setJobQty(item.quantity.toString());
    setJobSize(item.size === 'N/A' ? '' : item.size);
    setJobNotes(item.notes);

    const stockMatch = stockLibrary.find((s) => s.name === item.paper_stock);
    if (stockMatch) {
      setSelectedStockId(stockMatch.name);
      setCustomStockValue('');
    } else {
      setSelectedStockId('custom');
      setCustomStockValue(item.paper_stock);
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('Cart is empty.');
    if (isNewCustomer && !newCustomerEmail.includes('@')) return alert('Invalid email.');

    setIsUploading(true);
    try {
      let targetUserId = user?.id;
      let targetEmail = user?.email;
      const isInternal = role === 'admin' || role === 'staff';

      if (isInternal) {
        if (isNewCustomer) {
          targetUserId = null;
          targetEmail = newCustomerEmail;
        } else if (selectedCustomerId) {
          targetUserId = selectedCustomerId;
          const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
          targetEmail = selectedCustomer?.email || '';
        }
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: targetUserId,
          status: 'New',
          brand_id: selectedBrandId,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const jobTitleText = cart.length === 1 ? cart[0].title : `Order #${newOrder.id.substring(0, 6).toUpperCase()}`;
      const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);

      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          order_id: newOrder.id,
          user_id: targetUserId,
          guest_email: isNewCustomer ? targetEmail : null,
          title: jobTitleText,
          quantity: totalQty,
          status: 'Pending Review',
          created_by: user.id,
        })
        .select()
        .single();
      if (jobError) throw jobError;

      for (const item of cart) {
        const { data: newItem, error: itemError } = await supabase
          .from('job_items')
          .insert({
            job_id: newJob.id,
            description: item.title,
            quantity: item.quantity,
            paper_stock: item.paper_stock,
            size: item.size,
            internal_notes: item.notes,
            status: 'Pending',
          })
          .select()
          .single();
        if (itemError) throw itemError;

        const fileExt = item.file.name.split('.').pop();
        const fileName = `${newJob.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: fileData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, item.file);
        if (uploadError) console.error('File upload failed for ' + item.title, uploadError);

        if (fileData) {
          await supabase.from('job_assets').insert({
            job_id: newJob.id,
            job_item_id: newItem.id,
            uploader_id: user.id,
            file_url: fileData.path,
            file_name: item.file.name,
            asset_type: 'source',
            status: 'pending',
          });
        }

        await supabase.from('job_item_steps').insert({
          job_item_id: newItem.id,
          step_name: 'Prepress',
          status: 'Pending',
          is_internal: true,
        });
      }

      const brandName = brandList.find((b) => b.id === selectedBrandId)?.name || 'PrintHQ';
      if (targetEmail && newJob) {
        await sendOrderConfirmation(targetEmail, newJob.id, `${cart.length} Item(s) from ${brandName}`);
      }

      alert('✅ Order Submitted Successfully!');
      setCart([]);
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating order. ' + (error as any)?.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- BOT INTAKE HELPERS ---
  const papersWithOverrides = useMemo(
    () => applyOverridesToList(papers, customerOverrides, { templateKey, componentType: 'paper' }),
    [papers, customerOverrides, templateKey]
  );
  const pressesWithOverrides = useMemo(
    () => applyOverridesToList(presses, customerOverrides, { templateKey, componentType: 'press' }),
    [presses, customerOverrides, templateKey]
  );
  const finishingWithOverrides = useMemo(
    () => applyOverridesToList(finishing, customerOverrides, { templateKey, componentType: 'finishing' }),
    [finishing, customerOverrides, templateKey]
  );
  const mailingWithOverrides = useMemo(
    () => applyOverridesToList(mailing, customerOverrides, { templateKey, componentType: 'mailing' }),
    [mailing, customerOverrides, templateKey]
  );

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

    const proposals = calculateProposals(
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

    const winnerRoute = proposals[0]?.winner;
    if (!winnerRoute) return null;
    return { ...winnerRoute, product: productMeta } as any;
  };

  const handleEstimate = () => {
    setIsBotEstimating(true);
    const quantities = parseQuantityList(qtyInput);
    const results: { quantity: number; winner: any }[] = [];
    quantities.forEach((q) => {
      const winner = calculateWinner(q);
      if (winner) results.push({ quantity: q, winner });
    });
    results.sort((a, b) => a.quantity - b.quantity);
    setProposals(results);
    setSelectedQuantity(results[0]?.quantity || null);
    setIsBotEstimating(false);
  };

  const handleCreateJob = async () => {
    if (isCreatingJob) return;
    if (!selectedQuantity) return alert('Select a quantity to create the job.');
    const chosen = proposals.find((p) => p.quantity === selectedQuantity);
    if (!chosen?.winner) return alert('Run estimator and pick a quantity first.');
    setIsCreatingJob(true);
    setStatusNote('');
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ user_id: selectedBotCustomerId || null, status: 'New', brand_id: selectedBotBrandId || null })
        .select()
        .single();
      if (orderError || !order) throw orderError;

      const combinedPaperStock = productKey === 'booklet'
        ? `Cover: ${coverPaperName || insidePaperName || chosen.winner.paperName} / Inside: ${insidePaperName || chosen.winner.paperName}`
        : chosen.winner.paperName || null;
      const productNote = `Product: ${productMeta.customLabel || productMeta.label} ${productMeta.sizeLabel}${productMeta.pageCount ? ` • ${productMeta.pageCount} pages` : ''}${productMeta.coverStock ? ` • Cover ${productMeta.coverStock}` : ''}${productMeta.insideStock ? ` • Inside ${productMeta.insideStock}` : ''}`;

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          order_id: order.id,
          user_id: selectedBotCustomerId || null,
          guest_email: selectedBotCustomerId ? null : (contactEmail || null),
          title: itemTitle || productMeta.customLabel || productMeta.label || 'Bot Intake Job',
          quantity: selectedQuantity,
          status: 'Pending Review',
          created_by: user?.id || null,
          notes: [transcript, productNote].filter(Boolean).join('\n'),
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
          description: itemTitle || productMeta.customLabel || productMeta.label || 'Bot Intake Item',
          quantity: selectedQuantity,
          paper_stock: combinedPaperStock,
          size: `${finishW}x${finishH}`,
          internal_notes: [transcript, productNote].filter(Boolean).join('\n'),
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
            uploader_id: user?.id || null,
            file_url: uploaded.path,
            file_name: file.name,
            asset_type: 'source',
            status: 'pending',
          });
        }
      }

      await supabase.from('job_logs').insert({
        job_id: job.id,
        user_id: user?.id || null,
        action: 'Bot Intake',
        details: `Bot intake created job with ${selectedQuantity} qty (${chosen.winner.method}).`,
        job_item_id: jobItem.id,
      });

      await supabase.from('messages').insert({
        job_id: job.id,
        user_id: user?.id || null,
        content: `Bot Intake Summary: ${transcript}
Quantity: ${selectedQuantity}
Route: ${chosen.winner.method}
Price: ${formatCurrency(chosen.winner.totalPrice)}`,
      });

      setStatusNote('Job created and notifications sent.');
      setAttachments([]);
      setProposals([]);
      setSelectedQuantity(null);
      setSelectedFinishingIds([]);
      setSelectedPaperId(papersWithOverrides[0]?.id || '');
    } catch (err: any) {
      console.error('bot intake create failed', err?.message || err);
      alert('Failed to create job from bot intake.');
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachments(Array.from(files));
    setIsDragging(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isInternal = role === 'admin' || role === 'staff';

  const paperOptions = papersWithOverrides.map((p) => {
    const perSheet = paperSellPerSheet(p);
    const overrideTag = p.price_override != null || p.price_amount != null;
    const suffix = overrideTag ? 'override' : `${pricingProfile} profile`;
    return { id: p.id, label: `${p.name} (${formatCurrency(perSheet)}/sht • ${suffix}${p.__override ? ' • customer' : ''})` };
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

      <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-20 items-center px-8 border-b border-gray-100">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center mr-3"><span className="text-white font-bold text-xs">PHQ</span></div>
          <span className="font-bold text-lg tracking-tight">PrintHQ</span>
          {isInternal && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded">Intake</span>}
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem icon={<LayoutDashboard size={20} />} label="Shop Floor" href="/dashboard" />
          <NavItem icon={<MessageSquare size={20} />} label="Intake" href="/intake" active />
          <NavItem icon={<Settings size={20} />} label="Settings" href="/dashboard/settings" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"><LogOut size={20} className="mr-3" /> Sign out</button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-12 space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><ArrowRightCircle size={14}/> Intake & New Quotes</p>
              <h1 className="text-3xl font-bold text-gray-900">Capture → Quote → Create</h1>
              <p className="text-gray-500">CSR chat, estimator, and quick order creation in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="#bot-intake" className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-bold hover:border-black">+ New Quote</Link>
              <Link href="#quick-order" className="px-4 py-2 rounded-full bg-black text-white text-sm font-bold hover:bg-gray-800">+ Quick Order</Link>
              <Link href="#bot-intake" className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-bold hover:border-black">+ Internal Job</Link>
              <Link href="#csr" className="px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-sm font-bold">CSR Chat</Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* QUICK ORDER BUILDER */}
              <section id="quick-order" className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2"><Scissors size={14}/> Quick Order</p>
                    <h3 className="text-lg font-bold text-gray-900">Group multiple jobs into one ticket</h3>
                  </div>
                  <div className="text-xs text-gray-500">{cart.length} item(s)</div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isInternal && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold uppercase text-yellow-800 flex items-center">
                            <User size={14} className="mr-1"/> Customer
                          </label>
                          <button type="button" onClick={() => setIsNewCustomer(!isNewCustomer)} className="text-xs font-bold text-blue-600 hover:underline">
                            {isNewCustomer ? 'Select Existing' : '+ New Guest'}
                          </button>
                        </div>
                        {isNewCustomer ? (
                          <input type="email" placeholder="client@email.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm outline-none" />
                        ) : (
                          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm outline-none">
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.email} {c.role !== 'customer' ? `(${c.role.toUpperCase()})` : ''}</option>)}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Company / Brand</label>
                      <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm outline-none font-bold">
                        {brandList.length > 0 ? (
                          brandList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                        ) : (
                          <option>No Brands Found</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 text-xs font-bold uppercase text-gray-500 flex justify-between">
                        <span>Items in Order ({cart.length})</span>
                        <span className="flex items-center gap-2">
                          <span>Total</span>
                          <span className="px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 font-mono">
                            {cart.reduce((acc, item) => acc + (item.quantity || 0), 0).toLocaleString()}
                          </span>
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {cart.map((item) => (
                          <div key={item.id} className={`p-3 bg-white flex justify-between items-center ${editingItemId === item.id ? 'bg-blue-50/80' : ''}`}>
                            <div className="flex items-center overflow-hidden">
                              <FileText size={16} className="text-blue-500 mr-3 flex-shrink-0" />
                              <div className="truncate">
                                <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                                <p className="text-xs text-gray-400">{item.size} • {item.paper_stock}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-gray-100 text-gray-600">{item.quantity.toLocaleString()} qty</span>
                              <button onClick={() => handleEditCartItem(item.id)} className={`text-gray-400 hover:text-blue-600 px-2 py-1 rounded ${editingItemId === item.id ? 'bg-blue-100 text-blue-800 border border-blue-200' : ''}`}>Edit</button>
                              <button onClick={() => handleRemoveFromCart(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
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
                      {!currentFile ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={triggerFilePicker}
                          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                            ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}
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

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                          <input type="text" placeholder="Item Title (e.g. Business Cards)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                        </div>
                        <div>
                          <input type="number" placeholder="Qty" value={jobQty} onChange={(e) => setJobQty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                        </div>
                        <div className="col-span-2">
                          <input type="text" placeholder="Size (e.g. 8.5x11)" value={jobSize} onChange={(e) => setJobSize(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <select
                          value={selectedStockId}
                          onChange={(e) => setSelectedStockId(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black"
                        >
                          {stockLibrary.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
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

                      <textarea
                        value={jobNotes}
                        onChange={(e) => setJobNotes(e.target.value)}
                        placeholder="Internal notes"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />

                      <button type="button" onClick={handleAddToCart} disabled={!currentFile || !jobQty} className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${!currentFile || !jobQty ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-md'}`}>
                        {editingItemId ? 'Save Item' : (!currentFile ? 'Select a File first...' : !jobQty ? 'Enter Quantity...' : '+ Add Item to List')}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={handleSubmitOrder} disabled={isUploading || cart.length === 0} className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center shadow-lg">
                      {isUploading ? <Loader2 className="animate-spin mr-2" /> : <ShoppingCart className="mr-2" size={18} />}
                      Submit Order ({cart.length} Items)
                    </button>
                  </div>
                </div>
              </section>

              {/* BOT INTAKE + ESTIMATOR */}
              <section id="bot-intake" className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2"><Bot size={14}/> Bot Intake</p>
                    <h3 className="text-lg font-bold text-gray-900">Convert chat ➜ estimator ➜ job</h3>
                  </div>
                  <div className="text-xs text-gray-500">{customerOverrides.length} override(s) active</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  <div className="space-y-4">
                    <label className="block text-xs font-bold uppercase text-gray-500">Conversation Transcript</label>
                    <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full border rounded-xl p-3 h-36 text-sm" placeholder="Paste the chat with the bot or customer..." />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500">Contact Email</label>
                        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="guest@email.com" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500">Contact Name</label>
                        <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Optional" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500">Brand</label>
                        <select value={selectedBotBrandId} onChange={(e) => setSelectedBotBrandId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                          {brandList.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500">Customer</label>
                        <select value={selectedBotCustomerId} onChange={(e) => setSelectedBotCustomerId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">Guest (no account)</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.first_name || c.company || c.email}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-500">Template / SKU (optional)</label>
                      <input value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="bc-template-16pt" />
                    </div>

                    <div onDragOver={(e) => {e.preventDefault(); setIsDragging(true);}} onDragLeave={(e) => {e.preventDefault(); setIsDragging(false);}} onDrop={(e) => {e.preventDefault(); handleFileDrop(e.dataTransfer.files);}} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}>
                      <input type="file" multiple className="hidden" id="bot-intake-files" onChange={(e) => handleFileDrop(e.target.files)} />
                      <label htmlFor="bot-intake-files" className="flex flex-col items-center text-sm text-gray-600">
                        <Paperclip className="mb-2" size={18}/> Attach files or drop them here
                      </label>
                    </div>
                    {attachments.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y">
                        {attachments.map((f, idx) => (
                          <div key={idx} className="px-3 py-2 text-sm flex justify-between items-center">
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
                          {PRODUCT_TEMPLATES.map((t) => (
                            <option key={t.key} value={t.key}>{t.name}</option>
                          ))}
                        </select>
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
                              const opt = getTemplate(productKey).sizes.find((s) => s.label === val);
                              if (opt) {
                                setFinishW(opt.width);
                                setFinishH(opt.height);
                              }
                            }
                          }}
                          className="w-full border rounded px-3 py-2 text-sm bg-white"
                        >
                          {getTemplate(productKey).sizes.map((s) => (
                            <option key={s.label} value={s.label}>{s.label}</option>
                          ))}
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
                        <div className="col-span-2 grid grid-cols-2 gap-2">
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
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500">Quantity Breaks</label>
                        <input value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="250,500,1000" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500">Pricing Profile</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['wholesale','competitive','retail'] as PricingProfileKey[]).map((k) => (
                            <button key={k} type="button" onClick={() => setPricingProfile(k)} className={`border rounded-lg px-2 py-2 text-sm font-bold ${pricingProfile === k ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:border-black'}`}>
                              <div className="flex items-center justify-between">
                                <span className="capitalize">{k}</span>
                                <span className="text-[10px] font-mono">×{PRICING_PROFILES[k].toFixed(2)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-500">Paper</label>
                      <select value={productKey === 'booklet' ? insidePaperId : selectedPaperId} onChange={(e) => productKey === 'booklet' ? setInsidePaperId(e.target.value) : setSelectedPaperId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                        {paperOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                      {productKey === 'booklet' && coverPaperId && (
                        <p className="text-[11px] text-gray-500 mt-1">Cover: {coverPaperName || 'Select'} · Inside: {insidePaperName || 'Select'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-500">Finishing</label>
                      <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                        {finishingWithOverrides.map((f) => (
                          <label key={f.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={selectedFinishingIds.includes(f.id)} onChange={(e) => {
                              if (e.target.checked) setSelectedFinishingIds([...selectedFinishingIds, f.id]);
                              else setSelectedFinishingIds(selectedFinishingIds.filter((id) => id !== f.id));
                            }} />
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
                          return (
                            <option key={m.id} value={m.id}>{m.name} ({formatCurrency(rate)}/{unitLabel}{m.__override ? ' • override' : ''})</option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={handleEstimate} disabled={isBotEstimating} className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-bold hover:border-black flex items-center justify-center gap-2">
                        {isBotEstimating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} Run Estimator
                      </button>
                      <button onClick={handleCreateJob} disabled={isCreatingJob || !selectedQuantity} className="flex-1 bg-black text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-60">
                        {isCreatingJob ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Create Job
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
              </section>
            </div>

            {/* CSR CHAT */}
            <div id="csr" className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2"><MessageSquare size={14}/> CSR Chat</p>
                    <h3 className="text-lg font-bold text-gray-900">Live job & quote triage</h3>
                  </div>
                </div>
                <div className="p-4">
                  <CsrChatPanel customers={customers} brandList={brandList} currentUser={user} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, href = '#' }: { icon: any, label: string, active?: boolean, href?: string }) {
  return (
    <Link href={href} className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
      <span className={`${active ? 'text-black' : 'text-gray-400'} mr-3`}>{icon}</span>
      {label}
    </Link>
  );
}
