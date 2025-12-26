'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, DollarSign, 
  Clock, MessageSquare, Printer, Calendar, Layers, Hash,
  AlertTriangle, User, Scissors, CheckSquare, Megaphone,
  History, Eye, FileImage, ThumbsUp, XCircle, CheckCircle,
  Activity, Save, Lock, X, UploadCloud, Maximize2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
// Ensure this path matches your project structure
import { sendProofNotification } from '../../../actions'; 

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  // --- STATE ---
  const [job, setJob] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]); 
  const [assets, setAssets] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [loading, setLoading] = useState(true);
  
  // UI State: Restored the Tab Switcher
  const [rightTab, setRightTab] = useState<'chat' | 'activity'>('chat');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Resources
  const [serviceList, setServiceList] = useState<any[]>([]);

  // Active Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('unknown');
  const [viewingAssetId, setViewingAssetId] = useState<string>('');

  // Input State
  const [newMessage, setNewMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchPageData();

    // Realtime subscriptions
    const chatChannel = supabase.channel('job_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, () => fetchMessages())
      .subscribe();
      
    const assetChannel = supabase.channel('job_assets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_assets', filter: `job_id=eq.${params.id}` }, () => fetchAssets())
      .subscribe();

    const logChannel = supabase.channel('job_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_logs', filter: `job_id=eq.${params.id}` }, () => fetchLogs())
      .subscribe();

    return () => { 
      supabase.removeChannel(chatChannel); 
      supabase.removeChannel(assetChannel);
      supabase.removeChannel(logChannel);
    };
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, logs, rightTab]);

  // --- DATA FETCHING ---
  const fetchPageData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setIsAdmin(profile?.role === 'admin');
    }

    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, orders(brand), profiles:user_id(first_name, last_name, email, company, phone)')
      .eq('id', params.id)
      .single();
    
    setJob(jobData);
    if (jobData?.internal_notes) setInternalNotes(jobData.internal_notes);

    const { data: stepData } = await supabase
      .from('job_steps')
      .select('*')
      .eq('job_id', params.id)
      .eq('status', 'Pending')
      .order('step_order', { ascending: true })
      .limit(1)
      .single();
    if (stepData) setActiveStep(stepData);

    const { data: services } = await supabase.from('finishing_services').select('*').order('name');
    if (services) setServiceList(services);

    await fetchAssets();
    await fetchMessages();
    await fetchLogs();
    setLoading(false);
  };

  const fetchAssets = async () => {
    const { data } = await supabase.from('job_assets').select('*, profiles(first_name, email)').eq('job_id', params.id).order('created_at', { ascending: false });
    if (data && data.length > 0) {
        setAssets(data);
        const approved = data.find((a: any) => a.status === 'approved');
        const latestProof = data.find((a: any) => a.asset_type === 'proof' && a.status !== 'archived');
        
        if (!viewingAssetId) {
             loadPreview(approved || latestProof || data[0]);
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

  // --- ACTIONS ---
  const logActivity = async (action: string, details: string) => {
      if (!user) return;
      await supabase.from('job_logs').insert({ job_id: params.id, user_id: user.id, action, details });
      fetchLogs();
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

  // --- UPLOAD (ADMIN) ---
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

          // KILL SWITCH: Archive all old pending proofs
          await supabase.from('job_assets')
            .update({ status: 'archived' })
            .eq('job_id', params.id)
            .eq('asset_type', 'proof')
            .neq('status', 'archived');

          const { data: newAsset } = await supabase.from('job_assets').insert({
              job_id: params.id, uploader_id: user.id, file_url: data?.path, file_name: uploadFile.name, asset_type: 'proof', status: 'pending'
          }).select().single();

          if (uploadMessage.trim()) await supabase.from('messages').insert({ job_id: params.id, user_id: user.id, content: `PROOF SENT: ${uploadMessage}` });
          await sendProofNotification(params.id, data?.path || '', uploadMessage);
          await logActivity('Proof Uploaded', `New version sent.`);

          if (newAsset) { 
              const { data: refreshed } = await supabase.from('job_assets').select('*, profiles(first_name, email)').eq('job_id', params.id).order('created_at', { ascending: false });
              if (refreshed) setAssets(refreshed);
              loadPreview(newAsset); 
          }
          setShowUploadModal(false); setUploadFile(null); setUploadMessage('');
          alert("Proof sent! Previous versions archived.");
      } catch (error: any) { alert("Error: " + error.message); } finally { setIsUploading(false); }
  };

  // --- APPROVAL ---
  const handleApproveProof = async (assetId: string) => {
      if (!confirm("Confirm Approval? This will send the job to production.")) return;
      await supabase.from('job_assets').update({ status: 'approved' }).eq('id', assetId);
      await supabase.from('jobs').update({ status: 'In Production' }).eq('id', params.id);
      
      const msg = isAdmin ? 'Admin overrode approval.' : 'Customer approved proof.';
      await logActivity('Proof Approved', msg);
      await supabase.from('messages').insert({ job_id: params.id, user_id: user.id, content: "✅ APPROVED FOR PRODUCTION" });
      
      fetchPageData();
      alert("Job moved to Production!");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const msgToSend = newMessage;
    setNewMessage('');
    await supabase.from('messages').insert({ job_id: params.id, user_id: user.id, content: msgToSend });
    fetchMessages();
  };

  const handleSaveNotes = async () => {
      setIsSaving(true);
      await supabase.from('jobs').update({ internal_notes: internalNotes }).eq('id', params.id);
      await logActivity('Notes Updated', 'Updated internal notes.');
      setIsSaving(false); alert('Notes saved.');
  };

  const toggleFinishingOption = async (optionName: string) => {
      if (!isAdmin) return;
      const currentOptions = job.finishing_options || [];
      let newOptions = currentOptions.includes(optionName) ? currentOptions.filter((o: string) => o !== optionName) : [...currentOptions, optionName];
      setJob({ ...job, finishing_options: newOptions }); 
      await supabase.from('jobs').update({ finishing_options: newOptions }).eq('id', params.id);
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  const currentDepartment = activeStep ? activeStep.department : job.status;
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  const isPendingProof = currentAsset?.asset_type === 'proof' && currentAsset?.status === 'pending';
  const originalAsset = assets.length > 0 ? [...assets].reverse().find(a => a.asset_type === 'source') : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      
      {/* --- UPLOAD MODAL (ADMIN ONLY) --- */}
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

      {/* 1. HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={20} /></Link>
             <div>
               <h1 className="text-xl font-bold text-gray-900 leading-none">{job.title}</h1>
               <p className="text-xs font-mono text-gray-400 mt-1">#{job.id.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
             </div>
          </div>
          <div className="flex gap-2">
             <div className={`px-4 py-1 rounded-md text-white font-bold uppercase text-xs flex items-center ${isAdmin ? 'bg-black' : (isApprovedAsset ? 'bg-green-600' : 'bg-yellow-500')}`}>
                {isAdmin ? currentDepartment : (isApprovedAsset ? 'In Production' : 'Action Required')}
             </div>
          </div>
        </div>
      </div>

       {/* 2. ADMIN HERO (Black Bar) */}
       {isAdmin && (
           <div className="bg-gray-800 text-white shadow-xl">
              <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row">
                  <div className="p-6 flex-1">
                      <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-1">Production Stage</p>
                      <h1 className="text-4xl font-black uppercase tracking-tight leading-none">{currentDepartment}</h1>
                  </div>
              </div>
          </div>
       )}

      {/* 3. MAIN LAYOUT */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-4 grid grid-cols-12 gap-4">
        
        {/* --- LEFT COL (ADMIN ONLY) --- */}
        <div className={`${isAdmin ? 'col-span-12 lg:col-span-3' : 'hidden'} space-y-4`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2"><Layers size={14}/> Job Specs</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Qty</span><span className="font-bold">{job.quantity}</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Stock</span><span className="font-bold text-right w-1/2">{job.paper_stock}</span></div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2"><Scissors size={14}/> Finishing</h3>
                <div className="flex flex-wrap gap-2">
                    {serviceList.map((service) => {
                        const isSelected = job.finishing_options?.includes(service.name);
                        return <div key={service.id} onClick={() => toggleFinishingOption(service.name)} className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{service.name}</div>;
                    })}
                </div>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                <h3 className="text-xs font-bold uppercase text-yellow-700 mb-2 flex items-center gap-2"><Lock size={14}/> Internal Notes</h3>
                <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="w-full h-20 bg-white border border-yellow-300 rounded p-2 text-xs mb-2" />
                <button onClick={handleSaveNotes} disabled={isSaving} className="w-full bg-yellow-400 text-yellow-900 text-xs font-bold py-1 rounded">Save Notes</button>
            </div>
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
                <h3 className="text-xs font-bold uppercase text-blue-800 mb-2 flex items-center gap-2"><FileText size={14}/> Original Asset</h3>
                {originalAsset ? (
                    <div onClick={() => loadPreview(originalAsset)} className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200 cursor-pointer hover:border-blue-400 transition-all">
                        <div className="bg-blue-100 p-2 rounded text-blue-600"><FileImage size={20}/></div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-900 truncate w-32">{originalAsset.file_name}</p>
                            <p className="text-[10px] text-gray-500">Click to view</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-blue-400 italic">No source file found.</p>
                )}
            </div>
        </div>

        {/* --- MIDDLE COL (THE PROOF) --- */}
        <div className={`col-span-12 ${isAdmin ? 'lg:col-span-6' : 'lg:col-span-9'} flex flex-col gap-4`}>
             
             {/* CUSTOMER ONLY: GIANT ACTION BAR */}
             {!isAdmin && isPendingProof && (
                 <div className="bg-blue-600 rounded-xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                     <div>
                         <h2 className="text-2xl font-black uppercase">Proof Ready for Approval</h2>
                         <p className="opacity-90">Please review the artwork below carefully.</p>
                     </div>
                     <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => setRightTab('chat')} className="flex-1 md:flex-none px-6 py-4 rounded-lg bg-blue-700 hover:bg-blue-800 font-bold border border-blue-500 text-sm">Request Changes</button>
                        <button onClick={() => handleApproveProof(currentAsset.id)} className="flex-1 md:flex-none px-8 py-4 rounded-lg bg-green-400 hover:bg-green-300 text-green-900 font-black shadow-xl text-lg flex items-center justify-center gap-2 transform transition hover:scale-105">
                            <ThumbsUp size={24}/> APPROVE ARTWORK
                        </button>
                     </div>
                 </div>
             )}

             {/* PREVIEW WINDOW */}
             <div className={`bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden relative ${isApprovedAsset ? 'border-green-400 ring-4 ring-green-50' : 'border-gray-200'}`} style={{minHeight: '70vh'}}>
                
                {/* HEADER BAR */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase">{currentAsset?.file_name || 'No File Selected'}</span>
                    <div className="flex items-center gap-2">
                         {/* ADMIN ONLY: Small Approve Button */}
                         {isAdmin && isPendingProof && (
                             <button onClick={() => handleApproveProof(currentAsset.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500 shadow-sm flex items-center gap-1">
                                 <ThumbsUp size={12}/> Approve
                             </button>
                         )}
                         {previewUrl && <a href={previewUrl} target="_blank" className="text-xs font-bold flex items-center gap-1 text-gray-600 hover:text-black bg-white border px-2 py-1 rounded"><Maximize2 size={12}/> Fullscreen</a>}
                         {previewUrl && <a href={previewUrl} download className="text-xs font-bold flex items-center gap-1 text-gray-600 hover:text-black bg-white border px-2 py-1 rounded"><Download size={12}/> Download</a>}
                    </div>
                </div>
                
                {/* PREVIEW CONTENT */}
                <div className="flex-1 bg-gray-200 flex items-center justify-center p-4 overflow-auto">
                    {!previewUrl ? (
                        <div className="text-gray-400">Select a file to preview</div>
                    ) : previewType === 'image' ? (
                        <img src={previewUrl} className="max-w-full max-h-full shadow-2xl border border-white" />
                    ) : (
                        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full shadow-2xl bg-white" />
                    )}
                </div>
             </div>
        </div>

        {/* --- RIGHT COL: CHAT & HISTORY (RESTORED TABS) --- */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-[calc(100vh-100px)]">
            
            {/* FILE LIST */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-1/4">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                     <h3 className="text-xs font-bold uppercase text-gray-500">Versions</h3>
                     {isAdmin && <button onClick={() => setShowUploadModal(true)} className="text-[10px] bg-black text-white px-2 py-1 rounded font-bold">+ Proof</button>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {assets.map((asset) => {
                        // Customer: Hide archived/source. Admin: Show all.
                        if (!isAdmin && (asset.status === 'archived' || asset.asset_type === 'source')) return null;
                        
                        const isCurrent = viewingAssetId === asset.id;
                        return (
                        <div key={asset.id} onClick={() => loadPreview(asset)} className={`p-2 rounded border cursor-pointer flex justify-between items-center ${isCurrent ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                            <div>
                                <p className="text-xs font-bold text-gray-700 truncate w-32">{asset.file_name}</p>
                                <p className="text-[9px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</p>
                            </div>
                            {asset.status === 'approved' && <CheckCircle size={14} className="text-green-500"/>}
                        </div>
                        );
                    })}
                </div>
            </div>

            {/* TABS: CHAT vs ACTIVITY */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-3/4 overflow-hidden">
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
                        <Activity size={14}/> Activity
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
                    {/* CHAT TAB */}
                    {rightTab === 'chat' && (
                        <>
                             {messages.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No messages yet.</div>}
                             {messages.map((msg) => {
                                const isMe = msg.user_id === user?.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${isMe ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.content}</div>
                                        <span className="text-[9px] text-gray-400 mt-0.5">{msg.profiles?.first_name}</span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}

                    {/* ACTIVITY TAB */}
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

                {/* CHAT INPUT (Only shows on chat tab) */}
                {rightTab === 'chat' && (
                    <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 rounded border border-gray-300 text-xs focus:outline-none focus:border-black" placeholder="Type message..." />
                        <button onClick={handleSendMessage} className="bg-black text-white p-2 rounded hover:bg-gray-800"><Send size={14} /></button>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
