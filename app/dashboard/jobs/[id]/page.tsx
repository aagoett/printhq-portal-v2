'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, DollarSign, 
  Clock, MessageSquare, Printer, Calendar, Layers, Hash,
  AlertTriangle, User, Scissors, CheckSquare, Megaphone,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  // Data State
  const [job, setJob] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<any>(null); // NEW: Tracks current department step
  const [messages, setMessages] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Resources State
  const [serviceList, setServiceList] = useState<any[]>([]);

  // File Preview State
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('unknown');

  // Input State
  const [newMessage, setNewMessage] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchPageData();
    
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, 
      (payload) => { fetchMessages(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchPageData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // 1. Fetch Job WITH Customer Profile
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, orders(brand), profiles:user_id(first_name, last_name, email, company, phone)')
      .eq('id', params.id)
      .single();
    
    setJob(jobData);
    if (jobData?.quote_price) setQuoteAmount(jobData.quote_price);
    if (jobData?.due_date) setDueDate(new Date(jobData.due_date).toISOString().split('T')[0]);

    // 2. Fetch Current Workflow Step (To determine Department & Instructions)
    const { data: stepData } = await supabase
      .from('job_steps')
      .select('*')
      .eq('job_id', params.id)
      .eq('status', 'Pending')
      .order('step_order', { ascending: true })
      .limit(1)
      .single();
    
    if (stepData) setActiveStep(stepData);

    // 3. Fetch Available Services
    const { data: services } = await supabase.from('finishing_services').select('*').order('name');
    if (services) setServiceList(services);

    // 4. Generate File Preview URL
    if (jobData?.file_url) {
        const { data: urlData } = await supabase.storage.from('uploads').createSignedUrl(jobData.file_url, 3600);
        if (urlData?.signedUrl) {
            setFileUrl(urlData.signedUrl);
            const lowerPath = jobData.file_url.toLowerCase();
            if (lowerPath.match(/\.(jpg|jpeg|png|webp)$/)) setFileType('image');
            else if (lowerPath.endsWith('.pdf')) setFileType('pdf');
            else setFileType('other');
        }
    }

    fetchMessages();
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(email, first_name, role)') 
      .eq('job_id', params.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await supabase.from('messages').insert({
      job_id: params.id,
      user_id: user.id,
      content: newMessage
    });
    setNewMessage('');
  };

  const handleUpdateJob = async () => {
    setIsSaving(true);
    const updates: any = {};
    if (quoteAmount) updates.quote_price = parseFloat(quoteAmount);
    else updates.quote_price = null;
    if (dueDate) updates.due_date = dueDate;
    else updates.due_date = null;

    const { error } = await supabase.from('jobs').update(updates).eq('id', params.id);
    setIsSaving(false);
    if (!error) {
        fetchPageData(); 
        alert('Saved!');
    }
  };

  const toggleFinishingOption = async (optionName: string) => {
      const currentOptions = job.finishing_options || [];
      let newOptions;
      if (currentOptions.includes(optionName)) {
          newOptions = currentOptions.filter((o: string) => o !== optionName);
      } else {
          newOptions = [...currentOptions, optionName];
      }
      setJob({ ...job, finishing_options: newOptions }); 
      await supabase.from('jobs').update({ finishing_options: newOptions }).eq('id', params.id);
  };

  // --- HELPERS ---
  const getCountdown = () => {
      if (!job?.due_date) return { text: "NO DUE DATE SET", color: "bg-gray-800", textCol: "text-gray-500" };
      const due = new Date(job.due_date);
      const now = new Date();
      due.setHours(23, 59, 59, 999);
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { text: `OVERDUE BY ${Math.abs(diffDays)} DAYS`, color: "bg-red-600", textCol: "text-white" };
      if (diffDays === 0) return { text: "DUE TODAY", color: "bg-orange-500", textCol: "text-white" };
      if (diffDays <= 2) return { text: `DUE IN ${diffDays} DAYS`, color: "bg-yellow-500", textCol: "text-black" };
      return { text: `${diffDays} DAYS LEFT`, color: "bg-emerald-500", textCol: "text-white" };
  };

  const getStatusColor = (status: string) => {
      const s = status?.toLowerCase() || '';
      if (s.includes('prepress') || s.includes('review')) return 'bg-blue-600';
      if (s.includes('print') || s.includes('press')) return 'bg-purple-600';
      if (s.includes('bindery') || s.includes('finish')) return 'bg-orange-600';
      if (s.includes('ship') || s.includes('mail')) return 'bg-green-600';
      return 'bg-gray-700';
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  const countdown = getCountdown();
  const customerName = job.profiles ? `${job.profiles.first_name || ''} ${job.profiles.last_name || ''}` : 'Guest User';
  const currentDepartment = activeStep ? activeStep.department : job.status;
  const statusColor = getStatusColor(currentDepartment);
  const stepNotes = activeStep?.notes; // Specific instructions for this step

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* 1. TOP NAV BAR */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
               <ArrowLeft size={20} />
             </Link>
             <div>
               <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
               <p className="text-xs font-mono text-gray-400">#{job.id.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
             </div>
          </div>
          <div className="flex gap-2">
             {fileUrl && (
                <a href={fileUrl} target="_blank" className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800">
                  <Download size={16} /> Download Source
                </a>
             )}
          </div>
        </div>
      </div>

      {/* 2. THE STAGE COMMANDER (New Header) */}
      <div className={`${statusColor} text-white shadow-xl`}>
          <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row">
              
              {/* BIG STATUS BLOCK */}
              <div className="p-8 flex-1">
                  <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-2">Current Department</p>
                  <h1 className="text-6xl font-black uppercase tracking-tight leading-none">
                      {currentDepartment}
                  </h1>
              </div>

              {/* INSTRUCTIONS BLOCK (Only shows if notes exist) */}
              <div className="p-8 md:w-1/3 bg-black/20 border-l border-white/10 backdrop-blur-sm flex flex-col justify-center">
                  <div className="flex items-start gap-3">
                      <Megaphone size={24} className="mt-1 opacity-80" />
                      <div>
                          <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-1">Department Instructions</p>
                          <p className="text-lg font-bold leading-tight">
                              {stepNotes || job.notes || "No specific instructions provided."}
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. PRODUCTION METRICS (Dark Strip) */}
      <div className="bg-gray-900 text-white border-b border-black">
        <div className="max-w-[1800px] mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
            <div className="flex flex-col justify-center border-r border-gray-800">
                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><User size={12}/> Customer</p>
                <p className="text-base font-bold text-white">{customerName}</p>
            </div>
            <div className="flex flex-col justify-center border-r border-gray-800">
                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Hash size={12}/> Quantity</p>
                <p className="text-xl font-bold text-white">{job.quantity}</p>
            </div>
            <div className="flex flex-col justify-center border-r border-gray-800">
                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Layers size={12}/> Material</p>
                <p className="text-base font-bold text-white">{job.paper_stock || 'Standard'}</p>
            </div>
            <div className="flex flex-col justify-center border-r border-gray-800">
                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Due Date</p>
                <div className="flex items-center gap-2">
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer uppercase"/>
                    <button onClick={handleUpdateJob} disabled={isSaving} className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-500">{isSaving ? '...' : 'Set'}</button>
                </div>
            </div>
            <div className="flex items-center justify-end gap-3">
                 <div className="text-right">
                    <p className={`text-[10px] font-bold uppercase ${countdown.textCol}`}>{countdown.text}</p>
                 </div>
                 <div className={`w-3 h-3 rounded-full ${countdown.color.replace('bg-', 'bg-')} animate-pulse`}></div>
            </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE */}
      <div className="flex-1 max-w-[1800px] mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* FILE PREVIEW */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FileText size={16} /> Digital Proof Preview</h3>
                </div>
                <div className="flex-1 bg-gray-100/50 flex items-center justify-center p-8 relative">
                {!fileUrl ? (
                    <div className="text-gray-400 text-sm">No file uploaded</div>
                ) : fileType === 'image' ? (
                    <img src={fileUrl} alt="Preview" className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded border border-gray-200" />
                ) : fileType === 'pdf' ? (
                    <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full min-h-[500px] rounded shadow-sm bg-white" title="PDF Preview"></iframe>
                ) : (
                    <div className="text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Preview not available.</p>
                    <a href={fileUrl} className="text-blue-600 underline text-sm">Download File</a>
                    </div>
                )}
                </div>
            </div>

            {/* FINISHING OPTIONS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <Scissors size={16} /> Finishing Checklist
                    </h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                        {serviceList.map((service) => {
                            const isSelected = job.finishing_options?.includes(service.name);
                            return (
                                <button 
                                    key={service.id}
                                    onClick={() => toggleFinishingOption(service.name)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-2
                                        ${isSelected 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    {isSelected ? <CheckSquare size={16} /> : <div className="w-4 h-4 border-2 border-gray-300 rounded-sm" />}
                                    {service.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>

        {/* RIGHT: CHAT */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[calc(100vh-320px)] sticky top-6">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><MessageSquare size={16} className="text-gray-500" /> Team Discussion</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                    {messages.length === 0 && <div className="text-center text-gray-400 text-xs mt-10">No messages yet.</div>}
                    {messages.map((msg) => {
                        const isMe = msg.user_id === user?.id;
                        const senderName = msg.profiles?.first_name || msg.profiles?.email?.split('@')[0] || 'User';
                        const isAdmin = msg.profiles?.role === 'admin' || msg.profiles?.role === 'staff';
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-400 mb-1 px-1">{isAdmin && !isMe ? 'Staff' : senderName} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-black text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>{msg.content}</div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-2 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-black" />
                        <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="bg-black text-white p-2 rounded-full hover:bg-gray-800 disabled:opacity-50"><Send size={16} /></button>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
