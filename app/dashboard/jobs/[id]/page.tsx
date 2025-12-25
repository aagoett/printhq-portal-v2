'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, DollarSign, CheckCircle, 
  Clock, MessageSquare, User, Save
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
        // Fetch fresh to get the user details
        fetchMessages(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  // Scroll to bottom of chat when messages change
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
      .select('*, profiles(email, first_name, role)') // Join profiles to get names
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

  const isInternal = user?.email?.includes('@printedunion.com'); // Simple check, or use role

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-black mb-2">
            <ArrowLeft size={14} className="mr-1" /> Back to Dashboard
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {job.title}
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${job.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {job.status}
                </span>
              </h1>
              <p className="text-xs font-mono text-gray-400 mt-1">ID: #{job.id.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
            </div>
            {fileUrl && (
                <a href={fileUrl} target="_blank" className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800">
                    <Download size={16} /> Download Source
                </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (Production Data) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. ADMIN QUOTE BOX */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-yellow-400 p-2 rounded-lg text-yellow-900"><DollarSign size={20} /></div>
                <div>
                    <h3 className="font-bold text-yellow-900 text-sm">Project Quote</h3>
                    <p className="text-xs text-yellow-700">Set the pricing for this job.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input 
                        type="number" 
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-7 pr-4 py-2 w-32 rounded-lg border border-yellow-300 focus:outline-none focus:border-yellow-500 font-bold text-gray-900"
                    />
                </div>
                <button 
                    onClick={handleSaveQuote}
                    disabled={isSavingQuote}
                    className="p-2 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors"
                >
                    <Save size={20} />
                </button>
            </div>
          </div>

          {/* 2. DIGITAL PROOF / FILE PREVIEW */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FileText size={16} className="text-blue-500"/> Digital Proof
                </h3>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase">
                    {job.proof_status || 'Pending Approval'}
                </span>
             </div>
             
             <div className="bg-gray-100 min-h-[500px] flex items-center justify-center p-4">
               {!fileUrl ? (
                 <div className="text-gray-400 text-sm">No file uploaded</div>
               ) : fileType === 'image' ? (
                 <img src={fileUrl} alt="Preview" className="max-w-full max-h-[600px] object-contain shadow-lg rounded" />
               ) : fileType === 'pdf' ? (
                 <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-[600px] rounded shadow-sm" title="PDF Preview"></iframe>
               ) : (
                 <div className="text-center">
                   <FileText size={48} className="mx-auto text-gray-300 mb-2" />
                   <p className="text-sm text-gray-500">Preview not available.</p>
                 </div>
               )}
             </div>
          </div>

          {/* 3. SPECS & FOLDING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider flex items-center gap-2">
                    <Clock size={14} /> Production Specs
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-500">Quantity</span>
                        <span className="font-bold text-gray-900">{job.quantity}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-500">Stock</span>
                        <span className="font-bold text-gray-900">{job.paper_stock || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-500">Date In</span>
                        <span className="font-bold text-gray-900">{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider">Folding Preview</h3>
                <div className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-bold">No folding data</span>
                </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Discussion) */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-140px)] sticky top-24">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <MessageSquare size={16} className="text-gray-500" /> Discussion
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
                                    isMe 
                                      ? 'bg-black text-white rounded-tr-none' 
                                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
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
