'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, FileText, Settings, LogOut, LayoutDashboard, 
  Loader2, X, Scissors, User, Trash2, Filter, ArrowRightCircle, 
  Briefcase, Plus, ShoppingCart, Clock, ChevronRight, Layers, Ruler,
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Calculator, MessageSquare, Send, Sparkles, Paperclip, Bot
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useMemo } from 'react';
import React from 'react';
import Link from 'next/link';
// Use the new name and the @ alias so it always finds the right spot
import { sendOrderConfirmation } from '../server-actions';
import ItemDetailDrawer from '@/components/ItemDetailDrawer';
import CsrChatPanel from '@/components/CsrChatPanel';
import { applyOverridesToList, parseQuantityList, formatCurrency } from '@/utils/pricing';
import { PRODUCT_TEMPLATES, getDefaultSizeForTemplate, getTemplate, ProductTemplateKey } from '@/utils/productTemplates';
import { applyPricingProfileToRoute, PricingProfileKey, PRICING_PROFILES } from '@/lib/estimator';
import { getCustomerClassDefaultProfile, normalizeCustomerClass } from '@/lib/customerClass';


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
    
  // --- CART STATE ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
    
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    setShowModal(true);
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
  };

  // --- FILE HANDLING (CLICK & DRAG/DROP) ---
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

  const handleAddToCart = () => {
    if (!currentFile) return alert("Please upload a file.");
    if (!jobQty) return alert("Please enter quantity.");

    let finalStock = selectedStockId;
    if (selectedStockId === 'custom') {
        if (!customStockValue.trim()) return alert("Please enter custom paper details.");
        finalStock = customStockValue;
    }

    const newItem: CartItem = {
      id: Math.random().toString(36),
      file: currentFile,
      title: jobTitle,
      quantity: parseInt(jobQty),
      size: jobSize || 'N/A', 
      notes: jobNotes,
      paper_stock: finalStock
    };

    setCart([...cart, newItem]);
    resetForm();
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // --- SUBMIT LOGIC ---
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert("Cart is empty.");
    if (isNewCustomer && !newCustomerEmail.includes('@')) return alert("Invalid email.");

    setIsUploading(true);
    try {
      // 1. Determine the REAL User
      let targetUserId = user?.id; 
      let targetEmail = user?.email;
      const isInternal = role === 'admin' || role === 'staff';

      // 2. ADMIN OVERRIDE LOGIC
      if (isInternal) {
          if (isNewCustomer) {
            targetUserId = null; 
            targetEmail = newCustomerEmail;
          } else if (selectedCustomerId) {
            targetUserId = selectedCustomerId;
            const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
            targetEmail = selectedCustomer?.email || '';
          }
      }

      // 3. Create Order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({ 
            user_id: targetUserId, 
            status: 'New', 
            brand_id: selectedBrandId 
        })
        .select().single();

      if (orderError) throw orderError;

      // 4. Create Job Container
      const jobTitle = cart.length === 1 ? cart[0].title : `Order #${newOrder.id.substring(0,6).toUpperCase()}`;
      const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);

      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          order_id: newOrder.id,
          user_id: targetUserId, 
          guest_email: isNewCustomer ? targetEmail : null,
          title: jobTitle,
          quantity: totalQty,
          status: 'Pending Review',
          created_by: user.id
        })
        .select().single();

      if (jobError) throw jobError;

      // 5. Process Items
      for (const item of cart) {
        
        // A. Insert Item
        const { data: newItem, error: itemError } = await supabase
            .from('job_items')
            .insert({
                job_id: newJob.id,
                description: item.title,
                quantity: item.quantity,
                paper_stock: item.paper_stock,
                size: item.size,
                internal_notes: item.notes,
                status: 'Pending'
            })
            .select().single();

        if (itemError) throw itemError;

        // B. Handle File Upload
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${newJob.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fileName, item.file);
        
        if (uploadError) console.error("File upload failed for " + item.title, uploadError);

        // C. Create Asset
        if (fileData) {
            await supabase.from('job_assets').insert({
                job_id: newJob.id,
                job_item_id: newItem.id,
                uploader_id: user.id,
                file_url: fileData.path,
                file_name: item.file.name,
                asset_type: 'source',
                status: 'pending'
            });
        }

        // D. Create Initial Step
        await supabase.from('job_item_steps').insert({
            job_item_id: newItem.id,
            step_name: 'Prepress',
            status: 'Pending',
            is_internal: true
        });
      }

      // 6. Send Email
      const brandName = brandList.find(b => b.id === selectedBrandId)?.name || 'PrintHQ';
      if (targetEmail && newJob) {
         await sendOrderConfirmation(targetEmail, newJob.id, `${cart.length} Item(s) from ${brandName}`);
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
                       <div key={item.id} className="p-3 bg-white flex justify-between items-center">
                         <div className="flex items-center overflow-hidden">
                           <FileText size={16} className="text-blue-500 mr-3 flex-shrink-0" />
                           <div className="truncate">
                             <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                             <p className="text-xs text-gray-400">{item.size} • {item.paper_stock}</p>
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
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl text-blue-900 border border-blue-100 animate-in fade-in slide-in-from-top-2">
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
                            {stockLibrary.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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
                    
                    <button type="button" onClick={handleAddToCart} disabled={!currentFile || !jobQty} className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${!currentFile || !jobQty ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-md'}`}>
                      {!currentFile ? 'Select a File first...' : !jobQty ? 'Enter Quantity...' : '+ Add Item to List'}
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
          {isInternal && <NavItem icon={<Calculator size={20} />} label="Estimator" href="/dashboard/pricing/estimator" />}
          <NavItem icon={<FileText size={20} />} label="Quotes" href="/dashboard/quotes" />
          {isInternal && <NavItem icon={<Briefcase size={20} />} label="Invoices" href="/dashboard/invoices" />}
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
            <div className="mb-8">
              <CsrChatPanel customers={customers} brandList={brandList} currentUser={user} />
            </div>
          )}

          {isInternal && (
            <div className="mb-8">
              <BotIntakePanel
                supabase={supabase}
                currentUser={user}
                brandList={brandList}
                workflowOptions={workflowOptions}
                customers={customers}
                onJobCreated={fetchDashboardData}
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
    const { data: pData } = await supabase.from('pricing_components').select('*').eq('type', 'paper').order('name');
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

  const calculateWinner = (qty: number) => {
    const activePaperId = productKey === 'booklet' ? (insidePaperId || selectedPaperId) : selectedPaperId;
    const paper = papersWithOverrides.find((p) => p.id === activePaperId) || papersWithOverrides[0];
    if (!paper || qty <= 0) return null;

    const fitNormal = Math.floor((paper.parent_sheet_width || 0) / finishW) * Math.floor((paper.parent_sheet_height || 0) / finishH);
    const fitRotated = Math.floor((paper.parent_sheet_width || 0) / finishH) * Math.floor((paper.parent_sheet_height || 0) / finishW);
    const nUp = Math.max(fitNormal, fitRotated);
    if (nUp === 0) return null;

    const sheetsNeeded = Math.ceil(qty / nUp);
    const overs = Math.max(Math.ceil(sheetsNeeded * 0.1), 50);
    const sheetsWithWaste = sheetsNeeded + overs;
    const paperCost = sheetsWithWaste * (paper.cost_amount || 0);
    const paperPrice = sheetsWithWaste * (paper.price_amount || 0);

    const selectedFinishes = finishingWithOverrides.filter((f) => selectedFinishingIds.includes(f.id));
    const finishingDetail = selectedFinishes.map((f) => f.name).join(', ');
    const finishingCost = selectedFinishes.reduce((acc, f) => {
      const unit = f.cost_unit || 'flat';
      if (unit === 'per_sheet') return acc + sheetsWithWaste * (f.cost_amount || 0);
      if (unit === 'per_1000') return acc + (sheetsWithWaste / 1000) * (f.cost_amount || 0);
      if (unit === 'per_item' || unit === 'per_piece') return acc + qty * (f.cost_amount || 0);
      return acc + (f.cost_amount || 0);
    }, 0);
    const finishingPrice = selectedFinishes.reduce((acc, f) => {
      const unit = f.cost_unit || 'flat';
      if (unit === 'per_sheet') return acc + sheetsWithWaste * (f.price_amount || 0);
      if (unit === 'per_1000') return acc + (sheetsWithWaste / 1000) * (f.price_amount || 0);
      if (unit === 'per_item' || unit === 'per_piece') return acc + qty * (f.price_amount || 0);
      return acc + (f.price_amount || 0);
    }, 0);

    let mailingCost = 0;
    let mailingPrice = 0;
    let mailingDetail = '';
    const selectedMailing = mailingWithOverrides.find((m) => m.id === (selectedMailingId as any));
    if (selectedMailing) {
      const unit = selectedMailing.cost_unit || 'flat';
      if (unit === 'per_piece' || unit === 'per_item') {
        mailingCost = qty * (selectedMailing.cost_amount || 0);
        mailingPrice = qty * (selectedMailing.price_amount || 0);
        mailingDetail = `${selectedMailing.name} • per piece`;
      } else if (unit === 'per_1000') {
        mailingCost = (qty / 1000) * (selectedMailing.cost_amount || 0);
        mailingPrice = (qty / 1000) * (selectedMailing.price_amount || 0);
        mailingDetail = `${selectedMailing.name} • per M`;
      } else if (unit === 'per_sheet') {
        mailingCost = sheetsWithWaste * (selectedMailing.cost_amount || 0);
        mailingPrice = sheetsWithWaste * (selectedMailing.price_amount || 0);
        mailingDetail = `${selectedMailing.name} • per sheet`;
      } else {
        mailingCost = selectedMailing.cost_amount || 0;
        mailingPrice = selectedMailing.price_amount || 0;
        mailingDetail = `${selectedMailing.name} • flat`;
      }
    }

    let best: any = null;
    pressesWithOverrides.forEach((press) => {
      if (paper.parent_sheet_width > (press as any).max_sheet_width && (press as any).max_sheet_width > 0) return;
      let pressCost = 0;
      let pressPrice = 0;
      let detail = '';

      if (press.type === 'press_digital') {
        pressCost = sheetsWithWaste * (press.cost_amount || 0);
        pressPrice = Math.max(25, sheetsWithWaste * (press.price_amount || 0));
        detail = `Digital | ${sheetsWithWaste} sheets`;
      } else {
        const setupHr = (press.setup_minutes || 0) / 60;
        const runHr = sheetsWithWaste / (press.run_speed_per_hour || 5000);
        const totalHr = setupHr + runHr;
        const runRate = press.price_amount || 550;
        const runCost = press.cost_amount || runRate * 0.6;
        pressPrice = 50 + totalHr * runRate;
        pressCost = 15 + totalHr * runCost;
        detail = `Offset | ${totalHr.toFixed(2)} hrs`;
      }

      const totalCost = paperCost + pressCost + finishingCost + mailingCost;
      const basePrice = paperPrice + pressPrice + finishingPrice + mailingPrice;

      const breakdown = [
        { name: 'Paper', cost: paperCost, price: paperPrice, detail: `${sheetsWithWaste} sheets (${sheetsNeeded}+${overs} overs)` },
        { name: 'Press', cost: pressCost, price: pressPrice, detail },
        { name: 'Finishing', cost: finishingCost, price: finishingPrice, detail: finishingDetail || 'None' },
        { name: 'Mailing', cost: mailingCost, price: mailingPrice, detail: mailingDetail || 'None' },
      ];

      const baseRoute = {
        method: press.name,
        sheet: `${paper.parent_sheet_width}x${paper.parent_sheet_height}`,
        nUp,
        totalSheets: sheetsWithWaste,
        sheetsNeeded,
        overs,
        paperPrice,
        pressPrice,
        finishingPrice,
        mailingPrice,
        totalPrice: basePrice,
        totalCost,
        unitCost: basePrice / qty,
        detail,
        paperName: paper.name,
        finishingDetail,
        mailingDetail,
        breakdown,
        basePrice,
      };

      const candidate = applyPricingProfileToRoute(baseRoute as any, pricingProfile, qty);
      if (!best || candidate.totalPrice < best.totalPrice) {
        best = candidate;
      }
    });

    return best;
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
              {papersWithOverrides.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price_amount)}/sht{p.__override ? ' • override' : ''})</option>
              ))}
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
