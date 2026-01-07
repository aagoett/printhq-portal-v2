'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, FileText, Settings, LogOut, LayoutDashboard, 
  Loader2, X, Scissors, User, Trash2, Filter, ArrowRightCircle, 
  Briefcase, Plus, ShoppingCart, Clock, ChevronRight, Layers, Ruler
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
// Use the new name and the @ alias so it always finds the right spot
import { sendOrderConfirmation } from '../server-actions';

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
    const isInternal = userRole === 'admin' || userRole === 'staff';

    let jobQuery = supabase
        .from('jobs')
        .select('*, orders(brands(name))') 
        .order('created_at', { ascending: false });

    if (!isInternal) jobQuery = jobQuery.eq('user_id', user.id);
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

      if (isInternal) {
          if (isNewCustomer) {
            targetEmail = newCustomerEmail;
            targetUserId = null; 
          } else if (selectedCustomerId) {
            targetUserId = selectedCustomerId;
            const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
            targetEmail = selectedCustomer?.email || '';
          }
      }

      // 2. Create Order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({ 
            user_id: targetUserId, 
            status: 'New', 
            brand_id: selectedBrandId 
        })
        .select().single();

      if (orderError) throw orderError;

      // 3. Create Job
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

      // 4. Process Items
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

      // 5. Send Email
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

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isInternal = role === 'admin' || role === 'staff';

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'All') return true;
    if (activeTab === 'My Queue') return job.assigned_to === user?.id; 
    return job.current_step === activeTab;
  });

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

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
          {isInternal && <NavItem icon={<User size={20} />} label="Customers" href="/dashboard/customers" />}
          {!isInternal && <NavItem icon={<FileText size={20} />} label="Quote History" href="/dashboard/history" />}
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
                <div className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">{filteredJobs.length} Jobs</div>
              </div>

              {filteredJobs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                   <Scissors size={48} className="mb-4 opacity-20" />
                   <p>No jobs found in {activeTab}.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-3 w-32">Timeline</th>
                      <th className="px-6 py-3 w-48">Customer</th> 
                      <th className="px-6 py-3">Job Details</th>
                      <th className="px-6 py-3 w-32">Station</th>
                      <th className="px-6 py-3 w-40">Team</th>
                      <th className="px-6 py-3 w-32 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredJobs.map((job: any) => {
                      const dueStatus = getDueStatus(job.due_date);
                      
                      const customerProfile = customers.find(c => c.id === job.user_id);
                      const customerName = customerProfile ? (customerProfile.first_name || customerProfile.email) : (job.guest_email || 'Guest');
                      
                      const brandName = job.orders?.brands?.name || 'PrintHQ';
                      
                      return (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors group">
                        
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
                            {job.size && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-bold flex items-center gap-1"><Ruler size={8}/> {job.size}</span>}
                          </div>
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
