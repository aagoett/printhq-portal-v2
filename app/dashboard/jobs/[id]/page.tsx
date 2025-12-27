'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, 
  Clock, MessageSquare, Layers, 
  Activity, Lock, X, UploadCloud, Maximize2, PlayCircle, 
  ArrowDown, Truck, Check, Ruler, Edit2, Plus, Trash2, LogOut,
  ArrowUp, Calendar as CalendarIcon, FileImage, ThumbsUp, CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { sendProofNotification } from '../../../actions'; 

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter(); 
  
  // --- STATE ---
  const [job, setJob] = useState<any>(null);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]); 
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]); 
  const [assets, setAssets] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // --- DROPDOWNS ---
  const [allQueues, setAllQueues] = useState<any[]>([]);
  const [allSubTasks, setAllSubTasks] = useState<any[]>([]);
  const [filteredSubTasks, setFilteredSubTasks] = useState<any[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedSubTaskName, setSelectedSubTaskName] = useState('');

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'notes' | 'chat'>('notes'); 
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false); 

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('unknown');
  const [viewingAssetId, setViewingAssetId] = useState<string>('');

  const [newMessage, setNewMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

    return () => { 
      supabase.removeChannel(chatChannel); 
      supabase.removeChannel(assetChannel);
      supabase.removeChannel(logChannel);
      supabase.removeChannel(stepChannel);
    };
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, logs]);

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
    if (jobData?.internal_notes) setInternalNotes(jobData.internal_notes);

    await fetchWorkflow();
    await fetchAssets();
    await fetchMessages();
    await fetchLogs();
    setLoading(false);
  };

  const fetchWorkflow = async () => {
      const { data } = await supabase.from('job_steps').select('*').eq('job_id', params.id).order('step_order', { ascending: true });
      if (data) setWorkflowSteps(data);
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

  // --- NEW: Load the Original Source File (Fallback) ---
  const loadOriginalSource = async () => {
      if (!job?.file_url) return;
      // Temporarily clear view ID so we know we aren't looking at a version
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

  // --- NEW: UPDATE DEADLINE ---
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      if (!newDate) return;
      
      // Update State immediately
      setJob({ ...job, due_date: newDate });
      
      // Update DB
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

  const handleAddStep = async () => {
      const parentQueue = allQueues.find(q => q.id === selectedQueueId);
      const finalName = selectedSubTaskName || parentQueue?.name;
      const finalDept = parentQueue?.name || 'Production';

      if (!finalName) return;

      const maxOrder = workflowSteps.length > 0 ? Math.max(...workflowSteps.map(s => s.step_order)) : 0;
      
      await supabase.from('job_steps').insert({
          job_id: params.id,
          name: finalName,
          department: finalDept,
          status: 'Waiting', 
          step_order: maxOrder + 1
      });
      await logActivity('Workflow Updated', `Added step: ${finalName}`);
      fetchWorkflow();
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

  // --- UPDATED: SAVE NOTES WITH CONTEXT ---
  const handleSaveNotes = async () => {
      setIsSaving(true);
      const { error } = await supabase.from('jobs').update({ internal_notes: internalNotes }).eq('id', params.id);
      
      if (!error) {
          // NEW: Automatically log where we were when the note was saved
          const currentStatus = job.status || 'Unknown';
          await logActivity('Notes Updated', `Notes updated during status: ${currentStatus}`);
      }
      setIsSaving(false);
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  const currentDepartment = job.status;
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  const isPendingProof = currentAsset?.asset_type === 'proof' && currentAsset?.status === 'pending';
  const brandName = job.orders?.brands?.name || 'Pacific Printing';

  // Find original asset from list OR fallback to job file
  const originalAsset = assets.length > 0 ? [...assets].reverse().find(a => a.asset_type === 'source') : null;
  const hasOriginalFile = !!originalAsset || !!job.file_url;

  const activeStepItem = workflowSteps.find(s => s.status === 'Pending');

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
               <h1 className="text-xl font-bold text-gray-900 leading-none">{job.title}</h1>
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
                      
                      {/* NEW: CLICKABLE DATE PICKER */}
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
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2 flex items-center gap-2"><Layers size={12}/> Job Specs</h3>
                <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Qty</span><span className="font-bold">{job.quantity}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Size</span><span className="font-bold">{job.size || 'N/A'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Stock</span><span className="font-bold text-right truncate w-24">{job.paper_stock}</span></div>
                </div>
            </div>

            {/* NEW: PRODUCTION NOTES (Prominent & Central) */}
            <div className="bg-yellow-50 rounded-lg border border-yellow-300 p-4 md:col-span-2 flex flex-col shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400"></div>
                <div className="pl-4 h-full flex flex-col">
                    <h3 className="text-xs font-bold uppercase text-yellow-800 mb-2 flex items-center gap-2"><Lock size={14}/> Important Instructions</h3>
                    <textarea 
                        value={internalNotes} 
                        onChange={(e) => setInternalNotes(e.target.value)} 
                        className="w-full flex-1 bg-yellow-50 text-yellow-900 font-medium text-sm focus:outline-none resize-none placeholder-yellow-800/50" 
                        placeholder="Enter specific production details here..."
                    />
                    <div className="flex justify-end mt-2">
                        <button onClick={handleSaveNotes} disabled={isSaving} className="text-[10px] bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-3 py-1 rounded">
                            {isSaving ? 'Saving...' : 'Save Instructions'}
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
                                            {/* REORDER BUTTONS */}
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
                                <div className="flex gap-2">
                                    <select value={selectedQueueId} onChange={(e) => setSelectedQueueId(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white font-bold w-1/3">
                                        {allQueues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                                    </select>
                                    <select value={selectedSubTaskName} onChange={(e) => setSelectedSubTaskName(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white w-2/3 disabled:bg-gray-100" disabled={filteredSubTasks.length === 0}>
                                        {filteredSubTasks.length > 0 ? (
                                            filteredSubTasks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                                        ) : (
                                            <option value="">{allQueues.find(q => q.id === selectedQueueId)?.name || 'Generic'}</option>
                                        )}
                                    </select>
                                    <button onClick={handleAddStep} className="bg-black text-white px-4 rounded font-bold"><Plus size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* COL 2: Original File & Chat */}
            <div className="flex flex-col gap-4">
                
                {/* NEW: ORIGINAL SOURCE FILE (Fallback Included) */}
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

                <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-64">
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 font-bold text-xs uppercase text-gray-500">Recent Chat Activity</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 rounded border border-gray-300 text-xs focus:outline-none focus:border-black" placeholder="Type message..." />
                        <button onClick={handleSendMessage} className="bg-black text-white p-2 rounded hover:bg-gray-800"><Send size={14} /></button>
                    </div>
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
