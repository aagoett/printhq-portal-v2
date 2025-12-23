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
  Hash
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

// Define what a "Job" looks like in your database
type Job = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  quantity: number;
  notes: string;
};

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for the UI
  const [isUploading, setIsUploading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // State for the new Job Form
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH REAL JOBS ON LOAD
  useEffect(() => {
    const fetchJobs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get jobs from the "jobs" table we created
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setJobs(data);
    };
    fetchJobs();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 2. TRIGGER FILE PICKER
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 3. FILE SELECTED -> OPEN POPUP (Don't upload yet!)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      // Auto-fill title with filename
      setJobTitle(e.target.files[0].name.split('.').slice(0, -1).join('.'));
      setShowModal(true);
    }
  };

  // 4. SUBMIT FORM -> UPLOAD FILE + CREATE JOB TICKET
  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // A. Upload File to Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: fileData, error: uploadError } = await supabase
        .storage
        .from('uploads')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // B. Create Database Record
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

      // C. Reset & Refresh
      setShowModal(false);
      setSelectedFile(null);
      setJobTitle('');
      setJobQty('');
      setJobNotes('');
      window.location.reload(); // Refresh to show new job

    } catch (error) {
      console.error('Error creating job:', error);
      alert('Something went wrong. Check console.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      
      {/* --- MODAL POPUP --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Job Details</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitJob} className="p-6 space-y-5">
              {/* File Preview Card */}
              <div className="flex items-center p-4 bg-blue-50 rounded-xl text-blue-900 border border-blue-100">
                <FileText size={20} className="mr-3 text-blue-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Selected File</p>
                  <p className="font-medium truncate max-w-[250px]">{selectedFile?.name}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Job Title</label>
                <input 
                  type="text" 
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input 
                      type="number" 
                      required
                      value={jobQty}
                      onChange={(e) => setJobQty(e.target.value)}
                      placeholder="1000"
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date (Optional)</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes / Finishing</label>
                <textarea 
                  rows={3}
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Paper stock, folding, shipping address..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
              >
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <UploadCloud className="mr-2" size={20} />}
                {isUploading ? 'Uploading Job...' : 'Submit Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-20 items-center px-8 border-b border-gray-100">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xs">PHQ</span>
          </div>
          <span className="font-bold text-lg tracking-tight">PrintHQ</span>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active />
          <NavItem icon={<FileText size={20} />} label="My Jobs" />
          <NavItem icon={<Clock size={20} />} label="Quote History" />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Sign out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-12">
          
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-gray-500">Welcome back. Ready to print?</p>
            </div>
            <button 
              onClick={handleUploadClick} 
              className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
            >
              + New Request
            </button>
          </div>

          {/* UPLOAD HERO */}
          <div className="relative group cursor-pointer" onClick={handleUploadClick}>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept=".pdf,.ai,.psd,.indd,.jpg,.png"
            />
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex h-80 w-full flex-col items-center justify-center rounded-2xl bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 transition-all duration-300 shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-gray-900">Upload a new job</h3>
              <p className="mt-2 text-gray-500 max-w-sm text-center">
                Drag and drop your print files here, or click to browse.
              </p>
              <button className="mt-8 rounded-full bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all">
                Select Files
              </button>
            </div>
          </div>

          {/* REAL JOB LIST */}
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Jobs</h3>
            
            {jobs.length === 0 ? (
              // EMPTY STATE (If no jobs exist yet)
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <p className="text-gray-400 mb-2">No active jobs found.</p>
                <p className="text-sm text-gray-500">Upload your first file to get started!</p>
              </div>
            ) : (
              // LIST OF CARDS
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                   <StatusCard 
                     key={job.id}
                     status={job.status}
                     title={job.title} 
                     id={`#${job.id.substring(0,6).toUpperCase()}`} 
                     date={new Date(job.created_at).toLocaleDateString()}
                     quantity={job.quantity}
                     color={job.status === 'Pending Review' ? 'yellow' : 'green'}
                   />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components
function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <a href="#" className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
      <span className={`${active ? 'text-black' : 'text-gray-400'} mr-3`}>{icon}</span>
      {label}
    </a>
  );
}

function StatusCard({ status, title, id, date, quantity, color }: any) {
  const colors: any = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${colors[color] || colors.blue}`}>
          {status}
        </div>
        <span className="text-xs font-mono text-gray-400">{id}</span>
      </div>
      <h4 className="mt-4 text-lg font-bold text-gray-900 truncate">{title}</h4>
      <div className="mt-1 flex items-center text-sm text-gray-500">
        <span className="font-medium text-gray-900 mr-1">{quantity}</span> units
      </div>
      <div className="mt-4 flex items-center text-xs text-gray-400 border-t border-gray-50 pt-3">
        <Clock size={12} className="mr-1.5" />
        Submitted {date}
      </div>
    </div>
  );
}
