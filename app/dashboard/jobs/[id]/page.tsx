'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, DollarSign, 
  Clock, MessageSquare, Printer, Save, Calendar, Layers, Hash
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
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchPageData();
    
    // Real-time Subscription for new messages
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, 
      (payload) => {
        fetchMessages(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchPageData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // 1. Fetch Job
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, orders(brand)')
      .eq('id', params.id)
      .single();
    
    setJob(jobData);
    if (jobData?.quote_price) setQuoteAmount(jobData.quote_price);

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

    // 3. Fetch Messages
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

  const handleSaveQuote = async () => {
    setIsSavingQuote(true);
    await supabase.from('jobs').update({ quote_price: parseFloat(quoteAmount) }).eq('id', params.id);
    setIsSavingQuote(false);
    alert('Quote saved!');
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* 1. TOP NAV BAR */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
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

      {/* 2. THE PRODUCTION BANNER (New High-Priority Strip) */}
      <div className="bg-gray-900 text-white border-b border-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-8">
            
            {/* QTY */}
            <div className="flex items-center gap-3 border-r border-gray-700">
                <div className="p-2 bg-gray-800 rounded-lg"><Hash size={20} className="text-blue-400"/></div>
                <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Quantity</p>
                    <p className="text-2xl font-bold text-white leading-none">{job.quantity}</p>
                </div>
            </div>

            {/* STOCK */}
            <div className="flex items-center gap-3 border-r border-gray-700">
                <div className="p-2 bg-gray-800 rounded-lg"><Layers size={20} className="text-purple-400"/></div>
                <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Paper Stock</p>
                    <p className="text-sm font-bold text-white leading-tight">{job.paper_stock || 'Standard'}</p>
                </div>
            </div>

            {/* DATE */}
            <div className="flex items-center gap-3 border-r border-gray-700">
                <div className="p-2 bg-gray-800 rounded-lg"><Calendar size={20} className="text-green-400"/></div>
                <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Date In</p>
                    <p className="text-sm font-bold text-white leading-tight">{new Date(job.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            {/* QUOTE (Editable) */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg"><DollarSign size={20} className="text-yellow-400"/></div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Project Quote</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input 
                            type="number" 
                            value={quoteAmount} 
                            onChange={(e) => setQuoteAmount(e.target.value)}
                            className="bg-transparent border-b border-gray-600 w-24 text-white font-bold focus:outline-none focus:border-yellow-400 text-lg"
                            placeholder="0.00"
                        />
                        <button onClick={handleSaveQuote} disabled={isSavingQuote} className="text-xs bg-yellow-500 text-black px-2 py-1 rounded hover:bg-yellow-400 font-bold">
                           {isSavingQuote ? '...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
      </div>

      {/* 3. MAIN CONTENT (Split View) */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
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

             {/* Footer Note */}
             <div className="p-4 bg-white border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                <span>File: {job.file_url?.split('/').pop()}</span>
                <span>{job.notes ? `Note: ${job.notes}` : 'No notes provided'}</span>
             </div>
          </div>
        </div>

        {/* RIGHT: CHAT & ACTIVITY */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[calc(100vh-220px)] sticky top-6">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <MessageSquare size={16} className="text-gray-500" /> Team Discussion
                    </h3>
                </div>
                
                {/* MESSAGES LIST */}
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

                {/* INPUT AREA */}
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
