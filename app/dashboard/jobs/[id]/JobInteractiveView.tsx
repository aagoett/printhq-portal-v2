'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, Scissors, CheckSquare, Megaphone,
  History, Eye, FileImage, ThumbsUp, XCircle, CheckCircle,
  Activity, Save, Lock, X, UploadCloud, MessageSquare, Layers, AlertTriangle, Plus, Settings
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
// Fix: Use relative path (3 dots) for Dashboard folder
import { sendProofNotification } from '../../../server-actions'; 

// --- HELPER COMPONENT: ADD ITEM FORM ---
function AddItemForm({ onAdd, onCancel }: { onAdd: (item: any) => void, onCancel: () => void }) {
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('');
  const [stock, setStock] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc) return;
    onAdd({ description: desc, quantity: parseInt(qty) || 0, paper_stock: stock });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 p-4 border-b border-blue-100 flex flex-wrap gap-2 items-end animate-in slide-in-from-top-2">
      <div className="flex-1 min-w-[200px]">
        <label className="text-[10px] font-bold uppercase text-blue-800 block mb-1">Item Name</label>
        <input autoFocus value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Letterhead" className="w-full text-xs p-2 rounded border border-blue-200 focus:outline-none focus:border-blue-500" />
      </div>
      <div className="w-24">
        <label className="text-[10px] font-bold uppercase text-blue-800 block mb-1">Qty</label>
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="w-full text-xs p-2 rounded border border-blue-200 focus:outline-none focus:border-blue-500" />
      </div>
      <div className="flex-1 min-w-[150px]">
        <label className="text-[10px] font-bold uppercase text-blue-800 block mb-1">Paper / Stock</label>
        <input value={stock} onChange={e => setStock(e.target.value)} placeholder="e.g. 70lb Uncoated" className="w-full text-xs p-2 rounded border border-blue-200 focus:outline-none focus:border-blue-500" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-blue-700 shadow-sm">Save</button>
        <button type="button" onClick={onCancel} className="bg-white text-blue-600 text-xs font-bold px-3 py-2 rounded border border-blue-200 hover:bg-blue-50">Cancel</button>
      </div>
    </form>
  );
}

