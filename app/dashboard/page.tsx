'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, FileText, Settings, LogOut, LayoutDashboard, 
  Loader2, X, Scissors, User, Trash2, Filter, ArrowRightCircle, 
  Briefcase, Building2, Plus, ShoppingCart, Clock, ChevronRight, Layers, Ruler,
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Calculator, MessageSquare, Send, Sparkles, Paperclip, Bot, Rocket,
  RotateCcw, Star, PlusCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useMemo } from 'react';
import React from 'react';
import Link from 'next/link';
// Use the new name and the @ alias so it always finds the right spot
import { sendOrderConfirmation } from '../server-actions';
import ItemDetailDrawer from '@/components/ItemDetailDrawer';
import CustomerPortalShell from '@/components/CustomerPortalShell';
import { applyOverridesToList, parseQuantityList, formatCurrency } from '@/utils/pricing';
import { PRODUCT_TEMPLATES, getDefaultSizeForTemplate, getTemplate, ProductTemplateKey } from '@/utils/productTemplates';
import { applyPricingProfileToRoute, calculateProposals, PricingProfileKey, PRICING_PROFILES } from '@/lib/estimator';
import { getCustomerClassDefaultProfile, normalizeCustomerClass } from '@/lib/customerClass';
import { filterCustomerVisibleJobs, normalizeStatus as normalizeJobStatus } from '@/lib/customerJobs';

// --- ROUTING VOCABULARY ---
const DEFAULT_ROUTE_LIBRARY: { group: string; steps: string[] }[] = [
  { group: 'Prepress', steps: ['Prepress', 'Proof'] },
  { group: 'Press', steps: ['Digital Press', 'Offset Press', 'Wide Format'] },
  { group: 'Bindery', steps: ['Cut/Trim', 'Score', 'Fold', 'Perf', 'Booklet Stitch', 'Drill', 'Lamination', 'Shrinkwrap / Kitting'] },
  { group: 'Mailing', steps: ['Addressing', 'Tabbing', 'Mail Prep'] },
  { group: 'QC & Ship', steps: ['QC', 'Ready for Pickup/Ship'] },
];

// --- TYPES ---
type Job = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  due_date?: string; 
  quantity: number;
  size?: string;
  notes: string;
  user_id: string;
  paper_stock?: string;
  guest_email?: string;
  current_step?: string;
  next_step_id?: string;
  assigned_to?: string; 
  csr_name?: string; 
  brand?: string; 
  orders?: { brands?: { name: string } }; 
  order_id?: string; 
  job_items?: any[];
};

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
  file: File | null;
  title: string;
  quantity: number;
  size: string;
  notes: string;
  paper_stock: string;
  product_key: ProductTemplateKey | string;
  product_name: string;
  finishing?: string[];
  mailing?: boolean;
  mailingNotes?: string;
  waitingOnArt?: boolean;
  source_job_id?: string;
  route_steps: string[];
  artworkStatus: 'Uploaded' | 'Waiting on Art' | 'Reuse Art';
};

