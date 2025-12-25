'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, DollarSign, 
  Clock, MessageSquare, Printer, Save, Calendar, Layers, Hash,
  AlertTriangle, CheckCircle, User, Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  // Data State
  const [job, setJob] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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
    
    // Format existing due date for the input field (YYYY-MM-DD)
    if (jobData?.due_date) {
        setDueDate(new Date(jobData.due_date).toISOString().split('T')[0]);
    }

    // 2. Generate File Preview URL
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
    if (dueDate) updates.due_date = dueDate;
    
    await supabase.from('jobs').update(updates).eq('id', params.id);
    setIsSaving(false);
    // Refresh page data to update countdown
    fetchPageData(); 
    alert('Job details updated!');
  };

  // --- COUNTDOWN LOGIC ---
  const getCountdown = () => {
      if (!job?.due_date) return { text: "NO DUE DATE SET", color: "bg-gray-800", textCol: "text-gray-400" };
      
      const due = new Date(job.due_date);
      const now = new Date();
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { text: `OVERDUE BY ${Math.abs(diffDays)} DAYS`, color: "bg-red-600", textCol: "text-white" };
      if (diffDays === 0) return { text: "DUE TODAY", color: "bg-red-500", textCol: "text-white" };
      if (diffDays <= 2) return { text: `DUE IN ${diffDays} DAYS`, color: "bg-orange-500", textCol: "text-white" };
      return { text: `${diffDays} DAYS LEFT`, color: "bg-emerald-500", textCol: "text-white" };
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  const countdown = getCountdown();
  const customerName = job.profiles ? `${job.profiles.first_name || ''} ${job.profiles.last_name || ''}` : 'Guest User';
  const customerCompany = job.profiles?.company || job.guest_email || 'No Company';

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
               <div className="flex items-center gap-3">
                 <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                 <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${job.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {job.status}
                 </span>
               </div>
               <p className="text-xs font-mono text-gray-400">#{job.id.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-700">
                <Printer size={16} /> Print Ticket
             </button>
             {fileUrl && (
                <a href={fileUrl} target="_blank" className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800">
                  <Download size={16} /> Download Source
                </a>
             )}
          </div>
        </div>
      </div>

      {/* 2. THE PRODUCTION COMMAND CENTER (Banner) */}
      <div className="bg-gray-900 text-white border-b border-black shadow-xl relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-gray-800 to-transparent opacity-50 pointer-events-none"></div>

        <div className="max-w-[1800px] mx-auto">
            
            {/* TOP ROW: CUSTOMER & COUNTDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-800">
                {/* Left: Customer Info */}
                <div className="p-6 flex items-center gap-5">
                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
                        {customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                            <User size={12} /> Customer
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-none">{customerName}</h2>
                        <p className="text-sm text-gray-400 font-medium mt-1">{customerCompany}</p>
                    </div>
                </div>

                {/* Right: THE COUNTDOWN */}
                <div className={`p-6 flex items-center justify-end gap-6 ${countdown.color}`}>
                    <div className="text-right">
                        <p className={`text-xs font-bold uppercase tracking-widest opacity-80 ${countdown.textCol}`}>Production Deadline</p>
                        <h2 className={`text-3xl font-black ${countdown.textCol}`}>{countdown.text}</h2>
                    </div>
                    <Clock size={40} className={`opacity-80 ${countdown.textCol}`} />
                </div>
            </div>

            {/* BOTTOM ROW: SPECS STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-800 text-sm">
                
                {/* QTY */}
                <div className="p-4 flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Hash size={12}/> Quantity</p>
                    <p className="text-xl font-bold text-white">{job.quantity}</p>
                </div>

                {/* STOCK */}
                <div className="p-4 flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Layers size={12}/> Material</p>
                    <p className="text-base font-bold text-white">{job.paper_stock || 'Standard'}</p>
                </div>

                {/* DATE IN */}
                <div className="p-4 flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12}/> Date In</p>
                    <p className="text-base font-bold text-white">{new Date(job.created_at).toLocaleDateString()}</p>
                </div>

                {/* DUE DATE INPUT */}
                <div className="p-4 flex flex-col justify-center bg-gray-800/50">
                    <p className="text-[10px] font-bold uppercase text-blue-400 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Target Due Date</p>
                    <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
                    />
                </div>

                {/* QUOTE INPUT */}
                <div className="p-4 flex flex-col justify-center bg-gray-800/50 relative">
                    <p className="text-[10px] font-bold uppercase text-yellow-400 mb-1 flex items-center gap-1"><DollarSign size={12}/> Quote Price</p>
                    <div className="flex items-center gap-1">
                        <span className="text-gray-400 font-bold">$</span>
                        <input 
                            type="number" 
                            value={quoteAmount}
                            onChange={(e) => setQuoteAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-white font-bold focus:outline-none w-24 text-lg"
                        />
                    </div>
                    <button 
                        onClick={handleUpdateJob}
                        disabled={isSaving}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black px-3 py-1 rounded text-xs font-bold hover:bg-gray-200"
                    >
                        {isSaving ? '...' : 'Save'}
                    </button>
                </div>

            </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT (Split View) */}
      <div className="flex-1 max-w-[1800px] mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: VISUAL PROOF */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[600px]">
             <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <FileText size={16} /> Digital Proof Preview
                </h3>
             </div>
             
             <div className="flex-1 bg-gray-100/50 flex items-center justify-center p-8 relative">
               {!fileUrl ? (
                 <div className="text-gray-400 text-sm">No file uploaded</div>
               ) : fileType === 'image' ? (
                 <img src={fileUrl} alt="Preview" className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded border border-gray-200" />
               ) : fileType === 'pdf' ? (
                 <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full min-h-[600px] rounded shadow-sm bg-white" title="PDF Preview"></iframe>
               ) : (
                 <div className="text-center">
                   <FileText size={48} className="mx-auto text-gray-300 mb-2" />
                   <p className="text-sm text-gray-500">Preview not available.</p>
                   <a href={fileUrl} className="text-blue-600 underline text-sm">Download File</a>
                 </div>
               )}
             </div>

             <div className="p-4 bg-white border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                <span>File: {job.file_url?.split('/').pop()}</span>
                <span>{job.notes ? `Note: ${job.notes}` : 'No notes provided'}</span>
             </div>
          </div>
        </div>

        {/* RIGHT: CHAT & ACTIVITY */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[calc(100vh-320px)] sticky top-6">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <MessageSquare size={16} className="text-gray-500" /> Team Discussion
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-400 text-xs mt-10">No messages yet.<br/>Start the conversation below.</div>
                    )}
                    {messages.map((msg) => {
                        const isMe = msg.user_id === user?.id;
                        const senderName = msg.profiles?.first_name || msg.profiles?.email?.split('@')[0] || 'User';
                        const isAdmin = msg.profiles?.role === 'admin' || msg.profiles?.role === 'staff';

                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-400 mb-1 px-1">
                                    {isAdmin && !isMe ? 'Staff' : senderName} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                                    isMe ? 'bg-black text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-black"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="bg-black text-white p-2 rounded-full hover:bg-gray-800 disabled:opacity-50"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
