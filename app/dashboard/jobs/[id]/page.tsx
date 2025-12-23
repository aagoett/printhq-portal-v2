'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, CheckCircle2, Clock, FileText, MessageSquare, Send, Download, 
  Printer, Truck, Settings, Layers
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

      const { data: jobData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !jobData) {
        router.push('/dashboard'); 
        return;
      }
      setJob(jobData);

      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', params.id)
        .order('created_at', { ascending: true });
      
      if (msgData) setMessages(msgData);
      setLoading(false);
    };

    fetchData();

    // Subscribe to chat
    const channel = supabase
      .channel('realtime messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, 
      (payload) => {
        setMessages((current) => [...current, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id, router]);

  // Scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Determine if Admin (Basic check for visual tag)
    const isAdmin = user.email?.includes('printedunion.com');

    const { error } = await supabase.from('messages').insert({
      job_id: params.id,
      user_id: user.id,
      content: newMessage,
      is_admin: isAdmin
    });

    if (!error) setNewMessage('');
  };

  const handleApproveProof = async () => {
    if(!confirm("Approve this proof for printing?")) return;
    await supabase.from('jobs').update({ proof_status: 'Approved', status: 'In Production' }).eq('id', params.id);
    window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-gray-500 mt-1 flex items-center">
                Job ID: <span className="font-mono ml-2 bg-gray-100 px-2 py-0.5 rounded text-sm">#{job.id.substring(0,8).toUpperCase()}</span>
              </p>
            </div>
            <StatusBadge status={job.status} />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: DETAILS & FOLDING (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="font-semibold text-gray-900 mb-6">Job Progress</h3>
            <Timeline status={job.status} />
          </div>

          {/* FOLDING PREVIEW & SPECS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* 1. VISUAL SPECS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Layers size={18} className="mr-2" /> Production Specs
              </h3>
              <div className="space-y-4">
                <SpecRow label="Quantity" value={job.quantity} />
                <SpecRow label="Paper Stock" value={job.paper_stock || 'Not Specified'} />
                <SpecRow label="Folding" value={job.folding_type || 'None'} />
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Original File</p>
                  <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${job.file_url}`} target="_blank" className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-black transition-colors group">
                    <div className="bg-gray-100 p-2 rounded mr-3 group-hover:bg-gray-200">
                      <Download size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-black truncate">Download PDF</span>
                  </a>
                </div>
              </div>
            </div>

            {/* 2. 3D FOLD ANIMATION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
               <h3 className="font-semibold text-gray-900 mb-6 text-sm">Folding Preview</h3>
               {/* THE ANIMATION COMPONENT */}
               <FoldingAnimation type={job.folding_type || 'None'} />
               <p className="mt-6 text-xs text-gray-400 text-center">
                 {job.folding_type ? `Visual representation of ${job.folding_type}` : 'Flat sheet (No folding)'}
               </p>
            </div>
          </div>

          {/* PROOFING */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Digital Proof</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${job.proof_status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {job.proof_status || 'Pending'}
              </span>
            </div>
            <div className="p-8 text-center">
              {job.proof_url ? (
                <div>
                   <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6 border-2 border-dashed border-gray-200">
                     <p className="text-gray-500">Proof Preview (PDF/Image)</p>
                   </div>
                   {job.proof_status !== 'Approved' ? (
                     <div className="flex justify-center gap-4">
                       <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-gray-700">Request Changes</button>
                       <button onClick={handleApproveProof} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm">Approve for Print</button>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center text-green-600 font-medium">
                       <CheckCircle2 className="mr-2" /> Proof Approved
                     </div>
                   )}
                </div>
              ) : (
                <div className="py-4">
                  <div className="mx-auto h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Proof in progress</h4>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: CHAT (1/3) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col sticky top-8">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MessageSquare size={18} className="mr-2" /> Discussion
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-10">No messages yet.</p>
              )}
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.is_admin ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-black text-white rounded-tr-none'
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
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
              <div className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
                <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-2 p-1.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50">
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

// --- SUB COMPONENTS ---

function SpecRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

// ✨ THE 3D FOLDING ANIMATION COMPONENT
function FoldingAnimation({ type }: { type: string }) {
  const isTriFold = type === 'Tri-Fold';
  const isHalfFold = type === 'Half-Fold';

  if (!isTriFold && !isHalfFold) {
    // Flat Sheet (Default)
    return <div className="w-32 h-48 bg-white border border-gray-200 shadow-sm relative"><div className="absolute inset-0 flex items-center justify-center text-gray-200 text-xs">Flat</div></div>;
  }

  return (
    <div className="perspective-800 w-48 h-48 flex items-center justify-center">
      <div className="relative w-32 h-40 flex preserve-3d animate-fold-hover">
        {/* Left Panel */}
        <div className={`absolute left-0 top-0 bottom-0 w-1/3 bg-white border border-gray-300 origin-right transition-transform duration-1000 ${isTriFold ? 'animate-trifold-left' : ''} ${isHalfFold ? 'w-1/2 animate-halffold-left' : ''}`}>
           <div className="w-full h-full bg-blue-50/20"></div>
        </div>

        {/* Center Panel (Tri-fold only) */}
        {isTriFold && (
          <div className="absolute left-1/3 top-0 bottom-0 w-1/3 bg-white border border-gray-300 flex items-center justify-center">
             <div className="w-1/2 h-2 bg-gray-100 rounded"></div>
          </div>
        )}

        {/* Right Panel */}
        <div className={`absolute right-0 top-0 bottom-0 bg-white border border-gray-300 origin-left transition-transform duration-1000 ${isTriFold ? 'w-1/3 animate-trifold-right' : ''} ${isHalfFold ? 'w-1/2 hidden' : ''}`}>
          <div className="w-full h-full bg-blue-50/20"></div>
        </div>
      </div>
      
      {/* Required CSS for the animation */}
      <style jsx>{`
        .perspective-800 { perspective: 800px; }
        .preserve-3d { transform-style: preserve-3d; }
        
        /* Tri-Fold Animations */
        @keyframes foldLeft {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(170deg); }
        }
        @keyframes foldRight {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(-170deg); }
        }
        .animate-trifold-left { animation: foldLeft 4s infinite ease-in-out; }
        .animate-trifold-right { animation: foldRight 4s infinite ease-in-out; }

        /* Half-Fold Animations */
        @keyframes halfFold {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(-175deg); }
        }
        .animate-halffold-left { animation: halfFold 4s infinite ease-in-out; }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = { 'Pending Review': 'bg-yellow-100 text-yellow-800', 'In Production': 'bg-purple-100 text-purple-800', 'Shipped': 'bg-green-100 text-green-800' };
  return <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
}

function Timeline({ status }: { status: string }) {
  const steps = ['Pending Review', 'Proof Ready', 'In Production', 'Shipped'];
  const currentIdx = steps.indexOf(status);
  const icons = [Clock, FileText, Printer, Truck];
  return (
    <div className="relative flex justify-between">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
      {steps.map((step, idx) => {
        const Icon = icons[idx];
        const isCompleted = currentIdx >= idx;
        const isCurrent = currentIdx === idx;
        return (
          <div key={step} className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
              <Icon size={18} />
            </div>
            <p className={`mt-3 text-xs font-bold uppercase tracking-wide ${isCurrent ? 'text-black' : 'text-gray-300'}`}>{step}</p>
          </div>
        );
      })}
    </div>
  );
}
