'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, CheckCircle2, Clock, FileText, MessageSquare, Send, Download, 
  Printer, Truck, Layers, Upload, DollarSign, Save, RotateCw, MoveVertical, MoveHorizontal,
  Paperclip, CheckSquare, Plus, Trash2, User
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { sendProofNotification } from '../../../actions';

// Standard Departments to match your Dashboard
const DEPARTMENTS = ['Prepress', 'Plates', 'Press', 'Bindery', 'Shipping', 'Outsource'];

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
  
  // ROLES
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // ACTIONS
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [foldOrientation, setFoldOrientation] = useState('Vertical');

  // DATA
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  
  // NEW STEP FORM
  const [newStepDept, setNewStepDept] = useState('Press');
  const [newStepNotes, setNewStepNotes] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Check Roles
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const userRole = profile?.role || 'customer';
      const isInternal = userRole === 'admin' || userRole === 'staff';
      setIsAdmin(isInternal); 
      setIsSuperAdmin(userRole === 'admin');

      // Fetch Job
      const { data: jobData, error } = await supabase.from('jobs').select('*').eq('id', params.id).single();
      if (error || !jobData) { router.push('/dashboard'); return; }
      
      setJob(jobData);
      if(jobData.price) setQuotePrice(jobData.price.toString());
      if(jobData.fold_orientation) setFoldOrientation(jobData.fold_orientation);

      // Fetch Messages
      const { data: msgData } = await supabase.from('messages').select('*').eq('job_id', params.id).order('created_at', { ascending: true });
      if (msgData) setMessages(msgData);

      // Fetch Files
      const { data: fileData } = await supabase.from('job_files').select('*').eq('job_id', params.id).order('created_at', { ascending: false });
      if (fileData) setAllFiles(fileData);

      // Fetch Workflow Steps
      const { data: stepData } = await supabase.from('job_steps').select('*').eq('job_id', params.id).order('step_order', { ascending: true });
      if (stepData) setSteps(stepData);
      
      setLoading(false);
    };
    fetchData();

    // Realtime Subscriptions
    const channel = supabase.channel('realtime_job')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `job_id=eq.${params.id}` }, 
        (payload) => setMessages((current) => [...current, payload.new]))
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [params.id, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- HANDLERS ---

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('messages').insert({
      job_id: params.id, user_id: user.id, content: newMessage, is_admin: isAdmin 
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
      const fileName = `proof-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file);
      if (uploadError) throw uploadError;

      await supabase.from('jobs').update({ proof_url: fileData?.path, status: 'Proof Ready', proof_status: 'Pending Approval' }).eq('id', params.id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('job_files').insert({
          job_id: params.id, file_name: `Proof: ${file.name}`, file_path: fileData?.path, file_type: 'proof', uploaded_by: user.id
        });
      }
      
      // Notify
      const { data: jobOwner } = await supabase.from('profiles').select('email').eq('id', job.user_id).single();
      const targetEmail = job.guest_email || jobOwner?.email;
      if (targetEmail) {
         await sendProofNotification(targetEmail, params.id as string, job.title);
         alert("Proof uploaded! Notification sent.");
      }
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

  const toggleFoldOrientation = async () => {
    const newOrientation = foldOrientation === 'Vertical' ? 'Horizontal' : 'Vertical';
    setFoldOrientation(newOrientation); 
    await supabase.from('jobs').update({ fold_orientation: newOrientation }).eq('id', params.id);
  };

  // --- WORKFLOW HANDLERS (UPDATED FOR INSTANT FEEDBACK) ---
  
  const handleAddStep = async () => {
    if (!newStepDept) return;

    try {
      const newOrder = steps.length + 1;
      
      // 1. Send to Database
      const { data, error } = await supabase.from('job_steps').insert({
        job_id: params.id, 
        department: newStepDept, 
        step_order: newOrder, 
        notes: newStepNotes, 
        status: 'Pending'
      })
      .select()
      .single();

      if (error) throw error;

      // 2. FORCE SCREEN UPDATE (Show it instantly)
      if (data) {
        setSteps([...steps, data]);
        setNewStepNotes(''); // Clear input
      }

    } catch (err: any) {
      console.error('Error adding step:', err);
      alert('Error adding step. Check console.');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if(!confirm("Remove this step?")) return;
    
    // 1. FORCE SCREEN UPDATE (Remove from list instantly)
    setSteps(steps.filter(s => s.id !== stepId));
    
    // 2. Send delete command to Database quietly
    await supabase.from('job_steps').delete().eq('id', stepId);
  };

  const toggleStepStatus = async (step: any) => {
    const newStatus = step.status === 'Completed' ? 'Pending' : 'Completed';
    
    // 1. FORCE SCREEN UPDATE (Toggle checkmark instantly)
    setSteps(steps.map(s => s.id === step.id ? {...s, status: newStatus} : s));

    // 2. Send update to Database quietly
    await supabase.from('job_steps').update({ status: newStatus }).eq('id', step.id);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>;

  const isApproved = job.proof_status === 'Approved';
  const activeFileUrl = isApproved && job.proof_url ? job.proof_url : job.file_url;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* PRINT TICKET HEADER */}
      <div className="print-only-header hidden">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Production Ticket</h1>
            <p className="text-xl mt-2">Job #{job?.id.substring(0,8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">{new Date().toLocaleDateString()}</h2>
          </div>
        </div>
        {/* Guest Info on Ticket */}
        {job.guest_email && (
            <div className="mt-4 border p-2 text-sm font-bold bg-gray-100">
                GUEST CUSTOMER: {job.guest_email}
            </div>
        )}
        {/* Steps on Ticket */}
        {steps.length > 0 && (
          <div className="mt-8 border-t-2 border-black pt-4">
             <h3 className="font-bold uppercase mb-2">Routing Steps:</h3>
             <ul className="space-y-2">
               {steps.map((s, i) => (
                 <li key={s.id} className="flex items-center text-sm border-b border-gray-300 pb-2">
                   <span className="font-bold mr-4 w-6">{i+1}.</span>
                   <span className="font-bold uppercase w-32">{s.department}</span>
                   <span className="italic">{s.notes}</span>
                   <span className="ml-auto border border-black px-2 py-1 text-xs">INITIAL: ______</span>
                 </li>
               ))}
             </ul>
          </div>
        )}
      </div>

      {/* --- SCREEN HEADER --- */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <div className="flex items-center gap-4 mt-1">
                 <p className="text-gray-500 flex items-center">
                    Job ID: <span className="font-mono ml-2 bg-gray-100 px-2 py-0.5 rounded text-sm">#{job.id.substring(0,8).toUpperCase()}</span>
                 </p>
                 {job.guest_email && (
                     <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold flex items-center">
                        <User size={12} className="mr-1"/> Guest: {job.guest_email}
                     </span>
                 )}
              </div>
            </div>
            {isAdmin ? (
               <div className="flex items-center gap-2">
                 <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-bold uppercase hover:bg-gray-50 hover:border-black transition-all">
                   <Printer size={14} /> Ticket
                 </button>
                 <span className="text-xs font-bold uppercase text-gray-400 mr-2 ml-2">Set Status:</span>
                 {['Pending Review', 'Proof Ready', 'In Production', 'Shipped'].map((s) => (
                   <button key={s} onClick={() => handleStatusChange(s)} className={`px-3 py-1 rounded-full text-xs font-bold uppercase border transition-all ${job.status === s ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>
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

          {/* WORKFLOW MANAGER */}
          {(steps.length > 0 || isAdmin) && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckSquare size={18} className="mr-2" /> Production Workflow
                </h3>
                
                {/* List of Steps */}
                <div className="space-y-3 mb-6">
                  {steps.map((step, idx) => (
                    <div key={step.id} className={`flex items-start p-3 rounded-lg border ${step.status === 'Completed' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="mt-0.5 mr-3">
                        {isAdmin ? (
                          <button onClick={() => toggleStepStatus(step)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${step.status === 'Completed' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300'}`}>
                            {step.status === 'Completed' && <CheckCircle2 size={14} />}
                          </button>
                        ) : (
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${step.status === 'Completed' ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-200 border-gray-300'}`}>
                             {step.status === 'Completed' && <CheckCircle2 size={14} />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                           <span className={`font-bold text-sm ${step.status === 'Completed' ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                                {idx + 1}. {step.department}
                           </span>
                           {isAdmin && <button onClick={() => handleDeleteStep(step.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>}
                        </div>
                        {step.notes && <p className="text-xs text-gray-500 mt-1">{step.notes}</p>}
                      </div>
                    </div>
                  ))}
                  {steps.length === 0 && !isAdmin && <p className="text-sm text-gray-400 italic">No workflow steps defined.</p>}
                </div>

                {/* Add Step Form (Admin Only) */}
                {isAdmin && (
                  <div className="flex gap-2 items-start pt-4 border-t border-gray-100">
                     <select value={newStepDept} onChange={(e) => setNewStepDept(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:border-black outline-none">
                       {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                     </select>
                     <input 
                       type="text" 
                       placeholder="Instructions (e.g. Cut to 5x7)" 
                       value={newStepNotes}
                       onChange={(e) => setNewStepNotes(e.target.value)}
                       className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-black outline-none"
                     />
                     <button onClick={handleAddStep} className="p-2 bg-black text-white rounded-lg hover:bg-gray-800"><Plus size={18}/></button>
                  </div>
                )}
             </div>
          )}

          {/* ADMIN TOOLKIT */}
          {isAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PRICING */}
              {isSuperAdmin && (
                <div className="flex flex-col">
                  <h3 className="font-bold text-yellow-900 flex items-center mb-2"><DollarSign size={16} className="mr-2" /> Admin Quote</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <input type="number" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} className="pl-4 pr-4 py-2 w-full rounded-lg border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500 text-sm" placeholder="0.00" />
                    </div>
                    <button onClick={handleSaveQuote} disabled={isSavingQuote} className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"><Save size={18} /></button>
                  </div>
                </div>
              )}
              {job.folding_type !== 'None' && (
                <div className="flex flex-col">
                   <h3 className="font-bold text-yellow-900 flex items-center mb-2"><RotateCw size={16} className="mr-2" /> Fold Direction</h3>
                   <button onClick={toggleFoldOrientation} className="flex items-center justify-between px-4 py-2 bg-white border border-yellow-300 rounded-lg text-yellow-900 hover:bg-yellow-100 transition-colors">
                    <span className="text-sm font-medium">{foldOrientation} Axis</span>
                    {foldOrientation === 'Vertical' ? <MoveHorizontal size={16} /> : <MoveVertical size={16} />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PROOFING SECTION */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Digital Proof</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${job.proof_status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{job.proof_status || 'Pending'}</span>
            </div>
            <div className="p-8 text-center">
              {job.proof_url ? (
                <div>
                   <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6 border-2 border-dashed border-gray-200 relative group">
                     <p className="text-gray-500">
                       <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${job.proof_url}`} target="_blank" className="underline hover:text-black">View Uploaded Proof</a>
                     </p>
                   </div>
                   {job.proof_status !== 'Approved' ? (
                     isAdmin ? <p className="text-sm text-gray-500">Waiting for customer approval.</p> : (
                       <div className="flex justify-center gap-4">
                         <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-gray-700">Request Changes</button>
                         <button onClick={handleApproveProof} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm">Approve for Print</button>
                       </div>
                     )
                   ) : <div className="flex items-center justify-center text-green-600 font-medium"><CheckCircle2 className="mr-2" /> Proof Approved</div>}
                </div>
              ) : (
                <div className="py-4">
                  {isAdmin ? (
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Upload className="h-6 w-6 text-gray-600" /></div>
                      <h4 className="text-sm font-bold text-gray-900">Upload Proof</h4>
                      <p className="text-xs text-gray-500 mb-4">Upload a PDF for the customer to approve.</p>
                      <button onClick={() => proofInputRef.current?.click()} disabled={isUploadingProof} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800">{isUploadingProof ? 'Uploading...' : 'Select File'}</button>
                      <input type="file" ref={proofInputRef} onChange={handleProofUpload} className="hidden" accept=".pdf,.jpg,.png" />
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4"><Clock className="h-6 w-6 text-blue-500" /></div>
                      <h4 className="text-sm font-medium text-gray-900">Proof in progress</h4>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* PRODUCTION SPECS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center"><Layers size={18} className="mr-2" /> Production Specs</h3>
              <div className="space-y-4">
                <SpecRow label="Quantity" value={job.quantity} />
                <SpecRow label="Paper Stock" value={job.paper_stock || 'Not Specified'} />
                <SpecRow label="Folding" value={job.folding_type || 'None'} />
                <SpecRow label="Direction" value={foldOrientation} />
                {job.price && <SpecRow label="Price" value={`$${job.price}`} />}
                
                {/* DYNAMIC DOWNLOAD BUTTON */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    {isApproved ? 'Production File' : 'Original File'}
                  </p>
                  <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${activeFileUrl}`} target="_blank" className={`flex items-center p-3 border rounded-lg transition-colors group ${isApproved ? 'border-green-200 bg-green-50 hover:border-green-500 hover:bg-green-100' : 'border-gray-200 hover:border-black'}`}>
                    <div className={`p-2 rounded mr-3 ${isApproved ? 'bg-green-200 text-green-700' : 'bg-gray-100 group-hover:bg-gray-200'}`}><Download size={16} /></div>
                    <div>
                      <span className={`text-sm font-bold block ${isApproved ? 'text-green-900' : 'text-gray-700 group-hover:text-black'}`}>{isApproved ? 'Download Print-Ready File' : 'Download Original Upload'}</span>
                      {isApproved && <span className="text-xs text-green-600 font-medium">✅ Verified Approved Proof</span>}
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white overflow-hidden">
               <h3 className="font-semibold text-gray-900 mb-6 text-sm">Folding Preview</h3>
               <FoldingAnimation type={job.folding_type || 'None'} orientation={foldOrientation} />
               <p className="mt-6 text-xs text-gray-400 text-center">{job.folding_type ? `${job.folding_type} (${foldOrientation})` : 'Flat sheet'}</p>
            </div>
          </div>

          {/* FILE VAULT */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h3 className="font-semibold text-gray-900 mb-4 flex items-center"><Paperclip size={18} className="mr-2" /> File Vault</h3>
               {allFiles.length > 0 ? (
                 <div className="space-y-2">
                   {allFiles.map((file) => (
                     <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                       <div className="flex items-center">
                         <FileText size={16} className="text-gray-400 mr-3" />
                         <div>
                            <p className="font-medium text-gray-900">{file.file_name}</p>
                            <p className="text-xs text-gray-500">{new Date(file.created_at).toLocaleString()}</p>
                         </div>
                       </div>
                       <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${file.file_path}`} target="_blank" className="text-blue-600 hover:underline">Download</a>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-gray-400">Files appear here after uploading.</p>
               )}
            </div>
          )}
        </div>

        {/* RIGHT: CHAT */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col sticky top-8">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-semibold text-gray-900 flex items-center"><MessageSquare size={18} className="mr-2" /> Discussion</h3></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No messages yet.</p>}
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.is_admin ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-black text-white rounded-tr-none'}`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 opacity-70 ${msg.is_admin ? 'text-gray-500' : 'text-gray-300'}`}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
              <div className="relative">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black" />
                <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-2 p-1.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50"><Send size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          nav, .bg-white.border-b, button, input, textarea, .lg\\:col-span-1, a[href^="/dashboard"], .aspect-video { display: none !important; }
          body, .min-h-screen, .bg-gray-50 { background-color: white !important; height: auto !important; }
          .lg\\:col-span-2 { width: 100% !important; grid-column: span 3 !important; }
          .print-only-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px; }
          * { color: black !important; }
        }
        .print-only-header { display: none; }
        
        /* FOLD ANIMATIONS */
        .perspective-800 { perspective: 800px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        @keyframes vTri1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vTri3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-170deg); } }
        @keyframes vZ1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vZ3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vHalf1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-175deg); } }
        @keyframes hTri1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hTri3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(170deg); } }
        @keyframes hZ1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hZ3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hHalf1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(175deg); } }
        .animate-v-tri-1 { animation: vTri1 5s infinite ease-in-out; }
        .animate-v-tri-3 { animation: vTri3 5s infinite ease-in-out; }
        .animate-v-z-1 { animation: vZ1 5s infinite ease-in-out; }
        .animate-v-z-3 { animation: vZ3 5s infinite ease-in-out; }
        .animate-v-half-1 { animation: vHalf1 5s infinite ease-in-out; }
        .animate-h-tri-1 { animation: hTri1 5s infinite ease-in-out; }
        .animate-h-tri-3 { animation: hTri3 5s infinite ease-in-out; }
        .animate-h-z-1 { animation: hZ1 5s infinite ease-in-out; }
        .animate-h-z-3 { animation: hZ3 5s infinite ease-in-out; }
        .animate-h-half-1 { animation: hHalf1 5s infinite ease-in-out; }
      `}</style>
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
function FoldingAnimation({ type, orientation }: { type: string, orientation: string }) {
  const isTriFold = type === 'Tri-Fold'; const isHalfFold = type === 'Half-Fold'; const isZFold = type === 'Z-Fold'; const isVertical = orientation === 'Vertical';
  if (!isTriFold && !isHalfFold && !isZFold) {
    return (<div className="w-32 h-48 bg-white border border-gray-200 shadow-sm relative flex flex-col p-2"><MockPaperContent /><div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 font-medium bg-white/50">FLAT</div></div>);
  }
  const widthClass = 'w-48 h-48'; const containerClass = isVertical ? 'w-32 h-40 flex-row' : 'w-40 h-32 flex-col';
  return (
    <div className={`perspective-800 ${widthClass} flex items-center justify-center`}><div className={`relative ${containerClass} flex preserve-3d animate-fold-hover`}><div className={`absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1 ${isVertical ? 'left-0 top-0 bottom-0 w-1/3 origin-right' : 'top-0 left-0 right-0 h-1/3 origin-bottom'} ${isTriFold ? (isVertical ? 'animate-v-tri-1' : 'animate-h-tri-1') : ''} ${isZFold ? (isVertical ? 'animate-v-z-1' : 'animate-h-z-1') : ''} ${isHalfFold ? (isVertical ? 'w-1/2 animate-v-half-1' : 'h-1/2 animate-h-half-1') : ''}`}><MockPaperContent part={1} vertical={isVertical} /><div className="absolute inset-0 bg-gray-50 opacity-0 backface-hidden"></div></div>{(isTriFold || isZFold) && (<div className={`absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1 ${isVertical ? 'left-1/3 top-0 bottom-0 w-1/3' : 'top-1/3 left-0 right-0 h-1/3'}`}><MockPaperContent part={2} vertical={isVertical} /></div>)}<div className={`absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1 ${isVertical ? 'right-0 top-0 bottom-0 origin-left' : 'bottom-0 left-0 right-0 origin-top'} ${isTriFold ? (isVertical ? 'w-1/3 animate-v-tri-3' : 'h-1/3 animate-h-tri-3') : ''} ${isZFold ? (isVertical ? 'w-1/3 animate-v-z-3' : 'h-1/3 animate-h-z-3') : ''} ${isHalfFold ? (isVertical ? 'w-1/2 hidden' : 'h-1/2 hidden') : ''}`}><MockPaperContent part={3} vertical={isVertical} /></div></div></div>
  );
}
function MockPaperContent({ part = 1, vertical = true }: { part?: number, vertical?: boolean }) {
  return (<div className={`w-full h-full flex ${vertical ? 'flex-col space-y-1' : 'flex-row space-x-1'} opacity-60`}>{part === 1 && <div className={`${vertical ? 'h-8 w-full' : 'w-8 h-full'} bg-gray-200 rounded-sm`}></div>}<div className="flex-1 space-y-1"><div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-full' : 'w-1 h-full'}`}></div><div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-5/6' : 'w-1 h-5/6'}`}></div><div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-full' : 'w-1 h-full'}`}></div><div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-4/5' : 'w-1 h-4/5'}`}></div>{part === 2 && <><div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-full' : 'w-1 h-full'}`}></div><div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-4/6' : 'w-1 h-4/6'}`}></div></>}</div>{part === 3 && <div className={`${vertical ? 'h-6 w-full mt-auto' : 'w-6 h-full ml-auto'} bg-gray-200 rounded-sm`}></div>}</div>);
}
