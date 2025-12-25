'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, DollarSign, 
  Clock, MessageSquare, Printer, Calendar, Layers, Hash,
  AlertTriangle, User, Scissors, CheckSquare, Megaphone,
  History, Eye, FileImage, ThumbsUp, XCircle, CheckCircle
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
  const [assets, setAssets] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Resources
  const [serviceList, setServiceList] = useState<any[]>([]);

  // Active Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('unknown');
  const [viewingAssetId, setViewingAssetId] = useState<string>('');

  // Input State
  const [newMessage, setNewMessage] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchPageData();

    // Realtime Chat Subscription
    const chatChannel = supabase
      .channel('job_chat')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `job_id=eq.${params.id}` 
      }, 
      (payload) => {
        // Fetch to ensure we get profile data
        fetchMessages(); 
      })
      .subscribe();
      
    // Realtime File Asset Subscription
    const assetChannel = supabase
      .channel('job_assets')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'job_assets', 
        filter: `job_id=eq.${params.id}` 
      }, 
      () => { fetchAssets(); })
      .subscribe();

    return () => { 
      supabase.removeChannel(chatChannel); 
      supabase.removeChannel(assetChannel);
    };
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- DATA FETCHING ---
  const fetchPageData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // 1. Fetch Job
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, orders(brand), profiles:user_id(first_name, last_name, email, company, phone)')
      .eq('id', params.id)
      .single();
    
    setJob(jobData);
    if (jobData?.quote_price) setQuoteAmount(jobData.quote_price);
    if (jobData?.due_date) setDueDate(new Date(jobData.due_date).toISOString().split('T')[0]);

    // 2. Fetch Workflow Step
    const { data: stepData } = await supabase
      .from('job_steps')
      .select('*')
      .eq('job_id', params.id)
      .eq('status', 'Pending')
      .order('step_order', { ascending: true })
      .limit(1)
      .single();
    if (stepData) setActiveStep(stepData);

    // 3. Fetch Services
    const { data: services } = await supabase.from('finishing_services').select('*').order('name');
    if (services) setServiceList(services);

    // 4. Fetch Assets & Messages
    await fetchAssets();
    await fetchMessages();
    setLoading(false);
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('job_assets')
      .select('*, profiles(first_name, email)')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
        setAssets(data);
        
        // NORTH STAR LOGIC: Default to Approved, then Proof, then Source
        const approved = data.find((a: any) => a.status === 'approved');
        const latestProof = data.find((a: any) => a.asset_type === 'proof');
        
        if (!viewingAssetId) {
            loadPreview(approved || latestProof || data[0]);
        }
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(email, first_name, role)') 
      .eq('job_id', params.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // --- ACTIONS ---
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

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !user) return;
      const file = e.target.files[0];
      const fileName = `${params.id}-proof-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) return alert("Upload failed");

      // 1. Create Asset Record
      await supabase.from('job_assets').insert({
          job_id: params.id,
          uploader_id: user.id,
          file_url: data?.path,
          file_name: file.name,
          asset_type: 'proof',
          status: 'pending'
      });

      // 2. Trigger Email Action
      await sendProofNotification(params.id, data?.path || '');

      fetchAssets();
      alert("Proof uploaded & customer notified!");
  };

  const handleApproveProof = async (assetId: string) => {
      if (!confirm("Mark this file as APPROVED for production?")) return;
      
      // 1. Mark this asset as Approved
      await supabase.from('job_assets').update({ status: 'approved' }).eq('id', assetId);
      
      // 2. Mark job as In Production
      await supabase.from('jobs').update({ status: 'In Production' }).eq('id', params.id);
      
      fetchPageData();
      alert("Job moved to Production!");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    
    // Optimistic Update
    const tempMsg = {
        id: Math.random(), 
        content: newMessage, 
        user_id: user.id, 
        created_at: new Date().toISOString(),
        profiles: { first_name: 'Me' }
    };
    setMessages([...messages, tempMsg]);
    const msgToSend = newMessage;
    setNewMessage('');

    await supabase.from('messages').insert({
      job_id: params.id,
      user_id: user.id,
      content: msgToSend
    });
    fetchMessages();
  };

  const handleUpdateJob = async () => {
    setIsSaving(true);
    const updates: any = {};
    if (quoteAmount) updates.quote_price = parseFloat(quoteAmount); else updates.quote_price = null;
    if (dueDate) updates.due_date = dueDate; else updates.due_date = null;

    const { error } = await supabase.from('jobs').update(updates).eq('id', params.id);
    setIsSaving(false);
    if (!error) { fetchPageData(); alert('Saved!'); }
  };

  const toggleFinishingOption = async (optionName: string) => {
      const currentOptions = job.finishing_options || [];
      let newOptions = currentOptions.includes(optionName) 
          ? currentOptions.filter((o: string) => o !== optionName)
          : [...currentOptions, optionName];
      setJob({ ...job, finishing_options: newOptions }); 
      await supabase.from('jobs').update({ finishing_options: newOptions }).eq('id', params.id);
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

  if (loading) return <div className="p-12 text-center">Loading Job...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  const countdown = getCountdown();
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleUploadProof} className="hidden" />

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
             <div className="px-4 py-1 rounded-md bg-black text-white font-bold uppercase text-xs flex items-center">
                {job.status}
             </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN LAYOUT */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-4 grid grid-cols-12 gap-4">
        
        {/* LEFT COL: ASSETS & VAULT (Width 3) */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
            
            {/* FILE VAULT */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-140px)]">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                     <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><History size={14}/> File History</h3>
                     <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-black text-white px-3 py-1.5 rounded font-bold hover:bg-gray-800 shadow-sm">+ Upload Proof</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {assets.map((asset) => {
                        const isCurrent = viewingAssetId === asset.id;
                        return (
                        <div 
                           key={asset.id} 
                           onClick={() => loadPreview(asset)}
                           className={`p-3 rounded-lg border cursor-pointer transition-all group relative
                              ${isCurrent ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-white border-gray-100 hover:border-gray-300'}
                           `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded-md ${asset.asset_type === 'source' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-600'}`}>
                                        {asset.asset_type === 'source' ? <FileText size={16}/> : <FileImage size={16}/>}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800 truncate w-32">{asset.file_name}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()} • {asset.asset_type.toUpperCase()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* STATUS BADGE */}
                            <div className="mt-2 flex items-center justify-between">
                                {asset.status === 'approved' ? (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10}/> APPROVED</span>
                                ) : asset.status === 'pending' && asset.asset_type === 'proof' ? (
                                    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">PENDING</span>
                                ) : (
                                    <span></span>
                                )}
                                {isCurrent && <Eye size={14} className="text-blue-400"/>}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* MIDDLE COL: PREVIEW (Width 6) */}
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
                             <button onClick={() => handleApproveProof(currentAsset.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500 shadow-sm flex items-center gap-1">
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

        {/* RIGHT COL: CHAT & INFO (Width 3) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-[calc(100vh-100px)]">
            
            {/* SPECS CARD */}
             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2"><Layers size={14}/> Specs</h3>
                     <div className={`text-[10px] px-2 py-0.5 rounded font-bold ${countdown.color} text-white`}>{countdown.text}</div>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Qty</span>
                        <span className="font-bold">{job.quantity}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Stock</span>
                        <span className="font-bold text-right w-1/2">{job.paper_stock}</span>
                    </div>
                </div>
            </div>

            {/* CHAT */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><MessageSquare size={14}/> Discussion</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No messages yet.</div>}
                    {messages.map((msg) => {
                        const isMe = msg.user_id === user?.id;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${isMe ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
                                    {msg.content}
                                </div>
                                <span className="text-[9px] text-gray-400 mt-0.5">{msg.profiles?.first_name}</span>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-2 border-t border-gray-100">
                    <div className="flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 rounded border border-gray-200 text-xs focus:outline-none focus:border-black" placeholder="Type here..." />
                        <button onClick={handleSendMessage} className="bg-black text-white p-2 rounded hover:bg-gray-800"><Send size={14} /></button>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
