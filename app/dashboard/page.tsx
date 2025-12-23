'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, 
  FileText, 
  Clock, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  Loader2,
  X,
  Calendar,
  Hash,
  Search,
  Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

// Define what a "Job" looks like in your database
type Job = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  quantity: number;
  notes: string;
  user_id: string;
};

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- STATE ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // 2. CHECK ROLE: Look up the user in the 'profiles' table
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      const _isAdmin = profile?.is_admin === true;
      setIsAdmin(_isAdmin);

      // 3. FETCH JOBS: Logic depends on Role
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!_isAdmin) {
        // Customers: Only see YOUR own jobs
        query = query.eq('user_id', user.id);
      }
      // Admins: Query is already set to fetch *everything* by default

      const { data } = await query;
      if (data) setJobs(data);
      
      setLoading(false);
    };
    init();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- UPLOAD HANDLERS ---
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Upload File
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: fileData, error: uploadError } = await supabase
        .storage
        .from('uploads')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Create DB Record
      const { error: dbError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          title: jobTitle,
          quantity: parseInt(jobQty) || 0,
          notes: jobNotes,
          file_url: fileData?.path,
          status: 'Pending Review'
        });

      if (dbError) throw dbError;

      // 3. Cleanup
      setShowModal(false);
      window.location.reload(); 

    } catch (error) {
      console.error('Error:', error);
      alert('Error uploading job. Check console details.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-gray-50 relative">
      
      {/* --- MODAL (Shared by both views) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">New Job Ticket</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitJob} className="p-6 space-y-5">
              <div className="flex items-center p-4 bg-blue-50 rounded-xl text-blue-900 border border-blue-100">
                <FileText size={20} className="mr-3 text-blue-600" />
                <p className="font-medium truncate max-w-[250px]">{selectedFile?.name}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Job Title</label>
                <input type="text" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quantity</label>
                   <input type="number" required value={jobQty} onChange={(e) => setJobQty(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black" />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Due Date</label>
                   <input type="date" className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black" />
                </div>
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Notes</label>
                 <textarea rows={3} value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} placeholder="Folding, shipping, stock..." className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black" />
              </div>
              <button type="submit" disabled={isUploading} className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 flex items-center justify-center">
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <UploadCloud className="mr-2" size={20} />}
                {isUploading ? 'Uploading...' : 'Submit Order'}
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
          {isAdmin && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">Admin</span>}
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem icon={<LayoutDashboard size={20} />} label={isAdmin ? "All Jobs" : "My Jobs"} active />
          {!isAdmin && <NavItem icon={<FileText size={20} />} label="Quote History" />}
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
              <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? 'Admin Overview' : 'Dashboard'}</h1>
              <p className="mt-1 text-gray-500">{isAdmin ? 'Manage all incoming production.' : 'Welcome back. Ready to print?'}</p>
            </div>
            {!isAdmin && (
              <button onClick={handleUploadClick} className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 shadow-lg transition-transform hover:scale-105">
                + New Request
              </button>
            )}
          </div>

          {/* === ADMIN VIEW (Table) === */}
          {isAdmin ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Active Job Queue</h3>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                    <input type="text" placeholder="Search jobs..." className="pl-8 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-black" />
                  </div>
                </div>
              </div>
              {jobs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No jobs found in the system.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-3">Job ID</th>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Qty</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">#{job.id.substring(0,6).toUpperCase()}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                        <td className="px-6 py-4">{job.quantity}</td>
                        <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                        <td className="px-6 py-4 text-gray-500">{new Date(job.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                            View Ticket
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            // === CUSTOMER VIEW (Cards) ===
            <>
              {/* Upload Hero */}
              <div className="relative group cursor-pointer mb-12" onClick={handleUploadClick}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.ai,.psd,.indd,.jpg,.png" />
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative flex h-64 w-full flex-col items-center justify-center rounded-2xl bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 transition-all duration-300 shadow-sm">
                   <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">Upload a new job</h3>
                  <p className="text-sm text-gray-500 mt-2">PDF, AI, PSD supported</p>
                  <button className="mt-6 rounded-full bg-blue-600 px-6 py-2 font-semibold text-white shadow-lg hover:bg-blue-700">Select Files</button>
                </div>
              </div>

              {/* Job Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                   <StatusCard key={job.id} job={job} />
                ))}
              </div>
              {jobs.length === 0 && (
                <p className="text-center text-gray-400 mt-8">No jobs yet. Upload your first file above!</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <a href="#" className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
      <span className={`${active ? 'text-black' : 'text-gray-400'} mr-3`}>{icon}</span>
      {label}
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'Pending Review': 'bg-yellow-100 text-yellow-800',
    'Proof Ready': 'bg-blue-100 text-blue-800',
    'In Production': 'bg-purple-100 text-purple-800',
    'Shipped': 'bg-green-100 text-green-800'
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
}

function StatusCard({ job }: { job: Job }) {
  const styles: any = {
    'Pending Review': 'bg-amber-100 text-amber-700',
    'In Production': 'bg-emerald-100 text-emerald-700',
  };
  return (
    <Link href={`/dashboard/jobs/${job.id}`}>
      <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-black hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[job.status] || 'bg-blue-100 text-blue-700'}`}>
            {job.status}
          </div>
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
