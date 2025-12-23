'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, CheckCircle2, Clock, FileText, MessageSquare, Send, Download, 
  Printer, Truck, Layers, Upload, DollarSign, Save, RotateCw, MoveVertical, MoveHorizontal
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [job, setJob] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Admin Action State
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  // Fold Orientation State
  const [foldOrientation, setFoldOrientation] = useState('Vertical');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA & CHECK ROLE
  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Check Admin Status
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      const _isAdmin = profile?.is_admin === true;
      setIsAdmin(_isAdmin);

      // Fetch Job
      const { data: jobData, error } = await supabase.from('jobs').select('*').eq('id', params.id).single();
      if (error || !jobData) { router.push('/dashboard'); return; }
      
      setJob(jobData);
      if(jobData.price) setQuotePrice(jobData.price.toString());
      if(jobData.fold_orientation) setFoldOrientation(jobData.fold_orientation);

      // Fetch Chat
      const { data: msgData } = await supabase.from('messages').select('*').eq('job_id', params.id).order('created_at', { ascending: true });
      if (msgData) setMessages(msgData);
      
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('realtime messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, 
      (payload) => setMessages((current) => [...current, payload.new]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- ACTIONS ---

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingProof(true);

    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `proof-${Date.now()}.${fileExt}`;

      const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('jobs').update({
        proof_url: fileData?.path,
        status: 'Proof Ready', 
        proof_status: 'Pending Approval' 
      }).eq('id', params.id);

      if (dbError) throw dbError;
      window.location.reload();

    } catch (err) {
      console.error(err);
      alert("Error uploading proof");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleSaveQuote = async () => {
    setIsSavingQuote(true);
    await supabase.from('jobs').update({ price: parseFloat(quotePrice) }).eq('id', params.id);
    setIsSavingQuote(false);
    alert("Price updated!");
  };

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from('jobs').update({ status: newStatus }).eq('id', params.id);
    window.location.reload();
  };

  // ADMIN: Toggle Fold Orientation
  const toggleFoldOrientation = async () => {
    const newOrientation = foldOrientation === 'Vertical' ? 'Horizontal' : 'Vertical';
    setFoldOrientation(newOrientation); // Update UI instantly
    await supabase.from('jobs').update({ fold_orientation: newOrientation }).eq('id', params.id);
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
            
            {isAdmin ? (
               <div className="flex items-center gap-2">
                 <span className="text-xs font-bold uppercase text-gray-400 mr-2">Set Status:</span>
                 {['Pending Review', 'Proof Ready', 'In Production', 'Shipped'].map((s) => (
                   <button 
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase border transition-all ${job.status === s ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                   >
                     {s}
                   </button>
                 ))}
               </div>
            ) : (
               <StatusBadge status={job.status} />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="font-semibold text-gray-900 mb-6">Job Progress</h3>
            <Timeline status={job.status} />
          </div>

          {/* ADMIN TOOLKIT */}
          {isAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Price Tool */}
              <div className="flex flex-col">
                <h3 className="font-bold text-yellow-900 flex items-center mb-2">
                  <DollarSign size={16} className="mr-2" /> Admin Quote
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative w-full">
                    <input 
                      type="number" 
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      className="pl-4 pr-4 py-2 w-full rounded-lg border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <button onClick={handleSaveQuote} disabled={isSavingQuote} className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                    <Save size={18} />
                  </button>
                </div>
              </div>

              {/* Fold Direction Tool */}
              {job.folding_type !== 'None' && (
                <div className="flex flex-col">
                   <h3 className="font-bold text-yellow-900 flex items-center mb-2">
                    <RotateCw size={16} className="mr-2" /> Fold Direction
                  </h3>
                  <button 
                    onClick={toggleFoldOrientation}
                    className="flex items-center justify-between px-4 py-2 bg-white border border-yellow-300 rounded-lg text-yellow-900 hover:bg-yellow-100 transition-colors"
                  >
                    <span className="text-sm font-medium">{foldOrientation} Axis</span>
                    {foldOrientation === 'Vertical' ? <MoveHorizontal size={16} /> : <MoveVertical size={16} />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PROOFING SECTION (Same as before) */}
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
                   <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6 border-2 border-dashed border-gray-200 relative group">
                     <p className="text-gray-500">
                       <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${job.proof_url}`} target="_blank" className="underline hover:text-black">
                         View Uploaded Proof
                       </a>
                     </p>
                   </div>

                   {job.proof_status !== 'Approved' ? (
                     isAdmin ? (
                       <p className="text-sm text-gray-500">Waiting for customer approval.</p>
                     ) : (
                       <div className="flex justify-center gap-4">
                         <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-gray-700">Request Changes</button>
                         <button onClick={handleApproveProof} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm">Approve for Print</button>
                       </div>
                     )
                   ) : (
                     <div className="flex items-center justify-center text-green-600 font-medium">
                       <CheckCircle2 className="mr-2" /> Proof Approved
                     </div>
                   )}
                </div>
              ) : (
                <div className="py-4">
                  {isAdmin ? (
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-6 w-6 text-gray-600" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">Upload Proof</h4>
                      <p className="text-xs text-gray-500 mb-4">Upload a PDF for the customer to approve.</p>
                      <button onClick={() => proofInputRef.current?.click()} disabled={isUploadingProof} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                        {isUploadingProof ? 'Uploading...' : 'Select File'}
                      </button>
                      <input type="file" ref={proofInputRef} onChange={handleProofUpload} className="hidden" accept=".pdf,.jpg,.png" />
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Clock className="h-6 w-6 text-blue-500" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-900">Proof in progress</h4>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* SPECS & ANIMATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Layers size={18} className="mr-2" /> Production Specs
              </h3>
              <div className="space-y-4">
                <SpecRow label="Quantity" value={job.quantity} />
                <SpecRow label="Paper Stock" value={job.paper_stock || 'Not Specified'} />
                <SpecRow label="Folding" value={job.folding_type || 'None'} />
                <SpecRow label="Direction" value={foldOrientation} />
                {job.price && <SpecRow label="Price" value={`$${job.price}`} />}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white overflow-hidden">
               <h3 className="font-semibold text-gray-900 mb-6 text-sm">Folding Preview</h3>
               
               {/* PASS ORIENTATION TO ANIMATION */}
               <FoldingAnimation type={job.folding_type || 'None'} orientation={foldOrientation} />
               
               <p className="mt-6 text-xs text-gray-400 text-center">
                 {job.folding_type ? `${job.folding_type} (${foldOrientation})` : 'Flat sheet'}
               </p>
            </div>
          </div>
        </div>

        {/* RIGHT: CHAT */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col sticky top-8">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MessageSquare size={18} className="mr-2" /> Discussion
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No messages yet.</p>}
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
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black" />
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

// 🪄 THE UPDATED 3D ANIMATION
function FoldingAnimation({ type, orientation }: { type: string, orientation: string }) {
  const isTriFold = type === 'Tri-Fold';
  const isHalfFold = type === 'Half-Fold';
  const isZFold = type === 'Z-Fold';
  const isVertical = orientation === 'Vertical';

  if (!isTriFold && !isHalfFold && !isZFold) {
    return <div className="w-32 h-48 bg-white border border-gray-200 shadow-sm relative"><div className="absolute inset-0 flex items-center justify-center text-gray-200 text-xs">Flat</div></div>;
  }

  // Adjust dimensions based on orientation
  const widthClass = isVertical ? 'w-48 h-48' : 'w-48 h-48'; 
  const containerClass = isVertical ? 'w-32 h-40 flex-row' : 'w-40 h-32 flex-col';

  return (
    <div className={`perspective-800 ${widthClass} flex items-center justify-center`}>
      <div className={`relative ${containerClass} flex preserve-3d animate-fold-hover`}>
        
        {/* Panel 1 */}
        <div className={`
          absolute border border-gray-300 bg-white transition-all duration-1000
          ${isVertical ? 'left-0 top-0 bottom-0 w-1/3 origin-right' : 'top-0 left-0 right-0 h-1/3 origin-bottom'}
          ${isTriFold ? (isVertical ? 'animate-v-tri-1' : 'animate-h-tri-1') : ''}
          ${isZFold ? (isVertical ? 'animate-v-z-1' : 'animate-h-z-1') : ''}
          ${isHalfFold ? (isVertical ? 'w-1/2 animate-v-half-1' : 'h-1/2 animate-h-half-1') : ''}
        `}>
           <div className="w-full h-full bg-blue-50/20"></div>
        </div>

        {/* Panel 2 (Center) - Only for Tri/Z */}
        {(isTriFold || isZFold) && (
          <div className={`
            absolute border border-gray-300 bg-white flex items-center justify-center
            ${isVertical ? 'left-1/3 top-0 bottom-0 w-1/3' : 'top-1/3 left-0 right-0 h-1/3'}
          `}>
             <div className="w-1/2 h-2 bg-gray-100 rounded"></div>
          </div>
        )}

        {/* Panel 3 */}
        <div className={`
          absolute border border-gray-300 bg-white transition-all duration-1000
          ${isVertical ? 'right-0 top-0 bottom-0 origin-left' : 'bottom-0 left-0 right-0 origin-top'}
          ${isTriFold ? (isVertical ? 'w-1/3 animate-v-tri-3' : 'h-1/3 animate-h-tri-3') : ''}
          ${isZFold ? (isVertical ? 'w-1/3 animate-v-z-3' : 'h-1/3 animate-h-z-3') : ''}
          ${isHalfFold ? (isVertical ? 'w-1/2 hidden' : 'h-1/2 hidden') : ''}
        `}>
          <div className="w-full h-full bg-blue-50/20"></div>
        </div>

      </div>
      
      {/* CSS MAGIC */}
      <style jsx>{`
        .perspective-800 { perspective: 800px; }
        .preserve-3d { transform-style: preserve-3d; }
        
        /* VERTICAL (Rotate Y) */
        @keyframes vTri1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vTri3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-170deg); } }
        @keyframes vZ1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vZ3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vHalf1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-175deg); } }

        /* HORIZONTAL (Rotate X) */
        @keyframes hTri1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hTri3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(170deg); } }
        @keyframes hZ1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hZ3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hHalf1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(175deg); } }

        .animate-v-tri-1 { animation: vTri1 4s infinite ease-in-out; }
        .animate-v-tri-3 { animation: vTri3 4s infinite ease-in-out; }
        .animate-v-z-1 { animation: vZ1 4s infinite ease-in-out; }
        .animate-v-z-3 { animation: vZ3 4s infinite ease-in-out; }
        .animate-v-half-1 { animation: vHalf1 4s infinite ease-in-out; }

        .animate-h-tri-1 { animation: hTri1 4s infinite ease-in-out; }
        .animate-h-tri-3 { animation: hTri3 4s infinite ease-in-out; }
        .animate-h-z-1 { animation: hZ1 4s infinite ease-in-out; }
        .animate-h-z-3 { animation: hZ3 4s infinite ease-in-out; }
        .animate-h-half-1 { animation: hHalf1 4s infinite ease-in-out; }
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
