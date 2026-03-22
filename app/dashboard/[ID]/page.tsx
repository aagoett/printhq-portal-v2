'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  FileText, 
  MessageSquare, 
  Send, 
  Download,
  AlertCircle,
  Printer,
  Truck
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [job, setJob] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Fetch Job & Messages
  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;

      // Fetch Job
      const { data: jobData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error fetching job:', error);
        router.push('/dashboard'); // Kick back if not found
        return;
      }
      setJob(jobData);

      // Fetch Chat
      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', params.id)
        .order('created_at', { ascending: true });
      
      if (msgData) setMessages(msgData);
      setLoading(false);
    };

    fetchData();

    // OPTIONAL: Subscribe to real-time new messages here
    const channel = supabase
      .channel('realtime messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, 
      (payload) => {
        setMessages((current) => [...current, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [params.id, router]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        job_id: params.id,
        user_id: user.id,
        content: newMessage,
        is_admin: false
      });

    if (!error) setNewMessage('');
  };

  // 3. Approve Proof Logic
  const handleApproveProof = async () => {
    if(!confirm("Are you sure you want to approve this proof for printing?")) return;
    
    await supabase.from('jobs').update({ proof_status: 'Approved', status: 'Proof Approved - Waiting Release' }).eq('id', params.id);
    window.location.reload();
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-gray-500 mt-1 flex items-center">
                Job ID: <span className="font-mono ml-2 bg-gray-100 px-2 py-0.5 rounded text-sm">#{job.id.substring(0,8)}</span>
              </p>
            </div>
            <StatusBadge status={job.status} />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: DETAILS & PROOFING (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. TIMELINE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="font-semibold text-gray-900 mb-6">Job Progress</h3>
            <Timeline status={job.status} />
          </div>

          {/* 2. PROOFING AREA */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Digital Proof</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${job.proof_status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {job.proof_status || 'Waiting for Proof'}
              </span>
            </div>
            
            <div className="p-8 text-center">
              {job.proof_url ? (
                // IF PROOF EXISTS
                <div>
                   <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6 border-2 border-dashed border-gray-200">
                     <p className="text-gray-500">PDF Preview would render here</p>
                     {/* In reality, you'd put an <iframe src={job.proof_url} /> or <img /> here */}
                   </div>
                   
                   {job.proof_status !== 'Approved' ? (
                     <div className="flex justify-center gap-4">
                       <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-gray-700">Request Changes</button>
                       <button onClick={handleApproveProof} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm">Approve for Print</button>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center text-green-600 font-medium">
                       <CheckCircle2 className="mr-2" /> Proof Approved. We are printing!
                     </div>
                   )}
                </div>
              ) : (
                // NO PROOF YET
                <div className="py-8">
                  <div className="mx-auto h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Proof is being prepared</h4>
                  <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                    Our design team is reviewing your files. You will receive an email and a notification here when your proof is ready for review.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. JOB SPECS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="font-semibold text-gray-900 mb-6">Job Specifications</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Quantity</p>
                <p className="font-medium text-gray-900 mt-1">{job.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted Date</p>
                <p className="font-medium text-gray-900 mt-1">{new Date(job.created_at).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Notes</p>
                <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg text-sm">{job.notes || "No special notes provided."}</p>
              </div>
              <div className="col-span-2">
                 <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Original File</p>
                 <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${job.file_url}`} target="_blank" className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-black transition-colors group">
                   <div className="bg-gray-100 p-2 rounded mr-3 group-hover:bg-gray-200">
                     <Download size={16} />
                   </div>
                   <span className="text-sm font-medium text-gray-700 group-hover:text-black">Download Original Asset</span>
                 </a>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col sticky top-8">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MessageSquare size={18} className="mr-2" />
                Job Discussion
              </h3>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm mt-10">
                  <p>No messages yet.</p>
                  <p>Ask a question about this job!</p>
                </div>
              )}
              
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.is_admin 
                      ? 'bg-gray-100 text-gray-800 rounded-tl-none' 
                      : 'bg-black text-white rounded-tr-none'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 opacity-70 ${msg.is_admin ? 'text-gray-500' : 'text-gray-300'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
              <div className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-2 p-1.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'Pending Review': 'bg-yellow-100 text-yellow-800',
    'Proof Ready': 'bg-blue-100 text-blue-800',
    'In Production': 'bg-purple-100 text-purple-800',
    'Shipped': 'bg-green-100 text-green-800'
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function Timeline({ status }: { status: string }) {
  const steps = ['Pending Review', 'Proof Ready', 'In Production', 'Shipped'];
  const currentIdx = steps.indexOf(status);
  
  // Icons mapping
  const icons = [Clock, FileText, Printer, Truck];

  return (
    <div className="relative flex justify-between">
      {/* Connector Line */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
      
      {steps.map((step, idx) => {
        const Icon = icons[idx];
        const isCompleted = currentIdx >= idx;
        const isCurrent = currentIdx === idx;

        return (
          <div key={step} className="relative z-10 flex flex-col items-center group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              isCompleted 
                ? 'bg-black border-black text-white' 
                : 'bg-white border-gray-200 text-gray-300'
            }`}>
              <Icon size={18} />
            </div>
            <p className={`mt-3 text-xs font-bold uppercase tracking-wide transition-colors ${
              isCurrent ? 'text-black' : isCompleted ? 'text-gray-600' : 'text-gray-300'
            }`}>
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}
