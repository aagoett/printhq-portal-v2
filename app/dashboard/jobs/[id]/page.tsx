'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Clock, FileText, Download, CheckCircle, 
  AlertCircle, MessageSquare, Paperclip, Printer, User, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('unknown');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();

  useEffect(() => {
    const fetchJob = async () => {
      // 1. Fetch Job Data
      const { data, error } = await supabase
        .from('jobs')
        .select('*, orders(brand)') // Join to get brand name
        .eq('id', params.id)
        .single();

      if (error) {
        console.error("Error fetching job:", error);
        return; // Handle error appropriately (e.g., redirect)
      }
      setJob(data);

      // 2. Generate Secure File URL for Preview
      if (data.file_url) {
        // Create a signed URL valid for 1 hour
        const { data: urlData } = await supabase.storage
          .from('uploads')
          .createSignedUrl(data.file_url, 3600);
        
        if (urlData?.signedUrl) {
          setFileUrl(urlData.signedUrl);
          
          // Determine File Type for Preview
          const lowerPath = data.file_url.toLowerCase();
          if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg') || lowerPath.endsWith('.png') || lowerPath.endsWith('.webp')) {
            setFileType('image');
          } else if (lowerPath.endsWith('.pdf')) {
            setFileType('pdf');
          } else {
            setFileType('other');
          }
        }
      }
      
      setLoading(false);
    };

    fetchJob();
  }, [params.id]);

  if (loading) return <div className="p-12 text-center">Loading Job...</div>;
  if (!job) return <div className="p-12 text-center">Job not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
               <div className="flex items-center gap-3 mb-2">
                 <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                 <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                   {job.status}
                 </span>
               </div>
               <div className="flex items-center text-sm text-gray-500 gap-4">
                 <span className="font-mono">#{job.id.substring(0,8).toUpperCase()}</span>
                 {job.orders?.brand && (
                   <span className="flex items-center px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-bold text-xs">
                     {job.orders.brand}
                   </span>
                 )}
                 {job.guest_email && (
                   <span className="flex items-center text-yellow-600 font-bold">
                     <User size={14} className="mr-1" /> {job.guest_email}
                   </span>
                 )}
               </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700">
                <Printer size={16} /> Print Ticket
              </button>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800">
                  <Download size={16} /> Download File
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN - PREVIEW */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* FILE PREVIEW CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center">
                <Eye size={18} className="mr-2 text-gray-400"/> 
                File Preview
              </h3>
              <span className="text-xs font-mono text-gray-400">{job.file_url?.split('/').pop()}</span>
            </div>
            
            <div className="bg-gray-100 min-h-[400px] flex items-center justify-center relative">
               {!fileUrl ? (
                 <div className="text-gray-400 text-sm">No file uploaded</div>
               ) : fileType === 'image' ? (
                 <img src={fileUrl} alt="Preview" className="w-full h-auto max-h-[600px] object-contain" />
               ) : fileType === 'pdf' ? (
                 <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-[600px]" title="PDF Preview"></iframe>
               ) : (
                 <div className="text-center p-8">
                   <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                   <p className="text-gray-600 font-medium mb-2">No preview available for this file type.</p>
                   <a href={fileUrl} target="_blank" className="text-blue-600 underline text-sm hover:text-blue-800">Download to view</a>
                 </div>
               )}
            </div>
          </div>

          {/* DISCUSSION CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[400px]">
             <div className="px-6 py-4 border-b border-gray-100">
               <h3 className="font-bold text-gray-900 flex items-center">
                 <MessageSquare size={18} className="mr-2 text-gray-400" /> Discussion
               </h3>
             </div>
             <div className="flex-1 p-6 flex items-center justify-center text-gray-400 text-sm">
               No messages yet.
             </div>
             <div className="p-4 border-t border-gray-100">
               <div className="relative">
                 <input type="text" placeholder="Type a message..." className="w-full pl-4 pr-12 py-3 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5" />
                 <button className="absolute right-2 top-2 p-1 text-gray-400 hover:text-black"><Paperclip size={18} /></button>
               </div>
             </div>
          </div>

        </div>

        {/* RIGHT COLUMN - SPECS */}
        <div className="space-y-6">
           {/* SPECS CARD */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <h3 className="text-xs font-bold uppercase text-gray-500 mb-4 tracking-wider">Job Specifications</h3>
             
             <div className="space-y-4">
               <div>
                 <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                 <div className="text-lg font-bold text-gray-900">{job.quantity}</div>
               </div>
               <div>
                 <label className="text-xs text-gray-400 block mb-1">Paper / Material</label>
                 <div className="text-sm font-medium text-gray-900">{job.paper_stock || 'Standard'}</div>
               </div>
               <div>
                 <label className="text-xs text-gray-400 block mb-1">Notes</label>
                 <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                   {job.notes || 'No special notes.'}
                 </div>
               </div>
             </div>
           </div>

           {/* ADMIN TOOLS */}
           <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
              <h3 className="text-xs font-bold uppercase text-yellow-800 mb-4 tracking-wider">Admin Tools</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-2 bg-white rounded border border-yellow-300 text-sm font-bold text-yellow-900 hover:bg-yellow-100 transition-colors">
                  Submit Quote
                </button>
                <button className="w-full text-left px-4 py-2 bg-white rounded border border-yellow-300 text-sm font-bold text-yellow-900 hover:bg-yellow-100 transition-colors">
                  Upload Proof
                </button>
                <button className="w-full text-left px-4 py-2 bg-white rounded border border-yellow-300 text-sm font-bold text-yellow-900 hover:bg-yellow-100 transition-colors">
                  Mark as Complete
                </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
