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
import { normalizeRole, isInternalRole } from '@/lib/auth/roles';
import { sendOrderConfirmation } from '../server-actions';
import ItemDetailDrawer from '@/components/ItemDetailDrawer';
import NewOrderModal from '@/components/NewOrderModal';


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
      
    const userRole = normalizeRole((profile as any)?.role, user.email);
    setRole(userRole);

    // Redirect Bindery users to their specialized dashboard
    if (userRole === 'bindery') {
      router.push('/bindery');
      return;
    }

    const isInternal = isInternalRole(userRole);

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
    }

    const { data: brandsData } = await supabase.from('brands').select('*');
    if (brandsData) {
        setBrandList(brandsData);
    }

    if (isInternal) {
      const { data: dbDepts } = await supabase.from('departments').select('name').order('sort_order');
      const dynamicTabs = dbDepts ? dbDepts.map(d => d.name) : [];
      setDepartmentTabs(['My Queue', 'All', ...dynamicTabs]);

      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles) {
        setCustomers(allProfiles);
        setStaff(allProfiles.filter(p => isInternalRole(normalizeRole((p as any)?.role, p.email))));
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
    const item = jobs.flatMap(j => j.job_items || []).find(i => i.id === itemId);
    if (!item) return;

    const { data: assets } = await supabase.from('job_assets').select('*, profiles(email)').eq('job_id', item.job_id).order('created_at', { ascending: false });
    if (assets) setJobAssets(assets);

    const { data: logs } = await supabase.from('job_logs').select('*, profiles(email)').eq('job_id', item.job_id).order('created_at', { ascending: false });
    if (logs) setJobLogs(logs);
  };

  const handleCompleteItemStep = async (item: any, currentStepName: string) => {
    if (!confirm(`Mark "${currentStepName}" as DONE for ${item.description}?`)) return;

    const step = item.job_item_steps?.find((s: any) => s.step_name === currentStepName && s.status !== 'Completed');
    if (!step) return alert("Step not found or already completed.");

    const { error: stepErr } = await supabase.from('job_item_steps').update({ status: 'Completed' }).eq('id', step.id);
    if (stepErr) return alert(stepErr.message);

    const allSteps = item.job_item_steps || [];
    const sortedSteps = [...allSteps].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentIndex = sortedSteps.findIndex(s => s.id === step.id);
    const nextStep = sortedSteps[currentIndex + 1];
    
    const newStatus = nextStep ? nextStep.step_name : 'Completed';

    const { error: itemErr } = await supabase.from('job_items').update({ status: newStatus }).eq('id', item.id);
    if (itemErr) return alert(itemErr.message);

    await supabase.from('job_logs').insert({
        job_id: item.job_id,
        user_id: user.id,
        action: 'Step Completed',
        details: `Completed ${currentStepName}. Next: ${newStatus}`,
        job_item_id: item.id
    });

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
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      await supabase.from('job_item_steps').update({ status: newStatus }).eq('id', stepId);
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

  const handleOpenNewOrder = () => setShowModal(true);

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

  const isInternal = isInternalRole(role);

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'All') return true;
    if (activeTab === 'My Queue') return job.assigned_to === user?.id; 
    
    const hasMatchingItem = job.job_items?.some((item: any) => item.status === activeTab);
    return job.current_step === activeTab || hasMatchingItem;
  });

  const sortedFilteredJobs = getSortedJobs(filteredJobs);

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <input type="file" ref={fileInputRef} className="hidden" />

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
                onMoveStep={async () => {}}
                onReorderSteps={async () => {}}
                onLogActivity={async (action, details, itemId) => {
                    await supabase.from('job_logs').insert({ job_id: item.job_id, user_id: user.id, action, details, job_item_id: itemId });
                    handleOpenItemDrawer(item.id);
                }}
                logs={jobLogs}
                userRole={role}
            />
          );
      })()}

      {showModal && (
        <NewOrderModal
          user={user}
          role={role}
          customers={customers}
          brandList={brandList}
          onClose={() => setShowModal(false)}
          onSubmitted={() => fetchDashboardData()}
        />
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
 
                       {/* ITEM SUB-ROWS */}
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
