'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, 
  Clock, MessageSquare, Layers, 
  Activity, Lock, X, UploadCloud, Maximize2, PlayCircle, 
  ArrowDown, Truck, Check, Ruler, Edit2, Plus, Trash2, LogOut,
  ArrowUp, Calendar as CalendarIcon, FileImage, ThumbsUp, CheckCircle,
  AlertCircle, StickyNote
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ... } from '@/app/server-actions';

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter(); 
  
  // --- STATE ---
  const [job, setJob] = useState<any>(null);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]); 
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]); 
  const [assets, setAssets] = useState<any[]>([]);
  const [jobNotes, setJobNotes] = useState<any[]>([]); // NEW: List of notes
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // --- DROPDOWNS ---
  const [allQueues, setAllQueues] = useState<any[]>([]);
  const [allSubTasks, setAllSubTasks] = useState<any[]>([]);
  const [filteredSubTasks, setFilteredSubTasks] = useState<any[]>([]);
  
  // --- ADD STEP STATE ---
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedSubTaskName, setSelectedSubTaskName] = useState('');
  const [newStepNotes, setNewStepNotes] = useState(''); 

  // --- UI STATE ---
  const [rightTab, setRightTab] = useState<'chat' | 'activity'>('chat'); 
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false); 

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('unknown');
  const [viewingAssetId, setViewingAssetId] = useState<string>('');

  const [newMessage, setNewMessage] = useState('');
  const [newJobNote, setNewJobNote] = useState(''); // NEW: Input for job notes
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- HELPER: GET COUNTDOWN ---
  const getCountdown = () => {
      if (!job?.due_date) return { text: "NO DATE", color: "bg-gray-700", textCol: "text-gray-400" };
      const due = new Date(job.due_date);
      const now = new Date();
      due.setHours(23, 59, 59, 999);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { text: `${Math.abs(diffDays)} DAYS LATE`, color: "bg-red-600", textCol: "text-white animate-pulse" };
      if (diffDays === 0) return { text: "DUE TODAY", color: "bg-orange-500", textCol: "text-white" };
      return { text: `${diffDays} DAYS LEFT`, color: "bg-emerald-500", textCol: "text-white" };
  };

  useEffect(() => {
    fetchPageData();
    fetchSettings();

    const chatChannel = supabase.channel('job_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, () => fetchMessages())
      .subscribe();
      
    const assetChannel = supabase.channel('job_assets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_assets', filter: `job_id=eq.${params.id}` }, () => fetchAssets())
      .subscribe();

    const logChannel = supabase.channel('job_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_logs', filter: `job_id=eq.${params.id}` }, () => fetchLogs())
      .subscribe();
      
    const stepChannel = supabase.channel('job_steps')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_steps', filter: `job_id=eq.${params.id}` }, () => fetchWorkflow())
      .subscribe();
      
    // Listen for new notes
    const notesChannel = supabase.channel('job_notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_notes', filter: `job_id=eq.${params.id}` }, () => fetchJobNotes())
      .subscribe();

    return () => { 
      supabase.removeChannel(chatChannel); 
      supabase.removeChannel(assetChannel);
      supabase.removeChannel(logChannel);
      supabase.removeChannel(stepChannel);
      supabase.removeChannel(notesChannel);
    };
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, logs, rightTab]);

  // Smart Filtering for Sub-Tasks
  useEffect(() => {
      if (selectedQueueId && allSubTasks.length > 0) {
          const subs = allSubTasks.filter(t => t.queue_id === selectedQueueId);
          setFilteredSubTasks(subs);
          if (subs.length > 0) setSelectedSubTaskName(subs[0].name);
          else setSelectedSubTaskName(''); 
      }
  }, [selectedQueueId, allSubTasks]);

  const fetchSettings = async () => {
      const { data: qData } = await supabase.from('production_queues').select('*').order('sort_order');
      const { data: sData } = await supabase.from('production_subqueues').select('*').order('sort_order');
      if (qData) {
          setAllQueues(qData);
          if (qData.length > 0) setSelectedQueueId(qData[0].id);
      }
      if (sData) setAllSubTasks(sData);
  };

  const fetchPageData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, first_name').eq('id', user.id).single();
        setIsAdmin(profile?.role === 'admin');
        setCurrentUserName(profile?.first_name || user.email || 'User'); 
    }

    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, orders(brands(name)), profiles:user_id(first_name, last_name, email, company, phone)')
      .eq('id', params.id)
      .single();
    
    setJob(jobData);

    await fetchWorkflow();
    await fetchAssets();
    await fetchMessages();
    await fetchLogs();
    await fetchJobNotes(); // NEW
    setLoading(false);
  };

  const fetchWorkflow = async () => {
      const { data } = await supabase.from('job_steps').select('*').eq('job_id', params.id).order('step_order', { ascending: true });
      if (data) setWorkflowSteps(data);
  };

  const fetchJobNotes = async () => {
      const { data } = await supabase.from('job_notes').select('*').eq('job_id', params.id).order('created_at', { ascending: true });
      if (data) setJobNotes(data);
  };

  const fetchAssets = async () => {
    const { data } = await supabase.from('job_assets').select('*, profiles(first_name, email)').eq('job_id', params.id).order('created_at', { ascending: false });
    if (data && data.length > 0) {
        setAssets(data);
        if (!viewingAssetId) {
             const approved = data.find((a: any) => a.status === 'approved');
             loadPreview(approved || data[0]);
        }
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*, profiles(email, first_name, role)').eq('job_id', params.id).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('job_logs').select('*, profiles(first_name, role)').eq('job_id', params.id).order('created_at', { ascending: true });
    if (data) setLogs(data);
  };

  const logActivity = async (action: string, details: string) => {
      if (!user) return;
      await supabase.from('job_logs').insert({ job_id: params.id, user_id: user.id, action, details });
      fetchLogs();
  };

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      router.push('/login');
  };

  const loadPreview = async (asset: any) => {
      if (!asset) return;
      setViewingAssetId(asset.id);
      const { data } = await supabase.storage.from('uploads').createSignedUrl(asset.file_url, 3600);
      if (data?.signedUrl) {
          setPreviewUrl(data.signedUrl);
          const lower = asset.file_url.toLowerCase();
          if (lower.match(/\.(jpg|jpeg|png|webp)$/)) setPreviewType('image');
          else if (lower.endsWith('.pdf')) setPreviewType('pdf');
          else setPreviewType('other');
      }
  };

  const loadOriginalSource = async () => {
      if (!job?.file_url) return;
      setViewingAssetId('source'); 
      const { data } = await supabase.storage.from('uploads').createSignedUrl(job.file_url, 3600);
      if (data?.signedUrl) {
          setPreviewUrl(data.signedUrl);
          const lower = job.file_url.toLowerCase();
          if (lower.match(/\.(jpg|jpeg|png|webp)$/)) setPreviewType('image');
          else if (lower.endsWith('.pdf')) setPreviewType('pdf');
          else setPreviewType('other');
      }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      if (!newDate) return;
      setJob({ ...job, due_date: newDate });
      await supabase.from('jobs').update({ due_date: newDate }).eq('id', params.id);
      await logActivity('Deadline Updated', `New date: ${newDate}`);
  };

  const handleGenerateWorkflow = async () => {
      const { data: standardQueues } = await supabase.from('production_queues').select('*').order('sort_order');
      if (!standardQueues || standardQueues.length === 0) {
          alert("No workflow settings found! Please go to Settings to configure your queues.");
          return;
      }
      for (let i = 0; i < standardQueues.length; i++) {
          const q = standardQueues[i];
          await supabase.from('job_steps').insert({
              job_id: params.id,
              name: q.name, 
              department: q.name,
              status: i === 0 ? 'Pending' : 'Waiting',
              step_order: i + 1
          });
      }
      await fetchWorkflow();
  };

  const handleCompleteStep = async (step: any) => {
      await supabase.from('job_steps').update({ status: 'Completed', completed_at: new Date().toISOString() }).eq('id', step.id);
      const nextStep = workflowSteps.find(s => s.step_order > step.step_order);
      if (nextStep) {
          await supabase.from('job_steps').update({ status: 'Pending' }).eq('id', nextStep.id);
          await supabase.from('jobs').update({ status: nextStep.department }).eq('id', params.id);
      } else {
          await supabase.from('jobs').update({ status: 'Completed' }).eq('id', params.id);
      }
      await logActivity('Step Completed', `Completed: ${step.name}`);
      fetchWorkflow();
      fetchPageData(); 
  };

  // --- ADD STEP WITH NOTES ---
  const handleAddStep = async () => {
      const parentQueue = allQueues.find(q => q.id === selectedQueueId);
      const finalName = selectedSubTaskName || parentQueue?.name;
      const finalDept = parentQueue?.name || 'Production';

      if (!finalName) return;

      const maxOrder = workflowSteps.length > 0 ? Math.max(...workflowSteps.map(s => s.step_order)) : 0;
      
      const { error } = await supabase.from('job_steps').insert({
          job_id: params.id,
          name: finalName,
          department: finalDept,
          notes: newStepNotes, 
          status: 'Waiting', 
          step_order: maxOrder + 1
      });

      if (error) {
          alert("Error adding step: " + error.message);
      } else {
          setNewStepNotes(''); 
          await logActivity('Workflow Updated', `Added step: ${finalName}`);
          fetchWorkflow();
      }
  };

  const handleDeleteStep = async (stepId: string) => {
      if (!confirm("Remove this step?")) return;
      await supabase.from('job_steps').delete().eq('id', stepId);
      await logActivity('Workflow Updated', `Removed a step`);
      fetchWorkflow();
  };

  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
      const newSteps = [...workflowSteps];
      if (direction === 'up' && index > 0) {
          const temp = newSteps[index];
          newSteps[index] = newSteps[index - 1];
          newSteps[index - 1] = temp;
      } else if (direction === 'down' && index < newSteps.length - 1) {
          const temp = newSteps[index];
          newSteps[index] = newSteps[index + 1];
          newSteps[index + 1] = temp;
      } else {
          return;
      }
      setWorkflowSteps(newSteps);
      for (let i = 0; i < newSteps.length; i++) {
          await supabase.from('job_steps').update({ step_order: i + 1 }).eq('id', newSteps[i].id);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setUploadFile(e.target.files[0]);
  };

  const handleSubmitProof = async () => {
      if (!uploadFile || !user) return;
      setIsUploading(true);
      try {
          const fileName = `${params.id}-proof-${Math.random().toString(36).substring(7)}.${uploadFile.name.split('.').pop()}`;
          const { data, error } = await supabase.storage.from('uploads').upload(fileName, uploadFile);
          if (error) throw new Error("Storage Upload failed");

          await supabase.from('job_assets').update({ status: 'archived' }).eq('job_id', params.id).eq('asset_type', 'proof').neq('status', 'archived');

          const { data: newAsset } = await supabase.from('job_assets').insert({
              job_id: params.id, uploader_id: user.id, file_url: data?.path, file_name: uploadFile.name, asset_type: 'proof', status: 'pending'
          }).select().single();

          if (uploadMessage.trim()) {
              await supabase.from('messages').insert({ 
                  job_id: params.id, user_id: user.id, content: `PROOF SENT: ${uploadMessage}`, sender_name: currentUserName
              });
          }
          await sendProofNotification(params.id, data?.path || '', uploadMessage);
          await logActivity('Proof Uploaded', `New version sent.`);

          if (newAsset) { 
              const { data: refreshed } = await supabase.from('job_assets').select('*, profiles(first_name, email)').eq('job_id', params.id).order('created_at', { ascending: false });
              if (refreshed) setAssets(refreshed);
              loadPreview(newAsset); 
          }
          setShowUploadModal(false); setUploadFile(null); setUploadMessage('');
          alert("Proof sent!");
      } catch (error: any) { alert("Error: " + error.message); } finally { setIsUploading(false); }
  };

  const handleApproveProof = async (assetId: string) => {
      if (!confirm("Confirm Approval?")) return;
      await supabase.from('job_assets').update({ status: 'approved' }).eq('id', assetId);
      await supabase.from('jobs').update({ status: 'In Production' }).eq('id', params.id);
      
      const msg = isAdmin ? 'Admin overrode approval.' : 'Customer approved proof.';
      await logActivity('Proof Approved', msg);
      await supabase.from('messages').insert({ 
          job_id: params.id, user_id: user.id, content: "✅ APPROVED FOR PRODUCTION", sender_name: currentUserName
      });
      fetchPageData();
  };

  const handleSendMessage = async () => {
    if (!user) { alert("Error: Logged out."); return; }
    if (!newMessage.trim()) return;

    const msgContent = newMessage;
    setNewMessage(''); 

    const { error } = await supabase.from('messages').insert({ 
        job_id: params.id, user_id: user.id, content: msgContent, sender_name: currentUserName
    });
    if (!error) fetchMessages();
  };

  // --- NEW: ADD INSTRUCTION NOTE ---
  const handleAddJobNote = async () => {
      if (!newJobNote.trim()) return;
      setIsSaving(true);
      await supabase.from('job_notes').insert({ job_id: params.id, content: newJobNote, user_id: user.id });
      setNewJobNote('');
      fetchJobNotes();
      setIsSaving(false);
  };

  // --- NEW: DELETE INSTRUCTION NOTE ---
  const handleDeleteJobNote = async (noteId: string) => {
      if (!confirm('Remove this instruction?')) return;
      await supabase.from('job_notes').delete().eq('id', noteId);
      fetchJobNotes();
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  const currentDepartment = job.status;
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  const isPendingProof = currentAsset?.asset_type === 'proof' && currentAsset?.status === 'pending';
  const brandName = job.orders?.brands?.name || 'Pacific Printing';
  const jobTitle = job.title || job.project_name || 'Job Details';

  const originalAsset = assets.length > 0 ? [...assets].reverse().find(a => a.asset_type === 'source') : null;
  const hasOriginalFile = !!originalAsset || !!job.file_url;

  const activeStepItem = workflowSteps.find(s => s.status === 'Pending');
  const countdown = getCountdown(); 

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      
      {/* UPLOAD MODAL */}
      {showUploadModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">Send New Proof</h3>
                    <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <UploadCloud className={`mx-auto h-10 w-10 mb-2 ${uploadFile ? 'text-green-600' : 'text-gray-400'}`} />
                        {uploadFile ? (<p className="font-bold text-green-700 text-sm truncate">{uploadFile.name}</p>) : (<p className="text-sm font-bold text-gray-600">Click to Select File</p>)}
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Message to Customer</label>
                        <textarea value={uploadMessage} onChange={(e) => setUploadMessage(e.target.value)} placeholder="e.g. Please check the spelling..." className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-black h-24 resize-none" />
                    </div>
                    <button onClick={handleSubmitProof} disabled={!uploadFile || isUploading} className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!uploadFile || isUploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800 shadow-lg'}`}>
                        {isUploading ? 'Sending...' : 'Send Proof'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={20} /></Link>
             <div>
               <h1 className="text-xl font-bold text-gray-900 leading-none">{jobTitle}</h1>
               <p className="text-xs font-mono text-gray-400 mt-1">#{job.id.substring(0,8).toUpperCase()} • {brandName}</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-2 border border-gray-200 hover:border-red-200">
                <LogOut size={16} />
                Sign Out
             </button>
          </div>
        </div>
      </div>

       {/* ADMIN COMMAND CENTER */}
       {isAdmin && (
           <div className="bg-gray-900 text-white shadow-xl border-b-4 border-blue-500">
              <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-700">
                  <div className="p-6 md:w-1/4">
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-1">Current Department</p>
                      <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-white">{currentDepartment}</h1>
                  </div>
                  <div className="p-6 md:w-2/4 flex flex-col justify-center">
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-2">Active Task</p>
                      {activeStepItem ? (
                          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3 border border-gray-700">
                              <div className="flex items-center gap-3">
                                  <div className="bg-blue-500 text-white p-2 rounded-full"><Activity size={18}/></div>
                                  <div>
                                      <p className="font-bold text-lg leading-none">{activeStepItem.name}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">{activeStepItem.department}</p>
                                  </div>
                              </div>
                              <button onClick={() => handleCompleteStep(activeStepItem)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-all">
                                  Complete Step <ArrowLeft size={14} className="rotate-180"/>
                              </button>
                          </div>
                      ) : (
                          <div className="text-gray-500 italic text-sm">No active steps. Workflow complete or not started.</div>
                      )}
                  </div>
                  <div className="p-6 md:w-1/4 flex flex-col justify-center items-end">
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-1 flex items-center gap-1"><CalendarIcon size={12}/> Production Deadline</p>
                      <input 
                        type="date" 
                        value={job.due_date ? new Date(job.due_date).toISOString().split('T')[0] : ''}
                        onChange={handleDateChange}
                        className="bg-gray-800 text-white font-bold text-lg px-3 py-1 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
                      />
                  </div>
              </div>
          </div>
       )}

      <div className="flex-1 max-w-[1920px] mx-auto w-full p-6 space-y-6">
        
        {/* ROW 1: THE JOB TICKET */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* SPECS - IMPROVED */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-3 flex items-center gap-2"><Layers size={12}/> Job Specs</h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm items-baseline border-b border-gray-50 pb-1">
                        <span className="text-gray-500">Qty</span>
                        <span className="font-bold text-lg">{job.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm items-baseline border-b border-gray-50 pb-1">
                        <span className="text-gray-500">Size</span>
                        <span className="font-bold">{job.size || 'N/A'}</span>
                    </div>
                    <div className="pt-1">
                        <span className="text-gray-500 text-xs block mb-1">Stock / Material</span>
                        <span className="font-bold text-sm block leading-tight break-words">{job.paper_stock}</span>
                    </div>
                </div>
            </div>

            {/* PRODUCTION NOTES - UPGRADED TO LIST */}
            <div className="bg-yellow-50 rounded-lg border border-yellow-300 p-4 md:col-span-2 flex flex-col shadow-sm relative overflow-hidden h-64">
                <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400"></div>
                <div className="pl-4 h-full flex flex-col">
                    <h3 className="text-xs font-bold uppercase text-yellow-800 mb-2 flex items-center gap-2"><StickyNote size={14}/> Special Instructions</h3>
                    
                    {/* NOTES LIST */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-2">
                        {jobNotes.length === 0 && <div className="text-yellow-800/50 text-xs italic">No special instructions yet.</div>}
                        {jobNotes.map(note => (
                            <div key={note.id} className="bg-white/60 p-2 rounded border border-yellow-200 text-sm shadow-sm relative group">
                                <p className="text-yellow-900 font-medium pr-6">{note.content}</p>
                                <span className="text-[10px] text-yellow-600 block mt-1">{new Date(note.created_at).toLocaleDateString()} • {new Date(note.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                <button onClick={() => handleDeleteJobNote(note.id)} className="absolute top-1 right-1 text-yellow-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={14}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* ADD NOTE INPUT */}
                    <div className="flex gap-2 mt-auto pt-2 border-t border-yellow-200">
                        <input 
                            type="text" 
                            value={newJobNote} 
                            onChange={(e) => setNewJobNote(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleAddJobNote()}
                            placeholder="Add new instruction..."
                            className="flex-1 bg-white border border-yellow-300 rounded px-3 py-1 text-sm focus:outline-none focus:border-yellow-500"
                        />
                        <button onClick={handleAddJobNote} disabled={!newJobNote.trim() || isSaving} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-3 py-1 rounded text-xs shadow-sm">
                            Add Note
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2 flex items-center gap-2"><Truck size={12}/> Ship To</h3>
                <div className="text-xs text-gray-700">
                    <p className="font-bold">{job.shipping_name || job.profiles?.first_name || 'Customer'}</p>
                    <p>{job.shipping_address1}</p>
                    <p>{job.shipping_city}, {job.shipping_state} {job.shipping_zip}</p>
                </div>
            </div>
        </div>

        {/* ROW 2: WORKFLOW & DETAILS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COL 1: The Workflow Ladder */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><ArrowDown size={18}/> Production Path</h3>
                     <button onClick={() => setIsEditingWorkflow(!isEditingWorkflow)} className={`p-2 rounded hover:bg-gray-100 ${isEditingWorkflow ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                        <Edit2 size={16}/>
                     </button>
                </div>
                
                {workflowSteps.length === 0 ? (
                    <button onClick={handleGenerateWorkflow} className="w-full py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 hover:border-gray-400 flex flex-col items-center justify-center gap-2 transition-all">
                        <PlayCircle size={24}/> Start Workflow
                    </button>
                ) : (
                    <div className="space-y-0 relative pl-4">
                        {!isEditingWorkflow && <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-gray-100 z-0"></div>}
                        
                        {workflowSteps.map((step, index) => {
                            const isPending = step.status === 'Pending';
                            const isCompleted = step.status === 'Completed';
                            return (
                                <div key={step.id} className="relative z-10 flex gap-4 pb-6 last:pb-0 group items-start">
                                    {isEditingWorkflow ? (
                                        <div className="flex flex-col gap-1 items-center">
                                            {index > 0 && <button onClick={() => handleMoveStep(index, 'up')} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ArrowUp size={12}/></button>}
                                            {index < workflowSteps.length - 1 && <button onClick={() => handleMoveStep(index, 'down')} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ArrowDown size={12}/></button>}
                                            <button onClick={() => handleDeleteStep(step.id)} className="mt-1 text-red-300 hover:text-red-600 p-1 bg-red-50 rounded"><Trash2 size={14}/></button>
                                        </div>
                                    ) : (
                                        <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center bg-white shadow-sm ${isCompleted ? 'border-green-500 text-green-500' : isPending ? 'border-blue-500 text-blue-500 ring-4 ring-blue-50' : 'border-gray-200 text-gray-200'}`}>
                                            {isCompleted ? <Check size={14} strokeWidth={4}/> : <div className={`w-2 h-2 rounded-full ${isPending ? 'bg-blue-500' : 'bg-gray-200'}`}></div>}
                                        </div>
                                    )}
                                    <div className="flex-1 pt-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`text-sm font-bold ${!isEditingWorkflow && isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{step.name}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{step.department}</p>
                                                
                                                {step.notes && (
                                                    <div className="mt-2 text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 flex items-start gap-2">
                                                        <AlertCircle size={14} className="text-gray-400 shrink-0 mt-0.5"/>
                                                        <span className="italic">{step.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {isCompleted && step.completed_at && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-mono">{new Date(step.completed_at).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {isEditingWorkflow && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Add Custom Step</p>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <select value={selectedQueueId} onChange={(e) => setSelectedQueueId(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white font-bold w-1/3">
                                            {allQueues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                                        </select>
                                        <select value={selectedSubTaskName} onChange={(e) => setSelectedSubTaskName(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white w-2/3 disabled:bg-gray-100" disabled={filteredSubTasks.length === 0}>
                                            {filteredSubTasks.length > 0 ? (
                                                filteredSubTasks.map((t) => (
                                                    <option key={t.id} value={t.name}>
                                                        {t.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">{allQueues.find(q => q.id === selectedQueueId)?.name || 'Generic'}</option>
                                            )}
                                        </select>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Specific Instructions... (e.g. Use 2400dpi, Box in 50s)"
                                            value={newStepNotes}
                                            onChange={(e) => setNewStepNotes(e.target.value)}
                                            className="flex-1 border rounded px-3 py-2 text-sm"
                                        />
                                        <button onClick={handleAddStep} className="bg-black text-white px-4 rounded font-bold"><Plus size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* COL 2: RIGHT SIDE PANEL (Chat & Activity) */}
            <div className="flex flex-col gap-4">
                
                {/* ORIGINAL SOURCE FILE */}
                {hasOriginalFile ? (
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-500 text-white p-3 rounded-lg"><FileText size={24}/></div>
                            <div>
                                <h3 className="font-bold text-blue-900 text-sm">Original Source File</h3>
                                <p className="text-xs text-blue-700 truncate w-48">{originalAsset?.file_name || 'View Source File'}</p>
                            </div>
                        </div>
                        <button onClick={loadOriginalSource} className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50">
                            Download / View
                        </button>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400 italic">No source file attached.</div>
                )}

                {/* RESTORED: TABBED INTERFACE */}
                <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-[400px]">
                    <div className="flex border-b border-gray-200">
                        <button 
                            onClick={() => setRightTab('chat')} 
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'chat' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}
                        >
                            <MessageSquare size={14}/> Discussion
                        </button>
                        <button 
                            onClick={() => setRightTab('activity')} 
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'activity' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}
                        >
                            <Activity size={14}/> Audit Log
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                        {rightTab === 'chat' && (
                            <>
                                {messages.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No messages yet.</div>}
                                {messages.map((msg) => {
                                    const isMe = msg.user_id === user?.id;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${isMe ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.content}</div>
                                            <span className="text-[9px] text-gray-400 mt-0.5">{msg.sender_name || 'User'}</span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}

                        {rightTab === 'activity' && (
                            <>
                                {logs.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No activity yet.</div>}
                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-3 text-xs pb-3 border-b border-gray-50 last:border-0">
                                        <div className="mt-0.5 min-w-[30px] text-gray-400 font-mono text-[9px]">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                        <div>
                                            <p className="font-bold text-gray-900">{log.action}</p>
                                            <p className="text-gray-500">{log.details}</p>
                                            <p className="text-[9px] text-blue-400 mt-0.5">{log.profiles?.first_name || 'System'}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </>
                        )}
                    </div>

                    {rightTab === 'chat' && (
                        <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 rounded border border-gray-300 text-xs focus:outline-none focus:border-black" placeholder="Type message..." />
                            <button onClick={handleSendMessage} className="bg-black text-white p-2 rounded hover:bg-gray-800"><Send size={14} /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ROW 3: THE PREVIEW (Bottom) */}
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isApprovedAsset ? 'border-green-400 ring-4 ring-green-50' : 'border-gray-200'}`}>
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-lg text-gray-900">Artwork Preview</h3>
                    <span className="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded border">{currentAsset?.file_name || 'No Proof Selected'}</span>
                </div>
                <div className="flex items-center gap-2">
                        {isAdmin && <button onClick={() => setShowUploadModal(true)} className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-bold">+ New Version</button>}
                        {previewUrl && <a href={previewUrl} target="_blank" className="text-xs font-bold flex items-center gap-1 text-gray-600 hover:text-black bg-white border px-3 py-1.5 rounded-lg"><Maximize2 size={14}/> Fullscreen</a>}
                        {previewUrl && <a href={previewUrl} download className="text-xs font-bold flex items-center gap-1 text-gray-600 hover:text-black bg-white border px-3 py-1.5 rounded-lg"><Download size={14}/> Download</a>}
                </div>
            </div>
            <div className="bg-gray-100 h-[600px] flex items-center justify-center p-8 overflow-auto">
                {!previewUrl ? (
                    <div className="text-gray-400 flex flex-col items-center">
                        <FileImage size={48} className="mb-4 opacity-20"/>
                        <p>Select a file or upload a proof to view.</p>
                    </div>
                ) : previewType === 'image' ? (
                    <img src={previewUrl} className="max-w-full max-h-full shadow-2xl border-4 border-white rounded-lg" />
                ) : (
                    <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full shadow-2xl bg-white rounded-lg" />
                )}
            </div>
            
            <div className="bg-white border-t border-gray-200 p-4 flex gap-4 overflow-x-auto">
                 {assets.map((asset) => (
                    <div key={asset.id} onClick={() => loadPreview(asset)} className={`flex-shrink-0 w-32 p-2 rounded border cursor-pointer text-center ${viewingAssetId === asset.id ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100' : 'hover:bg-gray-50'}`}>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">{asset.status}</div>
                        <div className="text-xs truncate font-medium">{asset.file_name}</div>
                        <div className="text-[9px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</div>
                    </div>
                 ))}
            </div>
        </div>

      </div>
    </div>
  );
}
