'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, DollarSign, 
  Clock, MessageSquare, Printer, Calendar, Layers, Hash,
  AlertTriangle, User, Scissors, CheckSquare, Megaphone,
  History, Eye, FileImage, ThumbsUp, XCircle, CheckCircle,
  Activity, Save, Lock, X, UploadCloud
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { sendProofNotification } from '../../../actions'; 

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  // --- STATE ---
  const [job, setJob] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]); 
  const [assets, setAssets] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false); // ROLE STATE
  const [loading, setLoading] = useState(true);
  
  // UI State
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
  const [quoteAmount, setQuoteAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchPageData();

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
    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // 2. CHECK ROLE (Database Check)
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        setIsAdmin(profile?.role === 'admin');
    }

    // 3. Fetch Job
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, orders(brand), profiles:user_id(first_name, last_name, email, company, phone)')
      .eq('id', params.id)
      .single();
    
    setJob(jobData);
    if (jobData?.quote_price) setQuoteAmount(jobData.quote_price);
    if (jobData?.internal_notes) setInternalNotes(jobData.internal_notes);
    if (jobData?.due_date) setDueDate(new Date(jobData.due_date).toISOString().split('T')[0]);

    // 4. Fetch Workflow Step
    const { data: stepData } = await supabase
      .from('job_steps')
      .select('*')
      .eq('job_id', params.id)
      .eq('status', 'Pending')
      .order('step_order', { ascending: true })
      .limit(1)
      .single();
    if (stepData) setActiveStep(stepData);

    // 5. Fetch Services
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
      await supabase.from('job_logs').insert({
          job_id: params.id,
          user_id: user.id,
          action,
          details
      });
      fetchLogs();
  };

  const loadPreview = async (asset: any) => {
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

  // --- UPLOAD LOGIC ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
      if (!uploadFile || !user) return;
      setIsUploading(true);

      try {
          const fileName = `${params.id}-proof-${Math.random().toString(36).substring(7)}.${uploadFile.name.split('.').pop()}`;
          const { data, error } = await supabase.storage.from('uploads').upload(fileName, uploadFile);
          if (error) throw new Error("Storage Upload failed: " + error.message);

          const { error: archiveError } = await supabase.from('job_assets')
              .update({ status: 'archived' })
              .eq('job_id', params.id)
              .eq('asset_type', 'proof')
              .eq('status', 'pending');
          
          if (archiveError) console.error("Archive warning:", archiveError);

          const { data: newAsset, error: dbError } = await supabase.from('job_assets').insert({
              job_id: params.id,
              uploader_id: user.id,
              file_url: data?.path,
              file_name: uploadFile.name,
              asset_type: 'proof',
              status: 'pending'
          }).select().single();

          if (dbError) throw new Error("Database Save failed: " + dbError.message);

          if (uploadMessage.trim()) {
              await supabase.from('messages').insert({
                  job_id: params.id,
                  user_id: user.id,
                  content: `PROOF SENT: ${uploadMessage}`
              });
              fetchMessages();
          }

          await sendProofNotification(params.id, data?.path || '', uploadMessage);
          await logActivity('Proof Uploaded', `New version sent. Note: ${uploadMessage || 'None'}`);

          if (newAsset) {
              await fetchAssets();
              loadPreview(newAsset); 
          }
          
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadMessage('');
          alert("Proof sent successfully!");

      } catch (error: any) {
          console.error("Submission Error:", error);
          alert("Error sending proof: " + (error.message || "Unknown error"));
      } finally {
          setIsUploading(false);
      }
  };

  const handleApproveProof = async (assetId: string) => {
      if (!confirm("Are you sure you want to approve this for production?")) return;
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
      const { error } = await supabase.from('jobs').update({ internal_notes: internalNotes }).eq('id', params.id);
      if (!error) await logActivity('Notes Updated', 'Updated internal production notes.');
      setIsSaving(false);
      alert('Notes saved.');
  };

  const toggleFinishingOption = async (optionName: string) => {
      if (!isAdmin) return; // LOCK FOR CUSTOMERS
      const currentOptions = job.finishing_options || [];
      let newOptions = currentOptions.includes(optionName) ? currentOptions.filter((o: string) => o !== optionName) : [...currentOptions, optionName];
      setJob({ ...job, finishing_options: newOptions }); 
      await supabase.from('jobs').update({ finishing_options: newOptions }).eq('id', params.id);
      const action = currentOptions.includes(optionName) ? 'Removed' : 'Added';
      await logActivity('Finishing Updated', `${action} service: ${optionName}`);
  };

  // --- HELPERS ---
  const getCountdown = () => {
      if (!job?.due_date) return { text: "NO DATE", color: "bg-gray-800", textCol: "text-gray-500" };
      const due = new Date(job.due_date);
      const now = new Date();
      due.setHours(23, 59, 59, 999);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { text: `${Math.abs(diffDays)} DAYS LATE`, color: "bg-red-600", textCol: "text-white" };
      if (diffDays === 0) return { text: "DUE TODAY", color: "bg-orange-500", textCol: "text-white" };
      return { text: `${diffDays} DAYS LEFT`, color: "bg-emerald-500", textCol: "text-white" };
  };

  const getStatusColor = (status: string) => {
      const s = status?.toLowerCase() || '';
      if (s.includes('prepress')) return 'bg-blue-600';
      if (s.includes('press')) return 'bg-purple-600';
      if (s.includes('bindery')) return 'bg-orange-600';
      if (s.includes('ship') || s.includes('complete')) return 'bg-green-600';
      return 'bg-gray-800';
  };

  if (loading) return <div className="p-12 text-center">Loading Job...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  const countdown = getCountdown();
  const currentDepartment = activeStep ? activeStep.department : job.status;
  const statusColor = getStatusColor(currentDepartment);
  const stepNotes = activeStep?.notes;
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  // Check if assets exist before spreading to avoid error
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
             <div className={`px-4 py-1 rounded-md text-white font-bold uppercase text-xs flex items-center ${statusColor}`}>
                {currentDepartment}
             </div>
          </div>
        </div>
      </div>

       {/* 2. THE STAGE COMMANDER (ADMIN ONLY VIEW OF NOTES) */}
       <div className={`${statusColor} text-white shadow-xl`}>
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row">
              <div className="p-8 flex-1">
                  <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-2">Current Status</p>
                  <h1 className="text-6xl font-black uppercase tracking-tight leading-none">
                      {currentDepartment}
                  </h1>
              </div>
              {/* Only show technical instructions to Admin */}
              {isAdmin && (
                  <div className="p-8 md:w-1/3 bg-black/20 border-l border-white/10 backdrop-blur-sm flex flex-col justify-center">
                      <div className="flex items-start gap-3">
                          <Megaphone size={24} className="mt-1 opacity-80" />
                          <div>
                              <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-1">Production Instructions</p>
                              <p className="text-lg font-bold leading-tight">
                                  {stepNotes || job.notes || "No specific instructions provided."}
                              </p>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* 3. MAIN LAYOUT (3 Column Grid) */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-4 grid grid-cols-12 gap-4">
        
        {/* LEFT COL: SPECS & FINISHING (Width 3) */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
            
            {/* SPECS CARD */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2"><Layers size={14}/> Job Specs</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Customer</span>
                        <span className="font-bold">{job.profiles?.first_name || 'Guest'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Qty</span>
                        <span className="font-bold">{job.quantity}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Stock</span>
                        <span className="font-bold text-right w-1/2">{job.paper_stock}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                         <span className="text-gray-500">Due Date</span>
                         <div className={`text-[10px] px-2 py-0.5 rounded font-bold ${countdown.color} text-white`}>
                             {countdown.text}
                         </div>
                    </div>
                </div>
            </div>

            {/* FINISHING CHECKLIST (READ ONLY FOR CUSTOMER) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2"><Scissors size={14}/> Finishing</h3>
                <div className="flex flex-wrap gap-2">
                    {serviceList.map((service) => {
                        const isSelected = job.finishing_options?.includes(service.name);
                        return (
                            <button key={service.id} 
                                onClick={() => toggleFinishingOption(service.name)} 
                                disabled={!isAdmin} // DISABLE FOR CUSTOMER
                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-all flex items-center gap-2 ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200'} ${!isAdmin && 'cursor-default opacity-80'}`}
                            >
                                {isSelected && <CheckSquare size={12} />} {service.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* INTERNAL NOTES (ADMIN ONLY) */}
            {isAdmin && (
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                    <h3 className="text-xs font-bold uppercase text-yellow-700 mb-2 flex items-center gap-2"><Lock size={14}/> Internal Notes</h3>
                    <textarea 
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="Private production notes..."
                        className="w-full h-24 bg-white border border-yellow-300 rounded p-2 text-sm focus:outline-none mb-2"
                    />
                    <button onClick={handleSaveNotes} disabled={isSaving} className="w-full bg-yellow-400 text-yellow-900 text-xs font-bold py-1.5 rounded hover:bg-yellow-500 flex items-center justify-center gap-2">
                        <Save size={12}/> Save Notes
                    </button>
                </div>
            )}

             {/* ORIGINAL FILE (ADMIN ONLY) */}
             {isAdmin && (
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
             )}
        </div>

        {/* MIDDLE COL: MAIN PROOF STAGE (Width 6) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
             <div className={`bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden min-h-[600px] relative ${isApprovedAsset ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}>
                
                {/* PREVIEW HEADER */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {isApprovedAsset ? (
                            <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={12}/> PRODUCTION FILE</span>
                        ) : (
                            <span className="text-xs font-bold uppercase text-gray-500">Preview Mode</span>
                        )}
                        <span className="text-xs text-gray-400">| {currentAsset?.file_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {currentAsset?.asset_type === 'proof' && currentAsset.status === 'pending' && (
                             <button onClick={() => handleApproveProof(currentAsset.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500 shadow-sm flex items-center gap-1 animate-pulse">
                                 <ThumbsUp size={12}/> Approve for Production
                             </button>
                        )}
                        {previewUrl && (
                            <a href={previewUrl} target="_blank" className="text-xs font-bold text-gray-600 hover:text-black border border-gray-300 px-2 py-1 rounded bg-white">
                                <Download size={12}/>
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex-1 bg-gray-100 flex items-center justify-center p-6 relative">
                    {!previewUrl ? (
                        <div className="text-gray-400 text-sm">Select a file to preview</div>
                    ) : previewType === 'image' ? (
                        <img src={previewUrl} className="max-w-full max-h-[70vh] shadow-lg border border-gray-300 bg-white" />
                    ) : (
                        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full shadow-lg bg-white" />
                    )}
                </div>
             </div>
        </div>

        {/* RIGHT COL: FILE VAULT & CHAT/HISTORY (Width 3) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-[calc(100vh-100px)]">
            
            {/* FILE VAULT */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-1/3">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                     <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><History size={14}/> File History</h3>
                     {/* ONLY ADMIN CAN UPLOAD */}
                     {isAdmin && (
                         <button onClick={() => setShowUploadModal(true)} className="text-[10px] bg-black text-white px-2 py-1 rounded font-bold hover:bg-gray-800">+ New Proof</button>
                     )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {assets.map((asset) => {
                        const isCurrent = viewingAssetId === asset.id;
                        // Optional: Hide archived/source files from customer to reduce clutter
                        if (!isAdmin && (asset.status === 'archived' || asset.asset_type === 'source')) return null;

                        return (
                        <div key={asset.id} onClick={() => loadPreview(asset)} className={`p-2 rounded border cursor-pointer transition-all flex flex-col gap-2 group ${isCurrent ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                {asset.asset_type === 'source' ? <FileText size={16} className="text-gray-400"/> : <FileImage size={16} className="text-purple-500"/>}
                                <div>
                                    <p className="text-xs font-bold text-gray-700 truncate w-32">{asset.file_name}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                {asset.status === 'approved' ? (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10}/> APPROVED</span>
                                ) : asset.status === 'archived' ? (
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded flex items-center gap-1"><XCircle size={10}/> ARCHIVED</span>
                                ) : asset.status === 'pending' && asset.asset_type === 'proof' ? (
                                    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded animate-pulse">PENDING APPROVAL</span>
                                ) : (<span></span>)}
                                {isCurrent && <Eye size={14} className="text-blue-400"/>}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            {/* TABBED WIDGET: CHAT & HISTORY */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-2/3 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setRightTab('chat')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'chat' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}
                    >
                        <MessageSquare size={14}/> Discussion
                    </button>
                    {/* CUSTOMERS CAN SEE ACTIVITY LOG TOO, OR HIDE IF PREFERRED */}
                    <button 
                        onClick={() => setRightTab('activity')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'activity' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}
                    >
                        <Activity size={14}/> Activity Log
                    </button>
                </div>
                
                {/* TAB CONTENT */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
                    {/* CHAT VIEW */}
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

                    {/* ACTIVITY LOG VIEW */}
                    {rightTab === 'activity' && (
                        <>
                            {logs.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No activity recorded yet.</div>}
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

                {/* INPUT AREA (Only for Chat) */}
                {rightTab === 'chat' && (
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <div className="flex gap-2">
                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 rounded border border-gray-200 text-xs focus:outline-none focus:border-black" placeholder="Type here..." />
                            <button onClick={handleSendMessage} className="bg-black text-white p-2 rounded hover:bg-gray-800"><Send size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
