'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, FileText, Settings, LogOut, LayoutDashboard, 
  Loader2, X, Scissors, User, Trash2, UserPlus, Filter, ArrowRightCircle, Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { sendOrderConfirmation } from '../actions';

// --- TYPES ---
type Job = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  quantity: number;
  notes: string;
  user_id: string;
  paper_stock?: string;
  guest_email?: string;
  current_step?: string;
  next_step_id?: string;
  assigned_to?: string; // New: Who owns this job?
  csr_name?: string;    // New: Helper for display
};

type Profile = {
  id: string;
  email: string;
  role: string;
  first_name?: string; 
};

// Added "My Queue" to the list
const DEPARTMENTS = ['My Queue', 'All', 'Prepress', 'Plates', 'Press', 'Bindery', 'Shipping'];

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]); // List of staff for dropdown
  
  // View State
  const [activeTab, setActiveTab] = useState('All'); 
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form Fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  
  // Customer Selection Logic
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  
  // Specs State
  const [paperStock, setPaperStock] = useState('100lb Gloss Text');
  
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

    // 1. Get Profile
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'customer';
    setRole(userRole);
    const isInternal = userRole === 'admin' || userRole === 'staff';

    // 2. Fetch Jobs
    let jobQuery = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (!isInternal) jobQuery = jobQuery.eq('user_id', user.id);
    const { data: jobsData } = await jobQuery;

    // 3. Fetch Steps
    const { data: stepsData } = await supabase.from('job_steps').select('*').eq('status', 'Pending');

    // 4. Merge Data
    if (jobsData) {
      const processedJobs = jobsData.map(j => {
        const activeStep = stepsData?.find(s => s.job_id === j.id);
        return {
          ...j,
          current_step: activeStep ? activeStep.department : 'Complete',
          next_step_id: activeStep ? activeStep.id : null
        };
      });
      setJobs(processedJobs);
    }

    // 5. Fetch People (Customers & Staff)
    if (isInternal) {
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles) {
        setCustomers(allProfiles);
        // Filter for Staff list
        setStaff(allProfiles.filter(p => p.role === 'admin' || p.role === 'staff'));
      }
      setSelectedCustomerId(user.id);
      
      // Default to "My Queue" for staff efficiency
      setActiveTab('My Queue'); 
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- NEW: ASSIGN JOB ---
  const handleAssignJob = async (jobId: string, staffId: string) => {
    if (!staffId) return;
    const staffMember = staff.find(s => s.id === staffId);
    const staffName = staffMember ? (staffMember.first_name || staffMember.email) : 'Staff';

    // Optimistic Update (Instant UI change)
    setJobs(jobs.map(j => j.id === jobId ? { ...j, assigned_to: staffId, csr_name: staffName } : j));

    // DB Update
    await supabase.from('jobs').update({ assigned_to: staffId, csr_name: staffName }).eq('id', jobId);
  };

  const handleQuickAdvance = async (job: Job) => {
    if (!job.next_step_id) return;
    await supabase.from('job_steps').update({ status: 'Completed' }).eq('id', job.next_step_id);
    fetchDashboardData();
  };

  // --- FORM HANDLERS ---
  const handleOpenNewOrder = () => {
    setSelectedFile(null);
    setJobTitle('');
    setJobQty('');
    setJobNotes('');
    setIsNewCustomer(false);
    setNewCustomerEmail('');
    setShowModal(true);
  };
  const triggerFilePicker = () => fileInputRef.current?.click();
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!jobTitle) setJobTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };
  const handleRemoveFile = () => setSelectedFile(null);

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please upload a file.");
    if (isNewCustomer && !newCustomerEmail.includes('@')) return alert("Invalid email.");

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fileName, selectedFile);
      if (uploadError) throw uploadError;

      let finalUserId = user?.id;
      let finalEmail = '';

      if (isNewCustomer) {
        finalEmail = newCustomerEmail;
      } else {
        finalUserId = selectedCustomerId;
        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
        finalEmail = selectedCustomer?.email || '';
      }

      const { data: newJob, error: dbError } = await supabase
        .from('jobs')
        .insert({
          user_id: finalUserId, 
          guest_email: isNewCustomer ? finalEmail : null,
          title: jobTitle,
          quantity: parseInt(jobQty) || 0,
          notes: jobNotes,
          file_url: fileData?.path,
          status: 'Pending Review',
          paper_stock: paperStock,
          assigned_to: user?.id, // Auto-assign to creator
          csr_name: 'Me'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Auto-create workflow
      await supabase.from('job_steps').insert({
        job_id: newJob.id,
        department: 'Prepress',
        step_order: 1,
        status: 'Pending',
        notes: 'Review files for print'
      });

      if (finalEmail && newJob) {
        await sendOrderConfirmation(finalEmail, newJob.id, jobTitle);
      }

      setShowModal(false);
      fetchDashboardData();

    } catch (error) {
      console.error('Error:', error);
      alert('Error uploading job.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isInternal = role === 'admin' || role === 'staff';

  // --- FILTER LOGIC ---
  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'All') return true;
    if (activeTab === 'My Queue') return job.assigned_to === user?.id; // Only show MY jobs
    return job.current_step === activeTab;
  });

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">New Production Ticket</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitJob} className="p-6 space-y-6">
              {isInternal && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase text-yellow-800 flex items-center">
                      <User size={14} className="mr-1"/> 
                      {isNewCustomer ? 'Enter New Customer Email:' : 'Select Existing Customer:'}
                    </label>
                    <button type="button" onClick={() => setIsNewCustomer(!isNewCustomer)} className="text-xs font-bold text-blue-600 hover:underline flex items-center">
                      {isNewCustomer ? 'Select Existing Account' : '+ Create New Guest'}
                    </button>
                  </div>
                  {isNewCustomer ? (
                      <div className="animate-in fade-in zoom-in duration-200">
                        <input type="email" placeholder="client@newcompany.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-gray-900 font-medium outline-none" />
                        <p className="text-xs text-yellow-600 mt-2 flex items-center"><UserPlus size={12} className="mr-1"/> We will email them an invite.</p>
                      </div>
                  ) : (
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-gray-900 font-medium outline-none">
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.email} {c.role !== 'customer' ? `(${c.role.toUpperCase()})` : ''}</option>)}
                    </select>
                  )}
                </div>
              )}
              
              {!selectedFile ? (
                <div onClick={triggerFilePicker} className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all group">
                  <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110"><UploadCloud className="h-6 w-6 text-gray-600 group-hover:text-black" /></div>
                  <p className="font-bold text-gray-900">Click to upload artwork</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl text-blue-900 border border-blue-100">
                  <div className="flex items-center overflow-hidden">
                    <FileText size={24} className="mr-3 text-blue-600 flex-shrink-0" />
                    <p className="font-medium truncate">{selectedFile.name}</p>
                  </div>
                  <button type="button" onClick={handleRemoveFile} className="ml-2 p-2 text-blue-400 hover:text-red-500 hover:bg-blue-100 rounded-full"><Trash2 size={18} /></button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Job Title</label><input type="text" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black" /></div>
                <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quantity</label><input type="number" required value={jobQty} onChange={(e) => setJobQty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black" /></div>
                <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Due Date</label><input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black" /></div>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                 <p className="text-sm font-bold text-gray-900 mb-4 flex items-center"><Settings size={16} className="mr-2" /> Print Specifications</p>
                 <select value={paperStock} onChange={(e) => setPaperStock(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 mb-4"><option>100lb Gloss Text</option><option>14pt Cardstock</option></select>
                 <textarea rows={2} value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} placeholder="Additional Notes..." className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black" />
              </div>
              
              <button type="submit" disabled={isUploading || !selectedFile} className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 flex items-center justify-center shadow-lg disabled:opacity-50">
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <UploadCloud className="mr-2" size={20} />} {isUploading ? 'Creating Ticket...' : 'Submit Print Job'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
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

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-12">
          
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{isInternal ? 'Production Floor' : 'Dashboard'}</h1>
              <p className="mt-1 text-gray-500">{isInternal ? 'Track jobs moving through the shop.' : 'Welcome back.'}</p>
            </div>
            <button onClick={handleOpenNewOrder} className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 shadow-lg transition-transform hover:scale-105">+ New Order</button>
          </div>

          {/* --- DEPARTMENT TABS --- */}
          {isInternal && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {DEPARTMENTS.map((dept) => (
                <button 
                  key={dept}
                  onClick={() => setActiveTab(dept)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center
                    ${activeTab === dept 
                       ? 'bg-black text-white' 
                       : 'bg-white text-gray-500 border border-gray-200 hover:border-black hover:text-black'}`}
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
                      <th className="px-6 py-3">Job ID</th>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Current Station</th>
                      <th className="px-6 py-3">Assign CSR</th>
                      <th className="px-6 py-3">Quick Action</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredJobs.map((job: any) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 font-mono text-gray-500">#{job.id.substring(0,6).toUpperCase()}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {job.title}
                          {job.guest_email && <div className="text-yellow-600 font-bold mt-1 text-[10px]">Guest: {job.guest_email}</div>}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${job.current_step === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                             {job.current_step || 'Processing...'}
                           </span>
                        </td>
                        
                        {/* CSR ASSIGNMENT DROPDOWN */}
                        <td className="px-6 py-4">
                           <select 
                             value={job.assigned_to || ''} 
                             onChange={(e) => handleAssignJob(job.id, e.target.value)}
                             className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 cursor-pointer hover:text-black"
                           >
                             <option value="">-- Unassigned --</option>
                             {staff.map(s => (
                               <option key={s.id} value={s.id}>{s.first_name || s.email}</option>
                             ))}
                           </select>
                        </td>

                        <td className="px-6 py-4">
                          {job.next_step_id && (
                             <button onClick={() => handleQuickAdvance(job)} className="flex items-center text-xs font-bold text-gray-400 hover:text-green-600 transition-colors border border-transparent hover:border-green-200 px-2 py-1 rounded">
                               <ArrowRightCircle size={14} className="mr-1" /> Finish {job.current_step}
                             </button>
                          )}
                        </td>
                        <td className="px-6 py-4"><Link href={`/dashboard/jobs/${job.id}`} className="text-black font-bold hover:underline">View Ticket</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
               {jobs.map((job) => (<StatusCard key={job.id} job={job} />))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---
function NavItem({ icon, label, active = false, href = '#' }: { icon: any, label: string, active?: boolean, href?: string }) {
  return (
    <Link href={href} className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
      <span className={`${active ? 'text-black' : 'text-gray-400'} mr-3`}>{icon}</span>
      {label}
    </Link>
  );
}
function StatusCard({ job }: { job: Job }) {
  const styles: any = { 'Pending Review': 'bg-amber-100 text-amber-700', 'In Production': 'bg-emerald-100 text-emerald-700' };
  return (
    <Link href={`/dashboard/jobs/${job.id}`}>
      <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-black hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[job.status] || 'bg-blue-100 text-blue-700'}`}>{job.status}</div>
          <span className="text-xs font-mono text-gray-400">#{job.id.substring(0,6).toUpperCase()}</span>
        </div>
        <h4 className="mt-4 text-lg font-bold text-gray-900 truncate">{job.title}</h4>
        <div className="mt-1 flex items-center text-sm text-gray-500">{job.quantity} units</div>
      </div>
    </Link>
  );
}