type PaperStock = {
    id: string;
    name: string;
};

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
    
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]); 
  const [stockLibrary, setStockLibrary] = useState<PaperStock[]>([]);
  const [brandList, setBrandList] = useState<Brand[]>([]);
    
  const [departmentTabs, setDepartmentTabs] = useState<string[]>(['My Queue', 'All']);
  const [activeTab, setActiveTab] = useState('All'); 
    
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [startMode, setStartMode] = useState<'new' | 'repeat-exact' | 'repeat-edit' | 'template'>('new');
  const [selectedRepeatJobId, setSelectedRepeatJobId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentTemplates, setRecentTemplates] = useState<ProductTemplateKey[]>([]);
    
  // --- CART STATE ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');

  const [selectedProductKey, setSelectedProductKey] = useState<ProductTemplateKey | string>('postcard');
  const [selectedSizeLabel, setSelectedSizeLabel] = useState<string>('');
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [waitingOnArt, setWaitingOnArt] = useState<boolean>(false);
  
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [jobSize, setJobSize] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [routeStepsDraft, setRouteStepsDraft] = useState<string[]>([]);
  const [routeDraftLocked, setRouteDraftLocked] = useState(false);
  const [routePresets, setRoutePresets] = useState<Record<string, string[]>>({});
  const [routeStepPicker, setRouteStepPicker] = useState('');
  const [routeEditItemId, setRouteEditItemId] = useState<string | null>(null);
  const [routeEditDraft, setRouteEditDraft] = useState<string[]>([]);
  const [routeEditPicker, setRouteEditPicker] = useState('');
    
  // PAPER STOCK LOGIC
  const [selectedStockId, setSelectedStockId] = useState('');
  const [customStockValue, setCustomStockValue] = useState('');
    
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
    
  // --- ITEM PRODUCTION STATE ---
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [jobAssets, setJobAssets] = useState<any[]>([]);
  const [jobLogs, setJobLogs] = useState<any[]>([]);
    
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'timeline', direction: 'desc' });


  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const selectedTemplate = useMemo(() => getTemplate(selectedProductKey as ProductTemplateKey, PRODUCT_TEMPLATES), [selectedProductKey]);
  const sizeOptions = useMemo(() => selectedTemplate?.sizes || [], [selectedTemplate]);
  const recentJobs = useMemo(() => (jobs || []).slice(0, 6), [jobs]);
  const favoriteTemplates = useMemo(() => PRODUCT_TEMPLATES.slice(0, 4), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('phq-recent-templates');
      if (stored) setRecentTemplates(JSON.parse(stored));
    } catch (err) {
      console.warn('recent template cache missing', err);
    }
  }, []);

  const rememberTemplate = (key: ProductTemplateKey | string) => {
    if (!key) return;
    setRecentTemplates((prev) => {
      const next = [key as ProductTemplateKey, ...prev.filter((k) => k !== key)];
      return next.slice(0, 6);
    });
    try {
      const stash = [key as ProductTemplateKey, ...recentTemplates.filter((k) => k !== key)].slice(0, 6);
      localStorage.setItem('phq-recent-templates', JSON.stringify(stash));
    } catch (err) {
      console.warn('could not persist template cache', err);
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      const defaultSize = selectedTemplate.sizes[0];
      setSelectedSizeLabel(defaultSize?.label || '');
      setJobSize(defaultSize?.label || '');
      setCustomWidth('');
      setCustomHeight('');
    }
  }, [selectedTemplate]);

  useEffect(() => {
    setRouteDraftLocked(false);
  }, [selectedTemplate?.key]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedSizeLabel && selectedSizeLabel !== 'custom') {
      setJobSize(selectedSizeLabel);
    }
  }, [selectedSizeLabel]);

  const buildRoutePreview = (template: any, finishing: string[] = [], mailing?: boolean) => {
    const steps: string[] = ['Prepress'];
    const pressStep = template?.key === 'wide_format' ? 'Wide Format Press' : 'Press';
    steps.push(pressStep);
    if (finishing && finishing.length > 0) steps.push('Bindery / Finishing');
    if (mailing) steps.push('Mail Prep');
    steps.push('QC');
    steps.push('Ready for Pickup/Ship');
    return steps;
  };

  const routeVocabulary = useMemo(() => {
    if (workflowOptions && workflowOptions.length > 0) {
      return workflowOptions
        .map((queue) => ({
          group: queue.queue_name || queue.name || 'Steps',
          steps: Array.isArray(queue.steps) && queue.steps.length ? queue.steps : (queue.name ? [queue.name] : []),
        }))
        .filter((g) => g.steps.length);
    }
    return DEFAULT_ROUTE_LIBRARY;
  }, [workflowOptions]);

  const defaultRouteForDraft = useMemo(() => {
    const presetKey = (selectedTemplate?.key as string) || '';
    const preset = presetKey && routePresets[presetKey];
    if (preset && preset.length) return preset;
    return buildRoutePreview(selectedTemplate, fieldValues.finishing || [], fieldValues.mailing);
  }, [selectedTemplate, fieldValues?.finishing, fieldValues?.mailing, routePresets]);

  useEffect(() => {
    if (!routeDraftLocked) {
      setRouteStepsDraft(defaultRouteForDraft);
    }
  }, [defaultRouteForDraft, routeDraftLocked]);

  const guessTemplateKeyFromText = (text: string): ProductTemplateKey => {
    const lower = (text || '').toLowerCase();
    if (lower.includes('postcard')) return 'postcard';
    if (lower.includes('flyer') || lower.includes('sell sheet')) return 'flyer';
    if (lower.includes('brochure')) return 'brochure';
    if (lower.includes('booklet') || lower.includes('catalog')) return 'booklet';
    if (lower.includes('envelope')) return 'envelope';
    if (lower.includes('banner') || lower.includes('sign') || lower.includes('poster') || lower.includes('wide')) return 'wide_format';
    return 'other';
  };

  const extractRouteFromItem = (item: any) => (item?.job_item_steps || []).map((s: any) => s.step_name).filter(Boolean);

  const prefillFromJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || !(job.job_items?.length)) {
      alert('Job has no items to repeat.');
      return;
    }
    const item = job.job_items[0];
    setStartMode('repeat-edit');
    setSelectedRepeatJobId(job.id);
    setCurrentFile(null);
    setWaitingOnArt(true);
    setJobTitle(item.description || job.title || 'Repeat Item');
    setJobQty(item.quantity ? String(item.quantity) : '');
    if (item.size) {
      setJobSize(item.size);
      setSelectedSizeLabel(item.size);
    }
    const guessedKey = guessTemplateKeyFromText(`${item.description || ''} ${job.title || ''}`);
    setSelectedProductKey(guessedKey);
    setJobNotes([`Repeat of job #${job.id.substring(0, 6).toUpperCase()}`, item.internal_notes, job.notes].filter(Boolean).join('\n'));
    const routeFromHistory = extractRouteFromItem(item);
    if (routeFromHistory.length) {
      setRouteStepsDraft(routeFromHistory);
      setRouteDraftLocked(true);
    } else {
      setRouteDraftLocked(false);
      setRouteStepsDraft(defaultRouteForDraft);
    }
  };

  const repeatExactJobToCart = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || !(job.job_items?.length)) {
      alert('Job has no items to repeat.');
      return;
    }
    const cloned = job.job_items.map((item: any) => ({
      id: Math.random().toString(36),
      file: null,
      title: item.description || job.title || 'Repeat Item',
      quantity: item.quantity || 0,
      size: item.size || job.size || 'TBD',
      notes: [`Repeat of job #${job.id.substring(0, 6).toUpperCase()} (${job.title || 'Job'})`, item.internal_notes].filter(Boolean).join('\n'),
      paper_stock: item.paper_stock || 'TBD',
      product_key: 'repeat',
      product_name: item.description || 'Repeat Item',
      finishing: item.finishing || [],
      mailing: false,
      mailingNotes: undefined,
      waitingOnArt: true,
      source_job_id: job.id,
      route_steps: extractRouteFromItem(item),
      artworkStatus: 'Reuse Art',
    } as CartItem));
    if (!cloned.length) return;
    setCart((prev) => [...prev, ...cloned]);
    setStartMode('new');
    setSelectedRepeatJobId(job.id);
  };

  const startModes = [
    { key: 'new', label: 'New Job', helper: 'Start fresh with a product-first flow.' },
    { key: 'repeat-exact', label: 'Repeat as-is', helper: 'Re-create a prior job with the same specs.' },
    { key: 'repeat-edit', label: 'Repeat with tweaks', helper: 'Pull specs from history, then adjust.' },
    { key: 'template', label: 'Use as template', helper: 'Prefill from a prior job and change everything else.' },
  ] as const;

  const fetchDashboardData = async () => {
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

    // Redirect Bindery users to their specialized dashboard
    if (userRole === 'bindery') {
      router.push('/bindery');
      return;
    }

    const isInternal = userRole === 'admin' || userRole === 'staff';

    let jobQuery = supabase
        .from('jobs')
        .select('*, orders(brands(name)), job_items(*, job_item_steps(*))') 
        .order('created_at', { ascending: false });


    // FIX: Match by ID *OR* Email (Retroactive Guest Matching)
    if (!isInternal) {
      if (user.email) {
        jobQuery = jobQuery.or(`user_id.eq.${user.id},guest_email.eq.${user.email}`);
      } else {
        jobQuery = jobQuery.eq('user_id', user.id);
      }
    }

    const { data: jobsData } = await jobQuery;

    if (jobsData) {
      setJobs(jobsData);
    }

    const { data: stockData } = await supabase.from('paper_stocks').select('*').order('name');
    if (stockData) {
        setStockLibrary(stockData);
        if (stockData.length > 0) setSelectedStockId(stockData[0].name);
    }

    const { data: brandsData } = await supabase.from('brands').select('*');
    if (brandsData) {
        setBrandList(brandsData);
        if (brandsData.length > 0) setSelectedBrandId(brandsData[0].id);
    }

    if (isInternal) {
      const { data: dbDepts } = await supabase.from('departments').select('name').order('sort_order');
      const dynamicTabs = dbDepts ? dbDepts.map(d => d.name) : [];
      setDepartmentTabs(['My Queue', 'All', ...dynamicTabs]);

      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles) {
        setCustomers(allProfiles);
        setStaff(allProfiles.filter(p => p.role === 'admin' || p.role === 'staff'));
      }
      setSelectedCustomerId(user.id);
      
      if (profile?.department && dynamicTabs.includes(profile.department)) {
        setActiveTab(profile.department);
      } else {
        setActiveTab('My Queue'); 
      }

      // Fetch additional production data
      const { data: qData } = await supabase.from('workflow_queues').select('*').order('rank');
      if (qData) setWorkflowOptions(qData);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleAssignJob = async (jobId: string, staffId: string) => {
    if (!staffId) return;
    const staffMember = staff.find(s => s.id === staffId);
    const staffName = staffMember ? (staffMember.first_name || staffMember.email) : 'Staff';
    setJobs(jobs.map(j => j.id === jobId ? { ...j, assigned_to: staffId, csr_name: staffName } : j));
    await supabase.from('jobs').update({ assigned_to: staffId, csr_name: staffName }).eq('id', jobId);
  };

  // --- PRODUCTION HANDLERS ---
  const handleOpenItemDrawer = async (itemId: string) => {
    setEditingItemId(itemId);
    // Fetch assets and logs for this item
    const item = jobs.flatMap(j => j.job_items || []).find(i => i.id === itemId);
    if (!item) return;

    const { data: assets } = await supabase.from('job_assets').select('*, profiles(email)').eq('job_id', item.job_id).order('created_at', { ascending: false });
    if (assets) setJobAssets(assets);

    const { data: logs } = await supabase.from('job_logs').select('*, profiles(email)').eq('job_id', item.job_id).order('created_at', { ascending: false });
    if (logs) setJobLogs(logs);
  };

  const handleCompleteItemStep = async (item: any, currentStepName: string) => {
    if (!confirm(`Mark "${currentStepName}" as DONE for ${item.description}?`)) return;

    // 1. Find the step record
    const step = item.job_item_steps?.find((s: any) => s.step_name === currentStepName && s.status !== 'Completed');
    if (!step) return alert("Step not found or already completed.");

    // 2. Update the step to Completed
    const { error: stepErr } = await supabase.from('job_item_steps').update({ status: 'Completed' }).eq('id', step.id);
    if (stepErr) return alert(stepErr.message);

    // 3. Determine next status
    const allSteps = item.job_item_steps || [];
    // Sort steps by created_at to determine sequence (matching JobInteractiveView logic)
    const sortedSteps = [...allSteps].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Find the next step after the one we just completed
    const currentIndex = sortedSteps.findIndex(s => s.id === step.id);
    const nextStep = sortedSteps[currentIndex + 1];
    
    const newStatus = nextStep ? nextStep.step_name : 'Completed';

    // 4. Update parent item status
    const { error: itemErr } = await supabase.from('job_items').update({ status: newStatus }).eq('id', item.id);
    if (itemErr) return alert(itemErr.message);

    // 5. Log activity
    await supabase.from('job_logs').insert({
        job_id: item.job_id,
        user_id: user.id,
        action: 'Step Completed',
        details: `Completed ${currentStepName}. Next: ${newStatus}`,
        job_item_id: item.id
    });

    // 6. Refresh data
    fetchDashboardData();
  };

  const handleUpdateItem = async (itemId: string, updates: any) => {
      const { error } = await supabase.from('job_items').update(updates).eq('id', itemId);
      if (error) alert(error.message);
      fetchDashboardData();
  };

  const handleAddStep = async (itemId: string, stepName: string, isInternal: boolean) => {
      const { error } = await supabase.from('job_item_steps').insert({ job_item_id: itemId, step_name: stepName, status: 'Pending', is_internal: isInternal });
      if (error) alert(error.message);
      fetchDashboardData();
  };

  const handleToggleStep = async (stepId: string, currentStatus: string) => {
      const statusOptions = ['Pending', 'Completed'];
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      await supabase.from('job_item_steps').update({ status: newStatus }).eq('id', stepId);
      // We should also sync the item status here for consistency
      fetchDashboardData();
  };

  const handleDeleteStep = async (stepId: string) => {
      await supabase.from('job_item_steps').delete().eq('id', stepId);
      fetchDashboardData();
  };

  const onItemUpload = async (file: File, itemId: string) => {
      const item = jobs.flatMap(j => j.job_items || []).find(i => i.id === itemId);
      if (!item) return;
      const storageName = `${item.job_id}-item-${itemId.substring(0,4)}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('uploads').upload(storageName, file);
      if (uploadError) throw uploadError;

      await supabase.from('job_assets').insert({
          job_id: item.job_id, job_item_id: itemId, uploader_id: user.id, file_url: uploadData.path,
          file_name: file.name, asset_type: 'source', status: 'pending'
      });
      fetchDashboardData();
  };


  // --- CART HANDLERS ---
  const handleOpenNewOrder = () => {
    setCart([]); 
    resetForm();
    setIsNewCustomer(false);
    setNewCustomerEmail('');
    setSelectedProductKey('postcard');
    setShowModal(true);
  };

  const resetForm = () => {
    setCurrentFile(null);
    setWaitingOnArt(false);
    setJobTitle('');
    setJobQty('');
    setJobSize('');
    setJobNotes('');
    setRouteDraftLocked(false);
    setRouteStepsDraft(defaultRouteForDraft);
    setRouteStepPicker('');
    if (stockLibrary.length > 0) setSelectedStockId(stockLibrary[0].name);
    setCustomStockValue('');
    setFieldValues({});
    const defaultSize = selectedTemplate?.sizes?.[0];
    setSelectedSizeLabel(defaultSize?.label || '');
    setCustomWidth('');
    setCustomHeight('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- FILE HANDLING (CLICK & DRAG/DROP) ---
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

  const reorderSteps = (steps: string[], index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return newSteps;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    return newSteps;
  };

  const addRouteStep = (step: string) => {
    if (!step) return;
    setRouteDraftLocked(true);
    setRouteStepsDraft(prev => [...prev, step]);
    setRouteStepPicker('');
  };

  const removeRouteStep = (index: number) => {
    setRouteDraftLocked(true);
    setRouteStepsDraft(prev => prev.filter((_, i) => i !== index));
  };

  const moveRouteStep = (index: number, direction: 'up' | 'down') => {
    setRouteDraftLocked(true);
    setRouteStepsDraft(prev => reorderSteps(prev, index, direction));
  };

  const resetRouteDraft = () => {
    setRouteDraftLocked(false);
    setRouteStepsDraft(defaultRouteForDraft);
    setRouteStepPicker('');
  };

  const saveRoutePresetForProduct = () => {
    if (!selectedTemplate?.key) return;
    setRoutePresets(prev => ({ ...prev, [selectedTemplate.key]: routeStepsDraft }));
  };

  const openRouteEditorForItem = (item: CartItem) => {
    setRouteEditItemId(item.id);
    const template = getTemplate(item.product_key as ProductTemplateKey, PRODUCT_TEMPLATES);
    const preset = routePresets[item.product_key as string];
    const fallback = preset && preset.length ? preset : buildRoutePreview(template, item.finishing || [], item.mailing);
    setRouteEditDraft(item.route_steps && item.route_steps.length ? item.route_steps : fallback);
    setRouteEditPicker('');
  };

  const applyRouteEditToItem = () => {
    if (!routeEditItemId) return;
    setCart(prev => prev.map(item => item.id === routeEditItemId ? { ...item, route_steps: routeEditDraft } : item));
    setRouteEditItemId(null);
    setRouteEditDraft([]);
  };

  const resetRouteEditToDefault = () => {
    if (!routeEditItemId) return;
    const item = cart.find(c => c.id === routeEditItemId);
    if (!item) return;
    const template = getTemplate(item.product_key as ProductTemplateKey, PRODUCT_TEMPLATES);
    const preset = routePresets[item.product_key as string];
    const fallback = preset && preset.length ? preset : buildRoutePreview(template, item.finishing || [], item.mailing);
    setRouteEditDraft(fallback);
  };

  const addRouteEditStep = (step: string) => {
    if (!step) return;
    setRouteEditDraft(prev => [...prev, step]);
    setRouteEditPicker('');
  };

  const removeRouteEditStep = (index: number) => {
    setRouteEditDraft(prev => prev.filter((_, i) => i !== index));
  };

  const moveRouteEditStep = (index: number, direction: 'up' | 'down') => {
    setRouteEditDraft(prev => reorderSteps(prev, index, direction));
  };

  const updateFieldValue = (key: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAddToCart = () => {
    const qty = parseInt(jobQty);
    if (!qty || qty <= 0) return alert("Please enter quantity.");

    let finalStock = selectedStockId;
    if (selectedStockId === 'custom') {
        if (!customStockValue.trim()) return alert("Please enter custom paper details.");
        finalStock = customStockValue;
    }

    if (!currentFile && !waitingOnArt) {
      setWaitingOnArt(true);
    }

    const selectedSize = selectedSizeLabel === 'custom' && customWidth && customHeight
      ? `${customWidth} x ${customHeight}`
      : (selectedSizeLabel || jobSize || 'N/A');

    const routeSteps = routeStepsDraft.length ? routeStepsDraft : defaultRouteForDraft;

    const newItem: CartItem = {
      id: Math.random().toString(36),
      file: waitingOnArt ? null : currentFile,
      title: jobTitle || selectedTemplate?.name || 'Untitled Item',
      quantity: qty,
      size: selectedSize,
      notes: jobNotes,
      paper_stock: finalStock,
      product_key: selectedTemplate?.key || 'other',
      product_name: selectedTemplate?.name || 'Custom',
      finishing: fieldValues.finishing || [],
      mailing: !!fieldValues.mailing,
      mailingNotes: fieldValues.mailingNotes,
      waitingOnArt: waitingOnArt || !currentFile,
      route_steps: [...routeSteps],
      artworkStatus: waitingOnArt || !currentFile ? 'Waiting on Art' : 'Uploaded'
    };

    setCart([...cart, newItem]);
    rememberTemplate(selectedTemplate?.key || 'other');
    resetForm();
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    if (routeEditItemId === id) {
      setRouteEditItemId(null);
      setRouteEditDraft([]);
    }
  };

  // --- SUBMIT LOGIC ---
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert("Cart is empty.");
    if (isNewCustomer && !newCustomerEmail.includes('@')) return alert("Invalid email.");

    setIsUploading(true);
    try {
      const isInternal = role === 'admin' || role === 'staff';
      let targetEmail = user?.email || '';

      if (isInternal) {
        if (isNewCustomer) {
          targetEmail = newCustomerEmail;
        } else if (selectedCustomerId) {
          const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
          targetEmail = selectedCustomer?.email || targetEmail;
        }
      }

      const itemsPayload = cart.map(({ id, file, artworkStatus, mailingNotes, route_steps, waitingOnArt, source_job_id, ...rest }) => ({
        ...rest,
        route_steps: route_steps || [],
        mailing_notes: mailingNotes,
        waitingOnArt: waitingOnArt ?? (artworkStatus === 'Waiting on Art' || artworkStatus === 'Reuse Art'),
        source_job_id: source_job_id || undefined,
      }));

      const formData = new FormData();
      formData.append('items', JSON.stringify(itemsPayload));
      cart.forEach((item) => {
        formData.append('files', item.file || new Blob());
      });
      formData.append('selectedBrandId', selectedBrandId || '');
      formData.append('isNewCustomer', String(isNewCustomer));
      formData.append('newCustomerEmail', newCustomerEmail || '');
      formData.append('selectedCustomerId', selectedCustomerId || '');
      formData.append('workflowOptions', JSON.stringify(workflowOptions || []));
      formData.append('mode', 'product-order');

      const response = await fetch('/api/intake/quick-order', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to submit order');
      }

      const brandName = brandList.find(b => b.id === selectedBrandId)?.name || 'PrintHQ';
      if (targetEmail && result?.orderId) {
        await sendOrderConfirmation(targetEmail, result.orderId, `${cart.length} Item(s) from ${brandName}`);
      }

      alert("✅ Order Submitted Successfully!");

      setShowModal(false);
      setCart([]);
      fetchDashboardData();

    } catch (error) {
      console.error('Error:', error);
      alert('Error creating order. ' + (error as any)?.message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    });
  };

  const getDueStatus = (dueString?: string) => {
    if (!dueString) return { color: 'text-gray-300', label: '--' };
    const due = new Date(dueString);
    const now = new Date();
    due.setHours(23, 59, 59);
    now.setHours(0, 0, 0);
      
    const diff = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diff < 0) return { color: 'text-red-600 font-bold', label: 'Overdue' };
    if (diff < 1) return { color: 'text-red-600 font-bold', label: 'Today' };
    if (diff <= 3) return { color: 'text-orange-600 font-bold', label: due.toLocaleDateString('en-US', {month:'short', day:'numeric'}) };
      
    return { color: 'text-black font-medium', label: due.toLocaleDateString('en-US', {month:'short', day:'numeric'}) };
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedJobs = (jobsToSort: Job[]) => {
    if (!sortConfig) return jobsToSort;

    return [...jobsToSort].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortConfig.key) {
        case 'timeline':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'customer':
          const aProfile = customers.find(c => c.id === a.user_id);
          aVal = (aProfile ? (aProfile.first_name || aProfile.email) : (a.guest_email || 'Guest')).toLowerCase();
          const bProfile = customers.find(c => c.id === b.user_id);
          bVal = (bProfile ? (bProfile.first_name || bProfile.email) : (b.guest_email || 'Guest')).toLowerCase();
          break;
        case 'details':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'size':
          aVal = (a.size || '').toLowerCase();
          bVal = (b.size || '').toLowerCase();
          break;
        case 'stock':
          aVal = (a.paper_stock || '').toLowerCase();
          bVal = (b.paper_stock || '').toLowerCase();
          break;
        case 'station':
          aVal = (a.current_step || 'Processing').toLowerCase();
          bVal = (b.current_step || 'Processing').toLowerCase();
          break;
        case 'team':
          const aStaff = staff.find(s => s.id === a.assigned_to);
          aVal = (aStaff ? (aStaff.first_name || aStaff.email) : 'Unassigned').toLowerCase();
          const bStaff = staff.find(s => s.id === b.assigned_to);
          bVal = (bStaff ? (bStaff.first_name || bStaff.email) : 'Unassigned').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isInternal = role === 'admin' || role === 'staff';

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'All') return true;
    if (activeTab === 'My Queue') return job.assigned_to === user?.id; 
    
    // SMART FILTER: Match by Main Job Station OR by any child Item Status
    const hasMatchingItem = job.job_items?.some((item: any) => item.status === activeTab);
    return job.current_step === activeTab || hasMatchingItem;
  });

  const sortedFilteredJobs = getSortedJobs(filteredJobs);

  if (!isInternal) {
    const customerJobs = filterCustomerVisibleJobs(jobs);
    const activeJobs = customerJobs.filter((job) => {
      const status = normalizeJobStatus(job.status);
      return status !== 'completed' && status !== 'cancelled' && status !== 'archived';
    });
    const recentJobs = customerJobs.slice(0, 3);
    const dueSoon = customerJobs.filter((job) => {
      if (!job.due_date) return false;
      const due = new Date(job.due_date);
      const now = new Date();
      due.setHours(23, 59, 59, 999);
      now.setHours(0, 0, 0, 0);
      const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 3;
    }).length;
    const quotesWaiting = customerJobs.filter(
      (job) => normalizeJobStatus(job.status) === 'pending review'
    ).length;

    const repeatOrderLinks = recentJobs.map((job) => {
      const sizeParts = String(job.size || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
      const width = sizeParts?.[1] || '';
      const height = sizeParts?.[2] || '';
      const params = new URLSearchParams({
        repeat: '1',
        sourceTitle: job.title || 'Previous job',
        title: job.title || '',
        quantity: job.quantity ? String(job.quantity) : '',
        paper: job.paper_stock || '',
        notes: job.notes || '',
        width,
        height,
        unit: 'in',
      });
      return {
        id: job.id,
        title: job.title || 'Untitled job',
        href: `/jobs/new?${params.toString()}`,
        subtitle: [job.size, job.paper_stock, job.quantity ? `${Number(job.quantity).toLocaleString()} qty` : '']
          .filter(Boolean)
          .join(' • '),
      };
    });

    const favoriteSetups = Array.from(
      customerJobs.reduce((map, job) => {
        const key = [job.title || 'Untitled job', job.size || '', job.paper_stock || ''].join('||');
        const current = map.get(key) || { job, count: 0 };
        current.count += 1;
        map.set(key, current);
        return map;
      }, new Map<string, { job: Job; count: number }>()).values()
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ job, count }) => {
        const sizeParts = String(job.size || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
        const params = new URLSearchParams({
          title: job.title || '',
          quantity: job.quantity ? String(job.quantity) : '',
          paper: job.paper_stock || '',
          notes: job.notes || '',
          width: sizeParts?.[1] || '',
          height: sizeParts?.[2] || '',
          unit: 'in',
        });
        return {
          id: `${job.id}-${count}`,
          title: job.title || 'Untitled setup',
          count,
          detail: [job.size, job.paper_stock].filter(Boolean).join(' • ') || 'Saved from prior work',
          href: `/jobs/new?${params.toString()}`,
        };
      });

    return (
      <CustomerPortalShell
        title="Customer home"
        description="One clean place to track your print work, watch proofs, and keep the shop conversation moving."
        activeHref="/dashboard"
        actions={
          <Link href="/dashboard/jobs" className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800">
            View all jobs
          </Link>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Active jobs</p>
              <p className="mt-3 text-4xl font-black tracking-tight text-gray-900">{activeJobs.length}</p>
              <p className="mt-2 text-sm text-gray-500">Jobs currently moving through review, proofing, or production.</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Quotes waiting</p>
              <p className="mt-3 text-4xl font-black tracking-tight text-gray-900">{quotesWaiting}</p>
              <p className="mt-2 text-sm text-gray-500">Use Quotes to approve pricing or kick questions back before we press go.</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Due soon</p>
              <p className="mt-3 text-4xl font-black tracking-tight text-gray-900">{dueSoon}</p>
              <p className="mt-2 text-sm text-gray-500">Jobs due in the next three days so you can stay ahead of timing.</p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6 text-white shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Fastest way in</p>
              <h2 className="mt-2 text-2xl font-black">Start a new job without hunting around</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Use the guided form for a fresh request, or relaunch a prior setup when the work is basically the same.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/jobs/new" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-gray-900 transition hover:bg-gray-100">
                  <PlusCircle size={16} /> Start new job
                </Link>
                {repeatOrderLinks[0] ? (
                  <Link href={repeatOrderLinks[0].href} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white transition hover:border-white/40 hover:bg-white/10">
                    <RotateCcw size={16} /> Repeat recent order
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Guided entry</p>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="rounded-2xl bg-gray-50 p-4"><span className="font-bold text-gray-900">1. Start with basics</span><p className="mt-1">Name, product, quantity, and artwork are enough to begin.</p></div>
                <div className="rounded-2xl bg-gray-50 p-4"><span className="font-bold text-gray-900">2. Reveal only what matters</span><p className="mt-1">Optional specs stay hidden until you need them.</p></div>
                <div className="rounded-2xl bg-gray-50 p-4"><span className="font-bold text-gray-900">3. Reuse prior work</span><p className="mt-1">Recent orders and favorite setups become launch points instead of dead history.</p></div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Recent jobs</p>
                  <h2 className="mt-2 text-xl font-black text-gray-900">What’s moving right now</h2>
                </div>
                <Link href="/dashboard/jobs" className="text-sm font-bold text-gray-600 hover:text-black">Open jobs →</Link>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recentJobs.length > 0 ? recentJobs.map((job) => (
                  <StatusCard key={job.id} job={job} formatDate={formatDate} dueStatus={getDueStatus(job.due_date)} />
                )) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-400 md:col-span-2 xl:col-span-3">No jobs yet. When the first order lands, it will show here.</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Repeat order</p>
                  <RotateCcw size={16} className="text-gray-300" />
                </div>
                <div className="mt-4 space-y-3">
                  {repeatOrderLinks.length > 0 ? repeatOrderLinks.map((item) => (
                    <Link key={item.id} href={item.href} className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-black hover:bg-white">
                      <div className="font-bold text-gray-900">{item.title}</div>
                      <div className="mt-1 text-sm text-gray-500">{item.subtitle || 'Launch with prior specs prefilled'}</div>
                    </Link>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">Your last few jobs will show up here as one-click reorder starters.</div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Favorite setups</p>
                  <Star size={16} className="text-amber-400" />
                </div>
                <div className="mt-4 space-y-3">
                  {favoriteSetups.length > 0 ? favoriteSetups.map((setup) => (
                    <Link key={setup.id} href={setup.href} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-black hover:bg-white">
                      <div>
                        <div className="font-bold text-gray-900">{setup.title}</div>
                        <div className="mt-1 text-sm text-gray-500">{setup.detail}</div>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">{setup.count}x</span>
                    </Link>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">As repeat patterns build, the portal can surface your most-used specs here.</div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/dashboard/messages" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-black hover:text-black">Open messages</Link>
                  <Link href="/dashboard/quotes" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-black hover:text-black">Review quotes</Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </CustomerPortalShell>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

      {/* ITEM DETAIL DRAWER */}
      {editingItemId && (() => {
          const item = jobs.flatMap(j => j.job_items || []).find(i => i.id === editingItemId);
          if (!item) return null;
          return (
            <ItemDetailDrawer 
                item={item}
                assets={jobAssets}
                workflowOptions={workflowOptions}
                onClose={() => setEditingItemId(null)}
                onUpdate={handleUpdateItem}
                onUpload={onItemUpload}
                onAddStep={handleAddStep}
                onToggleStep={handleToggleStep}
                onDeleteStep={handleDeleteStep}
                onMoveStep={async () => {}} // Not yet implemented on dashboard
                onReorderSteps={async () => {}} // Not yet implemented on dashboard
                onLogActivity={async (action, details, itemId) => {
                    await supabase.from('job_logs').insert({ job_id: item.job_id, user_id: user.id, action, details, job_item_id: itemId });
                    handleOpenItemDrawer(item.id); // Refresh logs
                }}
                logs={jobLogs}
                userRole={role}
            />
          );
      })()}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-900">New Production Order</h3>
                <p className="text-xs text-gray-500">Group multiple jobs into one ticket.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                     <span>Qty</span>
                   </div>
                   <div className="divide-y divide-gray-100">
                     {cart.map((item) => (
                       <div key={item.id} className="p-3 bg-white flex justify-between items-start gap-3">
                         <div className="flex items-start overflow-hidden gap-3">
                           <FileText size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                           <div className="truncate space-y-1">
                             <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                             <p className="text-[11px] text-gray-500 font-semibold truncate">{item.product_name} • {item.size} • {item.paper_stock}</p>
                             <div className="flex flex-wrap gap-1 items-center text-[10px] text-gray-500 font-semibold">
                               <span className="px-2 py-1 rounded-full bg-gray-100 border">{item.artworkStatus}</span>
                               {item.finishing && item.finishing.length > 0 && <span className="px-2 py-1 rounded-full bg-blue-50 border border-blue-100">Finishing: {item.finishing.join(', ')}</span>}
                               {item.mailing && <span className="px-2 py-1 rounded-full bg-purple-50 border border-purple-100">Mailing</span>}
                             </div>
                             <div className="flex flex-wrap gap-2 mt-1 items-center">
                               <span className="text-[10px] font-black uppercase text-gray-400">Route</span>
                               {item.route_steps?.map((step, idx) => (
                                 <span key={`${step}-${idx}`} className="text-[10px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600 font-bold uppercase tracking-wide">{step}</span>
                               ))}
                               <button onClick={() => openRouteEditorForItem(item)} className="text-[10px] font-bold text-blue-600 hover:underline">Edit Route</button>
                             </div>
                             {routeEditItemId === item.id && (
                               <div className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                 <div className="flex flex-col gap-2">
                                   {routeEditDraft.map((step, idx) => (
                                     <div key={`${step}-${idx}`} className="flex items-center gap-2">
                                       <div className="flex flex-col">
                                         <button onClick={() => moveRouteEditStep(idx, 'up')} disabled={idx === 0} className="p-1 rounded bg-white border text-[10px] disabled:opacity-30">↑</button>
                                         <button onClick={() => moveRouteEditStep(idx, 'down')} disabled={idx === routeEditDraft.length - 1} className="p-1 rounded bg-white border text-[10px] disabled:opacity-30">↓</button>
                                       </div>
                                       <span className="flex-1 text-xs font-bold bg-white border border-gray-200 rounded-full px-3 py-1">{step}</span>
                                       <button onClick={() => removeRouteEditStep(idx)} className="text-[11px] text-red-500 font-bold px-2">×</button>
                                     </div>
                                   ))}
                                   {routeEditDraft.length === 0 && <p className="text-[11px] text-gray-400">No steps yet.</p>}
                                 </div>
                                 <div className="flex flex-wrap gap-2 items-center">
                                   <select value={routeEditPicker} onChange={(e) => setRouteEditPicker(e.target.value)} className="flex-1 text-xs p-2 rounded-lg border border-gray-300 bg-white">
                                     <option value="">+ Add step...</option>
                                     {routeVocabulary.map((group) => (
                                       <optgroup key={group.group} label={group.group}>
                                         {group.steps.map((s) => (<option key={s} value={s}>{s}</option>))}
                                       </optgroup>
                                     ))}
                                   </select>
                                   <button type="button" onClick={() => addRouteEditStep(routeEditPicker)} disabled={!routeEditPicker} className="text-[11px] px-3 py-2 rounded bg-black text-white font-bold disabled:opacity-40">Add</button>
                                   <button type="button" onClick={resetRouteEditToDefault} className="text-[11px] px-3 py-2 rounded bg-white border font-bold">Reset Default</button>
                                   <button type="button" onClick={applyRouteEditToItem} className="text-[11px] px-3 py-2 rounded bg-blue-600 text-white font-bold">Save</button>
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className="text-sm font-mono font-bold">{item.quantity}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase text-gray-500">Product</label>
                        <select
                          value={selectedProductKey}
                          onChange={(e) => setSelectedProductKey(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black"
                        >
                          {PRODUCT_TEMPLATES.map((p) => (
                            <option key={p.key} value={p.key}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-gray-500">Quantity</label>
                        <input type="number" placeholder="Qty" value={jobQty} onChange={(e) => setJobQty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase text-gray-500">Item Title</label>
                      <input type="text" placeholder="Item Title (e.g. Business Cards)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="col-span-1 md:col-span-2">
                        <label className="text-[11px] font-bold uppercase text-gray-500">Size</label>
                        <select
                          value={selectedSizeLabel}
                          onChange={(e) => setSelectedSizeLabel(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black"
                        >
                          {sizeOptions.map((s) => (
                            <option key={s.label} value={s.label}>{s.label}</option>
                          ))}
                          {selectedTemplate?.allowCustom && <option value="custom">Custom</option>}
                        </select>
                      </div>
                      {selectedSizeLabel === 'custom' && (
                        <div className="col-span-1 md:col-span-1 grid grid-cols-2 gap-2">
                          <input type="number" placeholder="W" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                          <input type="number" placeholder="H" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {selectedTemplate?.fields?.map((field) => {
                        if (field.type === 'paper') {
                          return (
                            <div key={field.key} className="space-y-1">
                              <label className="text-[11px] font-bold uppercase text-gray-500">{field.label}</label>
                              <select
                                value={fieldValues[field.key] || selectedStockId}
                                onChange={(e) => { setSelectedStockId(e.target.value); updateFieldValue(field.key, e.target.value); }}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black"
                              >
                                {stockLibrary.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                                <option value="custom">-- Custom / Other --</option>
                              </select>
                              {(fieldValues[field.key] === 'custom' || selectedStockId === 'custom') && (
                                <input
                                  type="text"
                                  placeholder="Enter custom paper details..."
                                  value={customStockValue}
                                  onChange={(e) => setCustomStockValue(e.target.value)}
                                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-blue-50 focus:bg-white transition-colors"
                                />
                              )}
                            </div>
                          );
                        }
                        if (field.type === 'select') {
                          return (
                            <div key={field.key} className="space-y-1">
                              <label className="text-[11px] font-bold uppercase text-gray-500">{field.label}</label>
                              <select
                                value={fieldValues[field.key] || ''}
                                onChange={(e) => updateFieldValue(field.key, e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black"
                              >
                                <option value="">Select...</option>
                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              {field.helper && <p className="text-[11px] text-gray-400">{field.helper}</p>}
                            </div>
                          );
                        }
                        if (field.type === 'multiselect') {
                          return (
                            <div key={field.key} className="space-y-1">
                              <label className="text-[11px] font-bold uppercase text-gray-500">{field.label}</label>
                              <div className="flex flex-wrap gap-2">
                                {field.options?.map(opt => {
                                  const isActive = (fieldValues[field.key] || []).includes(opt);
                                  return (
                                    <button
                                      type="button"
                                      key={opt}
                                      onClick={() => {
                                        const existing = fieldValues[field.key] || [];
                                        const next = isActive ? existing.filter((o: string) => o !== opt) : [...existing, opt];
                                        updateFieldValue(field.key, next);
                                      }}
                                      className={`px-3 py-1 rounded-full border text-xs font-bold ${isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-black'}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        if (field.type === 'boolean') {
                          return (
                            <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700">
                              <input type="checkbox" checked={!!fieldValues[field.key]} onChange={(e) => updateFieldValue(field.key, e.target.checked)} />
                              {field.label}
                              {field.helper && <span className="text-[11px] text-gray-400">{field.helper}</span>}
                            </label>
                          );
                        }
                        if (field.type === 'number') {
                          return (
                            <div key={field.key} className="space-y-1">
                              <label className="text-[11px] font-bold uppercase text-gray-500">{field.label}</label>
                              <input type="number" value={fieldValues[field.key] || ''} onChange={(e) => updateFieldValue(field.key, e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                            </div>
                          );
                        }
                        return (
                          <div key={field.key} className="space-y-1">
                            <label className="text-[11px] font-bold uppercase text-gray-500">{field.label}</label>
                            <input type="text" value={fieldValues[field.key] || ''} onChange={(e) => updateFieldValue(field.key, e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase text-gray-500">Artwork</label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={waitingOnArt} onChange={(e) => { setWaitingOnArt(e.target.checked); if (e.target.checked) setCurrentFile(null); }} />
                          Waiting on Art
                        </label>
                        {currentFile && <span className="text-xs text-gray-500">{currentFile.name}</span>}
                      </div>
                      {!waitingOnArt && (!currentFile ? (
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
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl text-blue-900 border border-blue-100 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center overflow-hidden">
                            <FileText size={20} className="mr-3 text-blue-600 flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{currentFile?.name}</p>
                          </div>
                          <button type="button" onClick={() => setCurrentFile(null)} className="ml-2 text-blue-400 hover:text-red-500"><X size={16} /></button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase text-gray-500">Internal Notes</label>
                      <textarea value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" rows={2} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase text-gray-500">Route Plan</p>
                        <div className="flex items-center gap-2 text-[10px]">
                          <button type="button" onClick={resetRouteDraft} className="px-2 py-1 rounded bg-white border text-gray-600 font-bold hover:bg-gray-100">Reset to Auto</button>
                          {selectedTemplate?.key && (
                            <button type="button" onClick={saveRoutePresetForProduct} className="px-2 py-1 rounded bg-gray-900 text-white font-bold">Save as Product Default</button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="flex flex-col gap-2">
                          {routeStepsDraft.map((step, idx) => (
                            <div key={`${step}-${idx}`} className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <button type="button" onClick={() => moveRouteStep(idx, 'up')} disabled={idx === 0} className="p-1 rounded bg-white border text-[10px] disabled:opacity-30">↑</button>
                                <button type="button" onClick={() => moveRouteStep(idx, 'down')} disabled={idx === routeStepsDraft.length - 1} className="p-1 rounded bg-white border text-[10px] disabled:opacity-30">↓</button>
                              </div>
                              <span className="flex-1 text-xs font-bold bg-white border border-gray-200 rounded-full px-3 py-1">{step}</span>
                              <button type="button" onClick={() => removeRouteStep(idx)} className="text-[11px] text-red-500 font-bold px-2">×</button>
                            </div>
                          ))}
                          {routeStepsDraft.length === 0 && <p className="text-[11px] text-gray-400">Add steps to define the route.</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <select value={routeStepPicker} onChange={(e) => setRouteStepPicker(e.target.value)} className="flex-1 text-xs p-2 rounded-lg border border-gray-300 bg-white">
                            <option value="">+ Add step...</option>
                            {routeVocabulary.map((group) => (
                              <optgroup key={group.group} label={group.group}>
                                {group.steps.map((s) => (<option key={s} value={s}>{s}</option>))}
                              </optgroup>
                            ))}
                          </select>
                          <button type="button" onClick={() => addRouteStep(routeStepPicker)} disabled={!routeStepPicker} className="text-[11px] px-3 py-2 rounded bg-black text-white font-bold disabled:opacity-40">Add Step</button>
                          <span className="text-[10px] text-gray-400">Auto-built from product/finishing/mailing. Edits stay per item.</span>
                        </div>
                      </div>
                    </div>
                    
                    <button type="button" onClick={handleAddToCart} disabled={!jobQty} className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${!jobQty ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-md'}`}>
                      {!jobQty ? 'Enter Quantity...' : '+ Add Item to List'}
                    </button>
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={handleSubmitOrder} disabled={isUploading || cart.length === 0} className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center shadow-lg">
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <ShoppingCart className="mr-2" size={18} />} 
                Submit Order ({cart.length} Items)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-20 items-center px-8 border-b border-gray-100">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center mr-3"><span className="text-white font-bold text-xs">PHQ</span></div>
          <span className="font-bold text-lg tracking-tight">PrintHQ</span>
          {isInternal && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">{role}</span>}
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem icon={<LayoutDashboard size={20} />} label={isInternal ? "Shop Floor" : "My Jobs"} href="/dashboard" active />
          {isInternal && <NavItem icon={<MessageSquare size={20} />} label="Intake" href="/dashboard/intake" />}
          {isInternal && <NavItem icon={<Rocket size={20} />} label="Mission Control" href="/dashboard/mission-control" />}
          {isInternal && <NavItem icon={<Calculator size={20} />} label="Estimator" href="/dashboard/pricing/estimator" />}
          <NavItem icon={<FileText size={20} />} label="Quotes" href="/dashboard/quotes" />
          {isInternal ? <NavItem icon={<Briefcase size={20} />} label="Invoices" href="/dashboard/invoices" /> : <NavItem icon={<Briefcase size={20} />} label="Invoices" href="/dashboard/invoices" />}
          {!isInternal && <NavItem icon={<MessageSquare size={20} />} label="Messages" href="/dashboard/messages" />}
          {isInternal && <NavItem icon={<Building2 size={20} />} label="Organizations" href="/dashboard/organizations" />}
          {isInternal && <NavItem icon={<User size={20} />} label="Customers" href="/dashboard/customers" />}
          <NavItem icon={<Settings size={20} />} label="Settings" href="/dashboard/settings" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleSignOut} className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"><LogOut size={20} className="mr-3" /> Sign out</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-12">
            
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
                  const name = staff.find(s => s.id === user?.id)?.first_name || user?.email?.split('@')[0] || 'Team';
                  return `${greeting}, ${name}`;
                })()}
              </h1>
              <p className="mt-1 text-gray-500">{isInternal ? 'Here is what is happening on the production floor.' : 'Track your active print jobs.'}</p>
            </div>
            <button onClick={handleOpenNewOrder} className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 shadow-lg transition-transform hover:scale-105">+ New Order</button>
          </div>

          {isInternal && (
            <div className="mb-8 grid gap-4 lg:grid-cols-3">
              <DashboardLaunchCard
                href="/dashboard/intake"
                icon={<MessageSquare size={18} />}
                eyebrow="New Quote"
                title="CSR chat + discovery"
                body="Use the intake workspace when the request is incomplete, the art needs review, or you need the bot to clarify specs."
              />
              <DashboardLaunchCard
                href="/dashboard/intake"
                icon={<Calculator size={18} />}
                eyebrow="Quick Order"
                title="Estimate and create fast"
                body="Move clear repeat work off the shop-floor dashboard and into a dedicated intake flow with quantity breaks and uploads."
              />
              <DashboardLaunchCard
                href="/dashboard/intake"
                icon={<Briefcase size={18} />}
                eyebrow="Internal Job"
                title="Samples, tests, house work"
                body="Create internal production work without muddying the live queue view for operators."
              />
            </div>
          )}

          {isInternal && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {departmentTabs.map((dept) => (
                <button 
                  key={dept}
                  onClick={() => setActiveTab(dept)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center
                    ${activeTab === dept ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-black hover:text-black'}`}
                >
                  {dept === 'My Queue' && <Briefcase size={14} className="mr-2" />}
                  {dept}
                </button>
              ))}
            </div>
          )}

          {isInternal ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Filter size={16} className="mr-2 text-gray-400" /> 
                  {activeTab}
                </h3>
                <div className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">{sortedFilteredJobs.length} Jobs</div>
              </div>

              {sortedFilteredJobs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                   <Scissors size={48} className="mb-4 opacity-20" />
                   <p>No jobs found in {activeTab}.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-3 w-32 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('timeline')}>
                        <div className="flex items-center gap-1">
                          Timeline {sortConfig?.key === 'timeline' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                        </div>
                      </th>
                      <th className="px-6 py-3 w-48 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('customer')}>
                        <div className="flex items-center gap-1">
                          Customer {sortConfig?.key === 'customer' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                        </div>
                      </th> 
                      <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('details')}>
                        <div className="flex items-center gap-1">
                          Job Details {sortConfig?.key === 'details' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                        </div>
                      </th>
                      <th className="px-6 py-3 w-24 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('size')}>
                        <div className="flex items-center gap-1">
                          Size {sortConfig?.key === 'size' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                        </div>
                      </th>
                      <th className="px-6 py-3 w-32 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('stock')}>
                        <div className="flex items-center gap-1">
                          Stock {sortConfig?.key === 'stock' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                        </div>
                      </th>
                      <th className="px-6 py-3 w-32 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('station')}>
                        <div className="flex items-center gap-1">
                          Station {sortConfig?.key === 'station' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                        </div>
                      </th>
                      <th className="px-6 py-3 w-40 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('team')}>
                        <div className="flex items-center gap-1">
                          Team {sortConfig?.key === 'team' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                        </div>
                      </th>
                      <th className="px-6 py-3 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedFilteredJobs.map((job: any) => {
                      const dueStatus = getDueStatus(job.due_date);
                      
                      const customerProfile = customers.find(c => c.id === job.user_id);
                      const customerName = customerProfile ? (customerProfile.first_name || customerProfile.email) : (job.guest_email || 'Guest');
                                            const brandName = job.orders?.brands?.name || 'PrintHQ';
                       
                       return (
                       <React.Fragment key={job.id}>
                       <tr className="hover:bg-gray-50 transition-colors group">
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                             <div className="text-[10px] text-gray-400 font-bold uppercase">In: {formatDate(job.created_at)}</div>
                             <div className={`text-xs ${dueStatus.color}`}>Due: {dueStatus.label}</div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                    {typeof customerName === 'string' ? customerName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{customerName}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate max-w-[120px]">{brandName}</p>
                                </div>
                            </div>
                        </td>

                        <td className="px-6 py-4">
                          <Link href={`/dashboard/jobs/${job.id}`} className="block group-hover:text-blue-600 transition-colors">
                              <div className="font-bold text-gray-900 text-base">{job.title}</div>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-gray-400">#{job.id.substring(0,6).toUpperCase()}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-700">{job.size || 'N/A'}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500 truncate max-w-[120px]" title={job.paper_stock}>{job.paper_stock || 'N/A'}</div>
                        </td>

                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${job.current_step === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                             {job.current_step || 'Processing'}
                           </span>
                        </td>

                        <td className="px-6 py-4">
                           <select 
                             value={job.assigned_to || ''} 
                             onChange={(e) => handleAssignJob(job.id, e.target.value)} 
                             className="bg-transparent border-none text-xs font-bold text-gray-500 focus:ring-0 cursor-pointer hover:text-black w-full truncate"
                           >
                             <option value="">-- Unassigned --</option>
                             {staff.map(s => (
                               <option key={s.id} value={s.id}>
                                 {s.first_name || s.email?.split('@')[0]}
                                </option>
                              ))}
                            </select>
                         </td>
 
                         <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <Link href={`/dashboard/jobs/${job.id}`} className="text-gray-400 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-full">
                                <ChevronRight size={20} />
                             </Link>
                           </div>
                         </td>
 
                       </tr>
 
                       {/* ITEM SUB-ROWS (PHASE 3.12/3.14) */}
                       {job.job_items && job.job_items.length > 0 && job.job_items
                         .filter((item: any) => {
                           if (activeTab === 'All' || activeTab === 'My Queue') return true;
                           return item.status === activeTab;
                         })
                         .map((item: any) => {
                           const isDeptMatch = activeTab !== 'All' && activeTab !== 'My Queue' && item.status === activeTab;
                           return (
                          <tr key={item.id} className={`border-b border-gray-100/50 transition-colors ${isDeptMatch ? 'bg-yellow-400/10' : 'bg-gray-50/30'}`}>
                            <td className="px-6 py-2"></td>
                            <td className="px-6 py-2"></td>
                            <td className="px-6 py-2">
                              <div className={`flex items-center gap-3 pl-4 border-l-2 ${isDeptMatch ? 'border-yellow-400' : 'border-blue-100'}`}>
                                <button 
                                  onClick={() => handleOpenItemDrawer(item.id)}
                                  className="flex flex-col text-left hover:opacity-75 transition-opacity"
                                >
                                  <span className={`text-[11px] font-black uppercase tracking-tight ${isDeptMatch ? 'text-yellow-900' : 'text-gray-700'}`}>{item.description}</span>
                                  <span className="text-[9px] text-gray-400 font-bold uppercase">{item.quantity?.toLocaleString()} units</span>
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-2">
                              <span className="text-xs text-gray-500">{item.size || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-2">
                              <div className="text-[10px] text-gray-400 truncate max-w-[120px]" title={item.paper_stock}>{item.paper_stock || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' 
                                    : isDeptMatch ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-sm'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                    {item.status || 'Pending'}
                                </span>
                                
                                {isDeptMatch && (
                                    <button 
                                        onClick={() => handleCompleteItemStep(item, activeTab)}
                                        className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm hover:bg-green-700 transition-colors uppercase"
                                    >
                                        Mark Done
                                    </button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-2"></td>
                            <td className="px-6 py-2">
                                <div className="flex justify-end">
                                    <button onClick={() => handleOpenItemDrawer(item.id)} className="text-gray-300 hover:text-black">
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            </td>
                          </tr>
                        );
                        })}
                       </React.Fragment>
                       );
                     })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
               {jobs.map((job) => {
                   const dueStatus = getDueStatus(job.due_date);
                   return (
                   <StatusCard key={job.id} job={job} formatDate={formatDate} dueStatus={dueStatus} />
                   );
               })}
            </div>
          )}
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

function DashboardLaunchCard({ href, icon, eyebrow, title, body }: { href: string, icon: React.ReactNode, eyebrow: string, title: string, body: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-black hover:shadow-md">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">{icon}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">{eyebrow}</div>
      <div className="text-lg font-bold text-gray-900 mb-2">{title}</div>
      <p className="text-sm text-gray-600 leading-6">{body}</p>
      <div className="mt-4 text-sm font-bold text-black">Open Intake →</div>
    </Link>
  );
}

function StatusCard({ job, formatDate, dueStatus }: { job: Job, formatDate: (d: string) => string, dueStatus: any }) {
  const styles: any = { 'Pending Review': 'bg-amber-100 text-amber-700', 'In Production': 'bg-emerald-100 text-emerald-700' };
  const brandName = job.orders?.brands?.name || 'PrintHQ';
  return (
    <Link href={`/dashboard/jobs/${job.id}`}>
      <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-black hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[job.status] || 'bg-blue-100 text-blue-700'}`}>{job.status}</div>
          <span className="text-xs font-mono text-gray-400">#{job.id.substring(0,6).toUpperCase()}</span>
        </div>
        <h4 className="mt-4 text-lg font-bold text-gray-900 truncate">{job.title}</h4>
        <div className="mt-1 flex items-center justify-between">
              <span className="text-sm text-gray-500">{job.quantity} units</span>
              <span className="text-xs text-gray-400 flex items-center"><Clock size={12} className="mr-1" /> {formatDate(job.created_at)}</span>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-gray-400">{brandName}</span>
            <span className={`text-xs ${dueStatus.color}`}>{dueStatus.label}</span>
        </div>
      </div>
    </Link>
  );
}


function BotIntakePanel({ supabase, currentUser, brandList, workflowOptions, customers, onJobCreated }: { supabase: any, currentUser: any, brandList: any[], workflowOptions: any[], customers: any[], onJobCreated?: () => void }) {
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
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandList?.[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(currentUser?.id || '');
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
    const defaultSz = getDefaultSizeForTemplate(productKey);
    if (defaultSz) {
      setProductSizeLabel(defaultSz.label);
      setFinishW(defaultSz.width);
      setFinishH(defaultSz.height);
    }
  }, [productKey]);

  useEffect(() => {
    if (brandList?.length && !selectedBrandId) {
      setSelectedBrandId(brandList[0].id);
    }
  }, [brandList]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadOverrides(selectedCustomerId);
      const selected = customers.find((c) => c.id === selectedCustomerId) || (currentUser?.id === selectedCustomerId ? currentUser : null);
      if (selected?.customer_class) {
        setPricingProfile(getCustomerClassDefaultProfile(selected.customer_class));
      }
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
      const productNote = `Product: ${productMeta.customLabel || productMeta.label} ${productMeta.sizeLabel}${productMeta.pageCount ? ` • ${productMeta.pageCount} pages` : ''}${productMeta.coverStock ? ` • Cover ${productMeta.coverStock}` : ''}${productMeta.insideStock ? ` • Inside ${productMeta.insideStock}` : ''}`;

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          order_id: order.id,
          user_id: selectedCustomerId || null,
          guest_email: selectedCustomerId ? null : (contactEmail || null),
          title: itemTitle || productMeta.customLabel || productMeta.label || 'Bot Intake Job',
          quantity: selectedQuantity,
          status: 'Pending Review',
          created_by: currentUser?.id || null,
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
        action: 'Bot Intake',
        details: `Bot intake created job with ${selectedQuantity} qty (${chosen.winner.method}).`,
        job_item_id: jobItem.id,
      });

      await supabase.from('messages').insert({
        job_id: job.id,
        user_id: currentUser?.id || null,
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
      onJobCreated?.();
    } catch (err: any) {
      console.error('bot intake create failed', err?.message || err);
      alert('Failed to create job from bot intake.');
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
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2"><Bot size={14}/> Bot Intake</p>
          <h3 className="text-lg font-bold text-gray-900">Convert chat ➜ estimator ➜ job</h3>
        </div>
        <div className="text-xs text-gray-500">{customerOverrides.length} override(s) in effect for this customer.</div>
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
              <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                {brandList.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500">Customer</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
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
              {papersWithOverrides.map((p) => {
                const perSheet = paperSellPerSheet(p);
                const overrideTag = p.price_override != null || p.price_amount != null;
                const suffix = overrideTag ? 'override' : `${pricingProfile} profile`;
                return (<option key={p.id} value={p.id}>{p.name} ({formatCurrency(perSheet)}/sht • {suffix}{p.__override ? ' • customer' : ''})</option>);
              })}
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
