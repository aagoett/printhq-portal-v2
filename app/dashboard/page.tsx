'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, FileText, Settings, LogOut, LayoutDashboard, 
  Loader2, X, Scissors, User, Trash2, Filter, ArrowRightCircle, 
  Briefcase, Plus, ShoppingCart, Clock, ChevronRight, Layers, Ruler,
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Calculator
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';
// Use the new name and the @ alias so it always finds the right spot
import { sendOrderConfirmation } from '../server-actions';
import ItemDetailDrawer from '@/components/ItemDetailDrawer';


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

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'in progress' || s === 'in production')
      return 'bg-rose-50 text-rose-600 border border-rose-200';
    if (s === 'invoice' || s === 'completed')
      return 'text-green-600 bg-green-50 border border-green-200';
    if (s === 'pending review' || s === 'pending')
      return 'bg-amber-50 text-amber-600 border border-amber-200';
    return 'bg-blue-50 text-blue-600 border border-blue-200';
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
                  <thead>
                    <tr className="text-[11px] text-gray-500 font-semibold uppercase border-b border-gray-100 bg-white tracking-wide">
                      <th className="px-4 py-3 w-24">Job</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 w-28">CSR</th>
                      <th className="px-4 py-3 w-20 text-right">Qty</th>
                      <th className="px-4 py-3 w-40">Stock/Size</th>
                      <th className="px-4 py-3 w-28">Dept</th>
                      <th className="px-4 py-3">Step/Action</th>
                      <th className="px-4 py-3 w-32">Status</th>
                      <th className="px-4 py-3 w-28">Date Due</th>
                      <th className="px-4 py-3 w-16 text-center">Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedFilteredJobs.map((job: any) => {
                      const dueStatus = getDueStatus(job.due_date);
                      const customerProfile = customers.find(c => c.id === job.user_id);
                      const customerName = customerProfile
                        ? (customerProfile.company || customerProfile.first_name || customerProfile.email?.split('@')[0])
                        : (job.guest_email?.split('@')[0] || 'Guest');
                      const brandName = job.orders?.brands?.name || '';

                      return (
                        <React.Fragment key={job.id}>
                          {/* PARENT JOB ROW */}
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/dashboard/jobs/${job.id}`} className="font-bold text-gray-900 hover:text-blue-600 text-sm font-mono">
                                {job.id.substring(0, 5).toUpperCase()}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-sm">{customerName}</span>
                                <span className="text-[10px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded-sm leading-none">PP</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{job.csr_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
                            <td className="px-4 py-3 text-sm text-gray-400">-</td>
                            <td className="px-4 py-3 text-sm text-gray-400">-</td>
                            <td className="px-4 py-3 text-sm text-gray-400">-</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(job.status)}`}>
                                {job.status || 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium ${dueStatus.color}`}>
                                {dueStatus.label !== '--' ? dueStatus.label : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-bold text-gray-700">{job.job_items?.length || 0}</span>
                            </td>
                          </tr>

                          {/* ITEM SUB-ROWS */}
                          {job.job_items && job.job_items.length > 0 && job.job_items
                            .filter((item: any) => {
                              if (activeTab === 'All' || activeTab === 'My Queue') return true;
                              return item.status === activeTab;
                            })
                            .map((item: any) => {
                              const isDeptMatch = activeTab !== 'All' && activeTab !== 'My Queue' && item.status === activeTab;
                              const deptParts = (item.status || '').split('/');
                              const deptName = deptParts.length > 1 ? deptParts[0].trim() : '-';
                              const stepName = item.status || '-';
                              return (
                                <tr key={item.id} className={`border-b border-gray-50/80 transition-colors text-xs ${isDeptMatch ? 'bg-yellow-50/40' : 'bg-gray-50/20 hover:bg-gray-50/60'}`}>
                                  <td className="px-4 py-2 pl-7">
                                    <button
                                      onClick={() => handleOpenItemDrawer(item.id)}
                                      className="text-gray-500 hover:text-blue-600 text-left truncate max-w-[80px] block font-mono"
                                    >
                                      {item.description}
                                    </button>
                                  </td>
                                  <td className="px-4 py-2 text-gray-400">-</td>
                                  <td className="px-4 py-2 text-gray-400">-</td>
                                  <td className="px-4 py-2 text-gray-700 text-right font-medium">{item.quantity?.toLocaleString() || '-'}</td>
                                  <td className="px-4 py-2 text-gray-500 truncate max-w-[100px]">{item.size || item.paper_stock || '-'}</td>
                                  <td className="px-4 py-2 text-gray-700">{deptName}</td>
                                  <td className="px-4 py-2 text-gray-700">{stepName}</td>
                                  <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(item.status)}`}>
                                      {item.status || 'Pending'}
                                    </span>
                                    {isDeptMatch && (
                                      <button
                                        onClick={() => handleCompleteItemStep(item, activeTab)}
                                        className="ml-2 bg-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded hover:bg-green-700 transition-colors"
                                      >
                                        Mark Done
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-gray-400">-</td>
                                  <td className="px-4 py-2 text-center">
                                    <button onClick={() => handleOpenItemDrawer(item.id)} className="text-gray-400 hover:text-black transition-colors">
                                      <ExternalLink size={13} />
                                    </button>
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
