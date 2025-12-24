'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, FileText, Clock, Settings, LogOut, LayoutDashboard, 
  Loader2, X, Search, Scissors, User
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
  folding_type?: string;
};

type Profile = {
  id: string;
  email: string;
  role: string;
};

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- STATE ---
  const [role, setRole] = useState('customer'); // 'admin', 'staff', 'customer'
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]); // List of customers for Staff
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form Fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); // For Staff Entry
  
  // Specs State
  const [paperStock, setPaperStock] = useState('100lb Gloss Text');
  const [printSize, setPrintSize] = useState('8.5 x 11');
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [needsFolding, setNeedsFolding] = useState(false);
  const [foldType, setFoldType] = useState('Tri-Fold');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Check Role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email, id')
        .eq('id', user.id)
        .single();
      
      const userRole = profile?.role || 'customer';
      setRole(userRole);
      
      const isInternal = userRole === 'admin' || userRole === 'staff';

      // Fetch Jobs
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (!isInternal) query = query.eq('user_id', user.id); // Customers only see theirs

      const { data: jobsData } = await query;
      if (jobsData) setJobs(jobsData);

      // If Staff, fetch Customer List for the dropdown
      if (isInternal) {
        const { data: customerData } = await supabase
          .from('profiles')
          .select('id, email, role')
          .order('email'); // Ideally filter where role != admin
        if (customerData) setCustomers(customerData);
        // Default to self just in case
        setSelectedCustomerId(user.id);
      } else {
        setSelectedCustomerId(user.id);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setJobTitle(e.target.files[0].name.split('.').slice(0, -1).join('.'));
      setShowModal(true);
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // 1. Upload File
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fileName, selectedFile);
      if (uploadError) throw uploadError;

      // 2. Create DB Record (Use selectedCustomerId!)
      const { data: newJob, error: dbError } = await supabase
        .from('jobs')
        .insert({
          user_id: selectedCustomerId, // <--- THIS IS THE MAGIC. Staff can set this to anyone.
          title: jobTitle,
          quantity: parseInt(jobQty) || 0,
          notes: jobNotes,
          file_url: fileData?.path,
          status: 'Pending Review',
          paper_stock: paperStock,
          print_size: printSize,
          print_sides: isDoubleSided ? 'Double Sided' : 'Single Sided',
          folding_type: needsFolding ? foldType : 'None'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. SEND EMAIL (To the CUSTOMER, not necessarily the logged in staff)
      // We need to find the email of the selectedCustomerId
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      
      // If Staff entered it, selectedCustomer exists. If Customer entered it, look at session.
      let targetEmail = selectedCustomer?.email; 
      if (!targetEmail) {
         const { data: { user } } = await supabase.auth.getUser();
         targetEmail = user?.email;
      }

      if (targetEmail && newJob) {
        console.log("Sending email to:", targetEmail);
        await sendOrderConfirmation(targetEmail, newJob.id, jobTitle);
      }

      setShowModal(false);
      window.location.reload(); 

    } catch (error) {
      console.error('Error:', error);
      alert('Error uploading job.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isInternal = role === 'admin' || role === 'staff';

  return (
    <div className="flex h-screen bg-gray-50 relative">
      
      {/* --- SMART UPLOAD MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">New Production Ticket</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitJob} className="p-6 space-y-6">
              
              {/* STAFF ONLY: CUSTOMER SELECTOR */}
              {isInternal && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <label className="block text-xs font-bold uppercase text-yellow-800 mb-2 flex items-center">
                    <User size={14} className="mr-1"/> Entering Order On Behalf Of:
                  </label>
                  <select 
                    value={selectedCustomerId} 
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.email} {c.role !== 'customer' ? `(${c.role.toUpperCase()})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-yellow-700 mt-2">The selected user will receive the "Order Received" email.</p>
                </div>
              )}

              {/* 1. File Preview */}
              <div className="flex items-center p-3 bg-blue-50 rounded-xl text-blue-900 border border-blue-100">
                <FileText size={20} className="mr-3 text-blue-600" />
                <div>
                  <p className="text-xs font-bold uppercase text-blue-400">Selected File</p>
                  <p className="font-medium truncate max-w-[250px]">{selectedFile?.name}</p>
                </div>
              </div>

              {/* 2. Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Job Title</label>
                  <input type="text" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black" />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quantity</label>
                   <input type="number" required value={jobQty} onChange={(e) => setJobQty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black" />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Due Date</label>
                   <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black" />
                </div>
              </div>

              {/* Specs Section (Same as before) */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                  <Settings size={16} className="mr-2" /> Print Specifications
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Paper Stock</label>
                    <select value={paperStock} onChange={(e) => setPaperStock(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white outline-none focus:border-black">
                      <option>100lb Gloss Text</option>
                      <option>100lb Matte Text</option>
                      <option>80lb Gloss Cover</option>
                      <option>14pt Cardstock</option>
                      <option>16pt Cardstock</option>
                      <option>20lb Bond (Copy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Print Size</label>
                    <select value={printSize} onChange={(e) => setPrintSize(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white outline-none focus:border-black">
                      <option>8.5 x 11 (Letter)</option>
                      <option>11 x 17 (Tabloid)</option>
                      <option>4 x 6 (Postcard)</option>
                      <option>5 x 7</option>
                      <option>Business Card</option>
                      <option>Custom Size</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Double Sided Printing?</span>
                  <button type="button" onClick={() => setIsDoubleSided(!isDoubleSided)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDoubleSided ? 'bg-black' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDoubleSided ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      <Scissors size={16} className="mr-2 text-gray-500" /> Requires Folding?
                    </span>
                    <button type="button" onClick={() => setNeedsFolding(!needsFolding)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${needsFolding ? 'bg-black' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${needsFolding ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {needsFolding && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Select Fold Type</label>
                      <select value={foldType} onChange={(e) => setFoldType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white outline-none focus:border-black">
                        <option>Tri-Fold</option>
                        <option>Half-Fold</option>
                        <option>Z-Fold</option>
                        <option>Gate Fold</option>
                        <option>Double Parallel</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Additional Notes</label>
                 <textarea rows={2} value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} placeholder="Special shipping address, packaging instructions..." className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black" />
              </div>
              
              <button type="submit" disabled={isUploading} className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 flex items-center justify-center shadow-lg transition-transform active:scale-95">
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <UploadCloud className="mr-2" size={20} />}
                {isUploading ? 'Uploading & Creating Ticket...' : 'Submit Print Job'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-20 items-center px-8 border-b border-gray-100">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xs">PHQ</span>
          </div>
          <span className="font-bold text-lg tracking-tight">PrintHQ</span>
          {isInternal && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">{role}</span>}
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem icon={<LayoutDashboard size={20} />} label={isInternal ? "All Jobs" : "My Jobs"} active />
          {!isInternal && <NavItem icon={<FileText size={20} />} label="Quote History" />}
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleSignOut} className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={20} className="mr-3" /> Sign out
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-12">
          
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{isInternal ? 'Production Overview' : 'Dashboard'}</h1>
              <p className="mt-1 text-gray-500">{isInternal ? 'Manage incoming production queue.' : 'Welcome back. Ready to print?'}</p>
            </div>
            {/* BUTTON IS ALWAYS VISIBLE NOW - LOGIC IS IN HANDLER */}
            <button onClick={handleUploadClick} className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 shadow-lg transition-transform hover:scale-105">
              + New Order
            </button>
          </div>

          {isInternal ? (
            // STAFF/ADMIN TABLE VIEW
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Active Job Queue</h3>
                <div className="relative">
                    <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                    <input type="text" placeholder="Search..." className="pl-8 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-black" />
                </div>
              </div>
              {jobs.length === 0 ? <div className="p-8 text-center text-gray-400">No active jobs.</div> : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-3">Job ID</th>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Specs</th>
                      <th className="px-6 py-3">Qty</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map((job: any) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">#{job.id.substring(0,6).toUpperCase()}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                           {job.paper_stock}<br/>
                           {job.folding_type !== 'None' && <span className="text-blue-600 font-bold">{job.folding_type}</span>}
                        </td>
                        <td className="px-6 py-4">{job.quantity}</td>
                        <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                        <td className="px-6 py-4"><Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 font-medium hover:underline">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            // CUSTOMER CARD VIEW
            <>
              <div className="relative group cursor-pointer mb-12" onClick={handleUploadClick}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.ai,.psd,.indd,.jpg,.png" />
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative flex h-64 w-full flex-col items-center justify-center rounded-2xl bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 transition-all duration-300 shadow-sm">
                   <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">Upload a new job</h3>
                  <button className="mt-6 rounded-full bg-blue-600 px-6 py-2 font-semibold text-white shadow-lg hover:bg-blue-700">Select Files</button>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (<StatusCard key={job.id} job={job} />))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS --- (Same as before)
function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <a href="#" className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
      <span className={`${active ? 'text-black' : 'text-gray-400'} mr-3`}>{icon}</span>
      {label}
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = { 'Pending Review': 'bg-yellow-100 text-yellow-800', 'In Production': 'bg-purple-100 text-purple-800', 'Shipped': 'bg-green-100 text-green-800' };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
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
        <div className="mt-4 flex items-center text-xs text-gray-400 border-t border-gray-50 pt-3">
          <Clock size={12} className="mr-1.5" />
          {new Date(job.created_at).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