// --- HELPER COMPONENT: ITEM DETAIL DRAWER (The "Home" for Item Specs) ---
function ItemDetailDrawer({ item, onClose, onUpdate }: { item: any, onClose: () => void, onUpdate: (id: string, data: any) => void }) {
  const [formData, setFormData] = useState({
    description: item.description || '',
    quantity: item.quantity || 0,
    paper_stock: item.paper_stock || '',
    size: item.size || '',
    ink_colors: item.ink_colors || '',
    notes: item.internal_notes || ''
  });

  const handleSave = () => {
    onUpdate(item.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" />
      
      {/* The Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-gray-200">
        <div className="flex justify-between items-start mb-6">
           <div>
             <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
             <p className="text-xs text-gray-400 font-mono uppercase">{item.id.split('-')[0]}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="space-y-6">
           {/* Section 1: Basics */}
           <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-gray-500 border-b pb-1">General Info</h3>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Name</label>
                <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded text-sm font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                    <input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                    <div className="p-2 bg-gray-100 rounded text-sm text-gray-500">{item.status}</div>
                </div>
              </div>
           </div>

           {/* Section 2: Print Specs */}
           <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-gray-500 border-b pb-1">Print Specifications</h3>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Paper Stock</label>
                <input placeholder="e.g. 100lb Gloss Cover" value={formData.paper_stock} onChange={e => setFormData({...formData, paper_stock: e.target.value})} className="w-full border p-2 rounded text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Flat Size</label>
                    <input placeholder="8.5 x 11" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ink / Colors</label>
                    <input placeholder="4/4, 4/0" value={formData.ink_colors} onChange={e => setFormData({...formData, ink_colors: e.target.value})} className="w-full border p-2 rounded text-sm" />
                </div>
              </div>
           </div>

           {/* Section 3: Notes */}
           <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-gray-500 border-b pb-1">Production Notes</h3>
              <textarea 
                className="w-full border p-2 rounded text-sm h-24" 
                placeholder="Special finishing instructions..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
           </div>

           {/* Section 4: File Placeholder */}
           <div className="bg-blue-50 p-4 rounded border border-blue-100 text-center">
              <p className="text-xs font-bold text-blue-800 mb-2">Item Artwork</p>
              <button className="text-[10px] bg-white border border-blue-300 px-3 py-1 rounded hover:bg-blue-100">
                 + Upload Art for this Item
              </button>
              <p className="text-[10px] text-blue-400 mt-2 italic">Feature coming in next update</p>
           </div>

           <div className="pt-4 border-t">
              <button onClick={handleSave} className="w-full bg-black text-white py-3 rounded font-bold hover:bg-gray-800">
                Save Changes
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENT: PRODUCTION ITEMS TABLE ---
function JobItemsTable({ items, onAddItem, onUpdateItem }: { items: any[], onAddItem: (item: any) => void, onUpdateItem: (id: string, data: any) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // Track which item is open

  return (
    <>
      {/* DRAWER (Shows if editingItem is not null) */}
      {editingItem && (
        <ItemDetailDrawer 
          item={editingItem} 
          onClose={() => setEditingItem(null)} 
          onUpdate={onUpdateItem}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
            <Layers size={14} /> Production Line Items
          </h3>
          <div className="flex items-center gap-2">
             <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded text-gray-600">{items.length} Items</span>
             <button onClick={() => setIsAdding(true)} className="flex items-center gap-1 text-[10px] bg-black text-white px-2 py-1 rounded font-bold hover:bg-gray-800 transition-colors">
               <Plus size={12} /> Add Item
             </button>
          </div>
        </div>
        
        {isAdding && (
          <AddItemForm 
            onAdd={(item) => { onAddItem(item); setIsAdding(false); }} 
            onCancel={() => setIsAdding(false)} 
          />
        )}

        {items.length === 0 && !isAdding ? (
           <div className="p-8 text-center text-gray-400 text-xs italic">
              No items yet. Click "Add Item" to start building this job.
           </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-xs text-gray-500 font-bold uppercase border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 w-10">#</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 w-24 text-right">Qty</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Steps</th>
                <th className="px-4 py-2 w-24">Status</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, index) => (
                <tr key={item.id} onClick={() => setEditingItem(item)} className="hover:bg-blue-50 transition-colors cursor-pointer group">
                  <td className="px-4 py-3 font-mono text-gray-400">{index + 1}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {item.description}
                    <div className="md:hidden text-[10px] text-gray-400 font-normal mt-0.5">
                      {item.size} {item.ink_colors}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {item.quantity?.toLocaleString() || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div>{item.paper_stock || '-'}</div>
                    {(item.size || item.ink_colors) && (
                       <div className="text-[10px] text-gray-400 mt-0.5">{item.size} • {item.ink_colors}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.job_item_steps?.map((step: any) => (
                        <span key={step.id} className="text-[10px] px-1.5 py-0.5 border rounded uppercase font-bold bg-gray-100 text-gray-500 border-gray-200">
                          {step.step_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                       item.status === 'Completed' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                     }`}>
                       {item.status || 'Pending'}
                     </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                      <Settings size={14} className="text-gray-300 group-hover:text-black transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </>
  );
}

// --- MAIN COMPONENT ---
interface JobViewProps {
  user: any;
  initialJob: any;
  initialItems: any[]; 
  serviceList: any[];
  initialAssets: any[];
  initialMessages: any[];
  initialLogs: any[];
  jobId: string;
}

export default function JobInteractiveView({ 
  user, 
  initialJob, 
  initialItems, 
  serviceList, 
  initialAssets, 
  initialMessages, 
  initialLogs, 
  jobId 
}: JobViewProps) {

  // --- STATE ---
  const [job, setJob] = useState(initialJob);
  const [items, setItems] = useState(initialItems || []);
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

  // Client-side Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const channel = supabase.channel('job_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` }, 
        () => refreshMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_assets', filter: `job_id=eq.${jobId}` }, 
        () => refreshAssets())
      .subscribe();

    if (assets.length > 0) {
        const approved = assets.find((a: any) => a.status === 'approved');
        const latestProof = assets.find((a: any) => a.asset_type === 'proof' && a.status !== 'archived');
        loadPreview(approved || latestProof || assets[0]);
    }

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  // --- REFRESHERS ---
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
  };

  const handleAddItem = async (newItem: any) => {
    // 1. Optimistic Update (Show it immediately)
    const tempId = Math.random().toString();
    const optimisticItem = { ...newItem, id: tempId, status: 'Pending', job_id: jobId };
    setItems([...items, optimisticItem]);

    // 2. Save to Database
    const { data, error } = await supabase.from('job_items').insert({
      job_id: jobId,
      description: newItem.description,
      quantity: newItem.quantity,
      paper_stock: newItem.paper_stock,
      status: 'Pending'
    }).select().single();

    if (error) {
      alert("Error adding item: " + error.message);
      setItems(items); // Revert on fail
    } else {
      // Replace temp item with real DB item
      setItems(current => current.map(i => i.id === tempId ? data : i));
      logActivity('Item Added', `Added production item: ${newItem.description}`);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: any) => {
    // Optimistic Update
    setItems(items.map(i => i.id === itemId ? { ...i, ...updates } : i));

    // DB Update
    const { error } = await supabase.from('job_items').update(updates).eq('id', itemId);
    
    if (error) {
      alert("Error saving item");
      // Just reload page if error to keep it simple
    } else {
      logActivity('Item Updated', `Updated specs for ${updates.description || 'an item'}`);
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
      if (!uploadFile || !user) return;
      setIsUploading(true);

      const fileName = `${jobId}-proof-${Math.random().toString(36).substring(7)}.${uploadFile.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage.from('uploads').upload(fileName, uploadFile);
      if (error) {
          alert("Upload failed: " + error.message);
          setIsUploading(false);
          return;
      }

      // Archive Old Proofs
      await supabase.from('job_assets')
          .update({ status: 'archived' })
          .eq('job_id', jobId)
          .eq('asset_type', 'proof')
          .eq('status', 'pending');

      // Insert New
      const { data: newAsset } = await supabase.from('job_assets').insert({
          job_id: jobId,
          uploader_id: user.id,
          file_url: data?.path,
          file_name: uploadFile.name,
          asset_type: 'proof',
          status: 'pending'
      }).select().single();

      // Email & Log
      await sendProofNotification(jobId, data?.path || '', uploadMessage);
      await logActivity('Proof Uploaded', `New version sent. Note: ${uploadMessage || 'None'}`);

      if (newAsset) {
          await refreshAssets();
          loadPreview(newAsset); 
      }
      
      setIsUploading(false);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadMessage('');
      alert("Proof sent successfully!");
  };

  const handleApproveProof = async (assetId: string) => {
      if (!confirm("Mark this file as APPROVED for production?")) return;
      await supabase.from('job_assets').update({ status: 'approved' }).eq('id', assetId);
      await supabase.from('jobs').update({ status: 'In Production' }).eq('id', jobId);
      await logActivity('Proof Approved', 'Moved job to Production status.');
      refreshAssets();
      alert("Job moved to Production!");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage(''); 
    await supabase.from('messages').insert({ job_id: jobId, user_id: user.id, content: msg });
  };

  const handleSaveNotes = async () => {
      setIsSaving(true);
      await supabase.from('jobs').update({ internal_notes: internalNotes }).eq('id', jobId);
      await logActivity('Notes Updated', 'Updated internal production notes.');
      setIsSaving(false);
      alert('Notes saved.');
  };

  const toggleFinishingOption = async (optionName: string) => {
      const currentOptions = job.finishing_options || [];
      const newOptions = currentOptions.includes(optionName) 
        ? currentOptions.filter((o: string) => o !== optionName) 
        : [...currentOptions, optionName];
      
      setJob({ ...job, finishing_options: newOptions });
      await supabase.from('jobs').update({ finishing_options: newOptions }).eq('id', jobId);
      
      const action = currentOptions.includes(optionName) ? 'Removed' : 'Added';
      await logActivity('Finishing Updated', `${action} service: ${optionName}`);
  };

  // --- RENDER HELPERS ---
  const getCountdown = () => {
      if (!job?.due_date) return { text: "NO DATE", color: "bg-gray-800", textCol: "text-gray-500" };
      const due = new Date(job.due_date);
      const now = new Date();
      due.setHours(23, 59, 59, 999);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { text: `${Math.abs(diffDays)} DAYS LATE`, color: "bg-red-600", textCol: "text-white" };
      if (diffDays === 0) return { text: "DUE TODAY", color: "bg-orange-500", textCol: "text-white" };
      return { text: `${diffDays} DAYS LEFT`, color: "bg-emerald-500", textCol: "text-white" };
  };

  const countdown = getCountdown();
  const statusColor = 'bg-gray-900'; 
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  const originalAsset = assets.find(a => a.asset_type === 'source');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      
      {/* --- UPLOAD MODAL --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">Send New Proof</h3>
                    <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <UploadCloud className={`mx-auto h-10 w-10 mb-2 ${uploadFile ? 'text-green-600' : 'text-gray-400'}`} />
                        {uploadFile ? (
                            <p className="font-bold text-green-700 text-sm truncate">{uploadFile.name}</p>
                        ) : (
                            <p className="text-sm font-bold text-gray-600">Click to Select File</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Message to Customer</label>
                        <textarea 
                            value={uploadMessage}
                            onChange={(e) => setUploadMessage(e.target.value)}
                            placeholder="e.g. Please check the spelling on the back..."
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-black h-24 resize-none"
                        />
                    </div>
                    <button 
                        onClick={handleSubmitProof} 
                        disabled={!uploadFile || isUploading}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!uploadFile || isUploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800 shadow-lg'}`}
                    >
                        {isUploading ? 'Sending...' : 'Send Proof'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 1. HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={20} /></Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">{job.title}</h1>
                <p className="text-xs font-mono text-gray-400 mt-1">#{jobId.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
              </div>
          </div>
          <div className="flex gap-2">
              <div className={`px-4 py-1 rounded-md text-white font-bold uppercase text-xs flex items-center ${statusColor}`}>
                 {job.status || 'Pending'}
              </div>
          </div>
        </div>
      </div>

       {/* 2. THE STAGE COMMANDER */}
       <div className={`${statusColor} text-white shadow-xl`}>
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row">
              <div className="p-8 flex-1">
                  <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-2">Current Department</p>
                  <h1 className="text-6xl font-black uppercase tracking-tight leading-none">
                      {job.status || 'PREPRESS'}
                  </h1>
              </div>
              <div className="p-8 md:w-1/3 bg-black/20 border-l border-white/10 backdrop-blur-sm flex flex-col justify-center">
                  <div className="flex items-start gap-3">
                      <Megaphone size={24} className="mt-1 opacity-80" />
                      <div>
                          <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-1">Important Note</p>
                          <p className="text-lg font-bold leading-tight">
                              {job.notes || "No general notes on this order."}
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. MAIN LAYOUT (3 Column Grid) */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-4 grid grid-cols-12 gap-4">
        
        {/* LEFT COL: SPECS & FINISHING (Width 3) */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
            
            {/* SPECS CARD */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2"><Layers size={14}/> Job Specs</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Customer</span>
                        <span className="font-bold">{job.profiles?.first_name || 'Guest'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Total Qty</span>
                        <span className="font-bold">{job.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                          <span className="text-gray-500">Due Date</span>
                          <div className={`text-[10px] px-2 py-0.5 rounded font-bold ${countdown.color} text-white`}>
                              {countdown.text}
                          </div>
                    </div>
                </div>
            </div>

            {/* FINISHING CHECKLIST */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2"><Scissors size={14}/> Finishing</h3>
                <div className="flex flex-wrap gap-2">
                    {serviceList.map((service) => {
                        const isSelected = job.finishing_options?.includes(service.name);
                        return (
                            <button key={service.id} onClick={() => toggleFinishingOption(service.name)} className={`px-3 py-1.5 rounded text-xs font-bold border transition-all flex items-center gap-2 ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                {isSelected && <CheckSquare size={12} />} {service.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* INTERNAL NOTES */}
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                <h3 className="text-xs font-bold uppercase text-yellow-700 mb-2 flex items-center gap-2"><Lock size={14}/> Internal Notes</h3>
                <textarea 
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private production notes..."
                    className="w-full h-24 bg-white border border-yellow-300 rounded p-2 text-sm focus:outline-none mb-2"
                />
                <button onClick={handleSaveNotes} disabled={isSaving} className="w-full bg-yellow-400 text-yellow-900 text-xs font-bold py-1.5 rounded hover:bg-yellow-500 flex items-center justify-center gap-2">
                    <Save size={12}/> Save Notes
                </button>
            </div>

             {/* ORIGINAL FILE (REFERENCE) */}
             <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
                <h3 className="text-xs font-bold uppercase text-blue-800 mb-2 flex items-center gap-2"><FileText size={14}/> Original Asset</h3>
                {originalAsset ? (
                    <div onClick={() => loadPreview(originalAsset)} className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200 cursor-pointer hover:border-blue-400 transition-all">
                        <div className="bg-blue-100 p-2 rounded text-blue-600"><FileImage size={20}/></div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-900 truncate w-32">{originalAsset.file_name}</p>
                            <p className="text-[10px] text-gray-500">Click to view</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-blue-400 italic">No source file found.</p>
                )}
            </div>
        </div>

        {/* MIDDLE COL: MAIN PROOF STAGE (Width 6) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
             
             {/* --- PRODUCTION ITEMS TABLE (WITH ADD BUTTON & DRAWER) --- */}
             <JobItemsTable items={items} onAddItem={handleAddItem} onUpdateItem={handleUpdateItem} />

             {/* PREVIEW/PROOF VIEWER */}
             <div className={`bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden min-h-[500px] relative ${isApprovedAsset ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}>
                
                {/* PREVIEW HEADER */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {isApprovedAsset ? (
                            <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={12}/> PRODUCTION FILE</span>
                        ) : (
                            <span className="text-xs font-bold uppercase text-gray-500">Preview Mode</span>
                        )}
                        <span className="text-xs text-gray-400">| {currentAsset?.file_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {currentAsset?.asset_type === 'proof' && currentAsset.status === 'pending' && (
                             <button onClick={() => handleApproveProof(currentAsset.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500 shadow-sm flex items-center gap-1">
                                 <ThumbsUp size={12}/> Approve
                             </button>
                        )}
                        {previewUrl && (
                            <a href={previewUrl} target="_blank" className="text-xs font-bold text-gray-600 hover:text-black border border-gray-300 px-2 py-1 rounded bg-white">
                                <Download size={12}/>
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex-1 bg-gray-100 flex items-center justify-center p-6 relative">
                    {!previewUrl ? (
                        <div className="text-gray-400 text-sm">Select a file to preview</div>
                    ) : previewType === 'image' ? (
                        <img src={previewUrl} className="max-w-full max-h-[70vh] shadow-lg border border-gray-300 bg-white" />
                    ) : (
                        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full shadow-lg bg-white" />
                    )}
                </div>
             </div>
        </div>

        {/* RIGHT COL: FILE VAULT & CHAT/HISTORY (Width 3) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-[calc(100vh-100px)]">
            
            {/* FILE VAULT */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-1/3">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                     <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><History size={14}/> File Vault</h3>
                     <button onClick={() => setShowUploadModal(true)} className="text-[10px] bg-black text-white px-2 py-1 rounded font-bold hover:bg-gray-800">+ New Proof</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {assets.map((asset) => {
                        const isCurrent = viewingAssetId === asset.id;
                        return (
                        <div key={asset.id} onClick={() => loadPreview(asset)} className={`p-2 rounded border cursor-pointer transition-all flex flex-col gap-2 group ${isCurrent ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                {asset.asset_type === 'source' ? <FileText size={16} className="text-gray-400"/> : <FileImage size={16} className="text-purple-500"/>}
                                <div>
                                    <p className="text-xs font-bold text-gray-700 truncate w-32">{asset.file_name}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                {asset.status === 'approved' ? (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10}/> APPROVED</span>
                                ) : asset.status === 'archived' ? (
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded flex items-center gap-1"><XCircle size={10}/> ARCHIVED</span>
                                ) : asset.status === 'pending' && asset.asset_type === 'proof' ? (
                                    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded animate-pulse">PENDING APPROVAL</span>
                                ) : (<span></span>)}
                                {isCurrent && <Eye size={14} className="text-blue-400"/>}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            {/* TABBED WIDGET: CHAT & HISTORY */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-2/3 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setRightTab('chat')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'chat' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}
                    >
                        <MessageSquare size={14}/> Discussion
                    </button>
                    <button 
                        onClick={() => setRightTab('activity')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'activity' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}
                    >
                        <Activity size={14}/> Activity Log
                    </button>
                </div>
                
                {/* TAB CONTENT */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
                    {/* CHAT VIEW */}
                    {rightTab === 'chat' && (
                        <>
                            {messages.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No messages yet.</div>}
                            {messages.map((msg) => {
                                const isMe = msg.user_id === user?.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${isMe ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.content}</div>
                                        <span className="text-[9px] text-gray-400 mt-0.5">{msg.profiles?.first_name}</span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}

                    {/* ACTIVITY LOG VIEW */}
                    {rightTab === 'activity' && (
                        <>
                            {logs.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No activity recorded yet.</div>}
                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-3 text-xs pb-3 border-b border-gray-50 last:border-0">
                                    <div className="mt-0.5 min-w-[30px] text-gray-400 font-mono text-[9px]">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                    <div>
                                        <p className="font-bold text-gray-900">{log.action}</p>
                                        <p className="text-gray-500">{log.details}</p>
                                        <p className="text-[9px] text-blue-400 mt-0.5">{log.profiles?.first_name || 'System'}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </>
                    )}
                </div>

                {/* INPUT AREA (Only for Chat) */}
                {rightTab === 'chat' && (
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <div className="flex gap-2">
                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 rounded border border-gray-200 text-xs focus:outline-none focus:border-black" placeholder="Type here..." />
                            <button onClick={handleSendMessage} className="bg-black text-white p-2 rounded hover:bg-gray-800"><Send size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
