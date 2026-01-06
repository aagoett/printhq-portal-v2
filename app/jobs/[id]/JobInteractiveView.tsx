'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, Scissors, CheckSquare, Megaphone,
  History, Eye, FileImage, ThumbsUp, XCircle, CheckCircle,
  Activity, Save, Lock, X, UploadCloud, MessageSquare, Layers
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { sendProofNotification } from '@/app/server-actions';

// Define types for props to ensure type safety
interface JobViewProps {
  user: any;
  initialJob: any;
  initialStep: any;
  serviceList: any[];
  initialAssets: any[];
  initialMessages: any[];
  initialLogs: any[];
  jobId: string;
}

export default function JobInteractiveView({ 
  user, initialJob, initialStep, serviceList, initialAssets, initialMessages, initialLogs, jobId 
}: JobViewProps) {

  // --- STATE (Initialized immediately with server data) ---
  const [job, setJob] = useState(initialJob);
  const [messages, setMessages] = useState(initialMessages);
  const [logs, setLogs] = useState(initialLogs); 
  const [assets, setAssets] = useState(initialAssets);
  
  // UI State
  const [rightTab, setRightTab] = useState<'chat' | 'activity'>('chat');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState(initialJob.internal_notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Preview State
  const [viewingAssetId, setViewingAssetId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('unknown');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side Supabase for Realtime & Storage
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
    // We only need to scroll on mount or new messages, we don't need to fetch initial data
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const channel = supabase.channel('job_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` }, 
        (payload) => {
             // Optimistic update or fetch single new message could go here
             // For simplicity, re-fetching to get the joined profile data
             refreshMessages(); 
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_assets', filter: `job_id=eq.${jobId}` }, 
        () => refreshAssets())
      .subscribe();

    // Initial Preview Load
    if (assets.length > 0) {
        const approved = assets.find((a: any) => a.status === 'approved');
        const latestProof = assets.find((a: any) => a.asset_type === 'proof' && a.status !== 'archived');
        loadPreview(approved || latestProof || assets[0]);
    }

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  // --- REFRESHERS (Lighter weight than full page fetch) ---
  const refreshMessages = async () => {
    const { data } = await supabase.from('messages').select('*, profiles(email, first_name, role)').eq('job_id', jobId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const refreshAssets = async () => {
    const { data } = await supabase.from('job_assets').select('*, profiles(first_name, email)').eq('job_id', jobId).order('created_at', { ascending: false });
    if (data) setAssets(data);
  };

  // --- ACTIONS ---
  const logActivity = async (action: string, details: string) => {
      await supabase.from('job_logs').insert({ job_id: jobId, user_id: user.id, action, details });
      // We can optimistically update local logs state here too
  };

  const loadPreview = async (asset: any) => {
      setViewingAssetId(asset.id);
      const { data } = await supabase.storage.from('uploads').createSignedUrl(asset.file_url, 3600);
      if (data?.signedUrl) {
          setPreviewUrl(data.signedUrl);
          const lower = asset.file_url.toLowerCase();
          if (lower.match(/\.(jpg|jpeg|png|webp)$/)) setPreviewType('image');
          else if (lower.endsWith('.pdf')) setPreviewType('pdf');
          else setPreviewType('other');
      }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage(''); // Optimistic clear
    await supabase.from('messages').insert({ job_id: jobId, user_id: user.id, content: msg });
    // Realtime subscription will catch the update
  };

  const handleSaveNotes = async () => {
      setIsSaving(true);
      await supabase.from('jobs').update({ internal_notes: internalNotes }).eq('id', jobId);
      await logActivity('Notes Updated', 'Updated internal production notes.');
      setIsSaving(false);
  };

  const toggleFinishingOption = async (optionName: string) => {
      const currentOptions = job.finishing_options || [];
      const newOptions = currentOptions.includes(optionName) 
        ? currentOptions.filter((o: string) => o !== optionName) 
        : [...currentOptions, optionName];
      
      setJob({ ...job, finishing_options: newOptions }); // Optimistic UI update
      await supabase.from('jobs').update({ finishing_options: newOptions }).eq('id', jobId);
      
      const action = currentOptions.includes(optionName) ? 'Removed' : 'Added';
      await logActivity('Finishing Updated', `${action} service: ${optionName}`);
  };

  // ... (Keep your existing handleFileSelect, handleSubmitProof, handleApproveProof logic here)
  // Just ensure they use `jobId` instead of `params.id`

  // --- RENDER HELPERS ---
  const getCountdown = () => {
      if (!job?.due_date) return { text: "NO DATE", color: "bg-gray-800" };
      const due = new Date(job.due_date);
      const now = new Date();
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { text: `${Math.abs(diffDays)} DAYS LATE`, color: "bg-red-600" };
      if (diffDays === 0) return { text: "DUE TODAY", color: "bg-orange-500" };
      return { text: `${diffDays} DAYS LEFT`, color: "bg-emerald-500" };
  };

  const countdown = getCountdown();
  const currentDepartment = initialStep ? initialStep.department : job.status;
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  
  // Reuse your exact existing JSX structure here, just replacing `params.id` with `jobId`
  // and removing the loading state checks because data is guaranteed by the server.
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
        {/* Paste your existing JSX starting from <div className="bg-white border-b...> down to the end */}
        {/* I will spare you the copy paste of the UI code, but it goes here exactly as you wrote it */}
        
        {/* HEADER EXAMPLE TO CONFIRM IT WORKS: */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
           <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={20} /></Link>
               <div>
                 <h1 className="text-xl font-bold text-gray-900 leading-none">{job.title}</h1>
                 <p className="text-xs font-mono text-gray-400 mt-1">#{jobId.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
               </div>
             </div>
             {/* ... rest of header ... */}
           </div>
        </div>
        
        {/* ... The rest of your Layout Grid (Cols 3/6/3) ... */}
    </div>
  );
}
