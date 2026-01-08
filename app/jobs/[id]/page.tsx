'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  CheckCircle, Clock, FileText, Download, ThumbsUp, AlertTriangle, 
  MapPin, Package, CheckSquare, Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PublicJobTracker() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [assets, setAssets] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (params.id) fetchJobDetails();
  }, [params.id]);

  const fetchJobDetails = async () => {
    try {
        console.log("Fetching job:", params.id);
        
        // 1. Get Job Header
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*, orders(brands(name))')
          .eq('id', params.id)
          .single();

        if (jobError) {
            console.error("Job Fetch Error:", jobError);
            setErrorMsg("We couldn't find this order. It may have been deleted or the link is incorrect.");
            setLoading(false);
            return;
        }
        setJob(jobData);

        // 2. Get Items & Steps
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*, job_item_steps(*)') 
          .eq('job_id', params.id);

        if (itemsData) setItems(itemsData);

        // 3. Get Assets (Proofs)
        const { data: assetData } = await supabase
          .from('job_assets')
          .select('*')
          .eq('job_id', params.id)
          .eq('asset_type', 'proof') 
          .order('created_at', { ascending: false });

        if (assetData) setAssets(assetData);
        
    } catch (err) {
        console.error("Unexpected Error:", err);
        setErrorMsg("An unexpected error occurred loading your order.");
    } finally {
        setLoading(false);
    }
  };

  const handleApprove = async (assetId: string) => {
      if(!confirm("Are you sure you want to approve this for print?")) return;
      
      await supabase.from('job_assets').update({ status: 'approved' }).eq('id', assetId);
      await supabase.from('jobs').update({ status: 'In Production' }).eq('id', params.id);
      alert("Thank you! We have notified the production team.");
      fetchJobDetails(); // Refresh
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading Order Details...
    </div>
  );

  if (errorMsg) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Access Error</h3>
            <p className="text-gray-600">{errorMsg}</p>
        </div>
    </div>
  );

  if (!job) return null;

  const currentProof = assets.find(a => a.status !== 'archived');
  const isApproved = currentProof?.status === 'approved';
  const brandName = job.orders?.brands?.name || 'PrintHQ';

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6 flex justify-between items-center">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-xs md:text-sm text-gray-500 font-mono mt-1">
                    #{job.id.substring(0,8).toUpperCase()} • {brandName}
                </p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide ${job.status === 'In Production' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {job.status}
            </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT: STATUS & ITEMS */}
        <div className="md:col-span-2 space-y-6">
            
            {/* PROOFING SECTION */}
            {currentProof && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-2">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <FileText size={16} /> Digital Proof
                        </h3>
                        {isApproved ? (
                            <span className="text-green-600 font-bold text-xs flex items-center gap-1 bg-green-50 px-2 py-1 rounded"><CheckCircle size={12}/> APPROVED</span>
                        ) : (
                            <span className="text-amber-600 font-bold text-xs flex items-center gap-1 bg-amber-50 px-2 py-1 rounded"><AlertTriangle size={12}/> ACTION REQUIRED</span>
                        )}
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-600 mb-4">Please review your artwork proof below. Check specifically for spelling, layout, and image quality.</p>
                        
                        <div className="bg-gray-100 rounded-lg p-4 mb-4 flex items-center justify-between border border-gray-200">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-white p-2 rounded border border-gray-200 text-blue-500"><FileText size={24}/></div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{currentProof.file_name}</p>
                                    <p className="text-xs text-gray-500">{new Date(currentProof.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {job.file_url || currentProof.file_url ? (
                                    <a 
                                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${currentProof.file_url}`} 
                                      target="_blank" 
                                      className="text-xs bg-white border border-gray-300 px-3 py-2 rounded font-bold text-gray-700 hover:text-black hover:border-black flex items-center gap-1 transition-all"
                                    >
                                        <Download size={14}/> Download
                                    </a>
                                ) : null}
                            </div>
                        </div>

                        {!isApproved && (
                            <button onClick={() => handleApprove(currentProof.id)} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2">
                                <ThumbsUp size={18} /> I Approve This Proof
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* LINE ITEMS & TRACKING */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Package size={16} /> Production Status
                </h3>
                
                <div className="space-y-8">
                    {items.map((item, idx) => {
                        // Filter out internal steps
                        const publicSteps = item.job_item_steps?.filter((s:any) => s.is_internal === false) || [];
                        
                        return (
                        <div key={item.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{item.description}</h4>
                                    <p className="text-xs text-gray-500 font-mono mt-1">{item.quantity.toLocaleString()} Qty • {item.size} • {item.paper_stock}</p>
                                </div>
                                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">Item {idx + 1}</span>
                            </div>

                            {/* PROGRESS BAR */}
                            {publicSteps.length > 0 ? (
                                <div className="relative pt-2 pb-2">
                                    {/* Line */}
                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
                                    
                                    {/* Steps */}
                                    <div className="flex justify-between relative z-10">
                                        {publicSteps.map((step: any, sIdx: number) => {
                                            const isComplete = step.status === 'Completed';
                                            return (
                                                <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isComplete ? 'bg-black border-black text-white' : 'bg-white border-gray-300 text-transparent'}`}>
                                                        <CheckSquare size={10} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase ${isComplete ? 'text-black' : 'text-gray-400'}`}>{step.step_name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-3 rounded text-center">
                                    <p className="text-xs text-gray-400 italic">Production steps pending.</p>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>
        </div>

        {/* RIGHT: INFO */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-4">Order Details</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Date Placed</span>
                        <span className="font-medium">{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Total Items</span>
                        <span className="font-medium">{items.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Delivery Method</span>
                        <span className="font-medium">Shipping</span>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                <h3 className="text-xs font-bold uppercase text-blue-800 mb-2">Need Help?</h3>
                <p className="text-sm text-blue-900 mb-4">If you have questions about your order, please contact our support team.</p>
                <a href="mailto:support@printedunion.com" className="text-sm font-bold text-blue-600 hover:underline">Contact Support &rarr;</a>
            </div>
        </div>

      </main>
    </div>
  );
}
