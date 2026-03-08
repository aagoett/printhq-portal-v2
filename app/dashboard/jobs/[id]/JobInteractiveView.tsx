'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, Scissors, CheckSquare, Megaphone,
  History, Eye, FileImage, ThumbsUp, XCircle, CheckCircle,
  Activity, Save, Lock, X, UploadCloud, MessageSquare, Layers, Plus, Settings, Paperclip, Trash2, ListTodo, Globe, ChevronDown, ArrowUp, ArrowDown, ExternalLink, FilePlus
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

import ItemDetailDrawer from '@/components/ItemDetailDrawer';


// --- HELPER COMPONENT: PRODUCTION ITEMS TABLE ---
function JobItemsTable({
  items,
  assets,
  workflowOptions,
  onAddItem,
  onUpdateItem,
  onItemUpload,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onMoveStep,
  onReorderSteps,
  onOpenProofModal,
  onPreviewItem,
  onUpdateStepNote,
  onLogActivity,
  logs,
  userRole
}: {
  items: any[],
  assets: any[],
  workflowOptions: any[],
  onAddItem: (item: any) => void,
  onUpdateItem: (id: string, data: any) => void,
  onItemUpload: (file: File, itemId: string) => Promise<void>,
  onAddStep: (itemId: string, stepName: string, isInternal: boolean) => void,
  onToggleStep: (stepId: string, currentStatus: string) => void,
  onDeleteStep: (stepId: string) => void,
  onMoveStep: (stepId: string, direction: 'up' | 'down') => void,
  onReorderSteps: (itemId: string, newSteps: any[]) => void,
  onOpenProofModal: (itemId?: string) => void,
  onPreviewItem: (itemId: string) => void,
  onUpdateStepNote: (stepId: string, note: string) => Promise<void>,
  onLogActivity: (action: string, details: string, itemId?: string) => Promise<void>,
  logs: any[],
  userRole: string
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const editingItem = items.find(i => i.id === editingItemId);

  return (
    <>
      {/* DRAWER */}
      {editingItem && (
        <ItemDetailDrawer 
          item={editingItem} 
          assets={assets}
          workflowOptions={workflowOptions}
          onClose={() => setEditingItemId(null)} 
          onUpdate={onUpdateItem}
          onUpload={onItemUpload}
          onAddStep={onAddStep}
          onToggleStep={onToggleStep}
          onDeleteStep={onDeleteStep}
          onMoveStep={onMoveStep}
          onReorderSteps={onReorderSteps}
          onOpenProofModal={onOpenProofModal}
          onUpdateStepNote={onUpdateStepNote}
          onLogActivity={onLogActivity}
          logs={logs}
          userRole={userRole}
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
            <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 w-12">#</th>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4 w-32 text-right">Production Qty</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, index) => {
                 const hasFiles = assets.some(a => a.job_item_id === item.id);
                 const steps = item.job_item_steps || [];
                 return (
                <tr key={item.id} onClick={() => { setEditingItemId(item.id); onPreviewItem(item.id); }} className="hover:bg-blue-50/50 transition-all cursor-pointer group">
                  <td className="px-6 py-6 align-top">
                     <span className="text-xl font-black text-gray-100 group-hover:text-blue-200 transition-colors font-mono">{String(index + 1).padStart(2, '0')}</span>
                  </td>
                  <td className="px-6 py-6 align-top">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        {item.size && <span className="text-[10px] font-black text-blue-600 ml-0.5 uppercase tracking-[0.15em] mb-1">{item.size}</span>}
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase">{item.description}</h4>
                          {hasFiles && <Paperclip size={14} className="text-blue-500" />}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                         <span className="flex items-center gap-1.5"><Layers size={12}/> {item.paper_stock || 'TBD STOCK'}</span>
                         <span className="flex items-center gap-1.5"> {item.ink_colors || 'CMYK'}</span>
                      </div>

                      {/* PRIMARY PERSISTENT NOTE */}
                      {item.internal_notes && (
                        <div className="text-[11px] bg-yellow-400/10 text-yellow-800 p-3 rounded-lg border border-yellow-200 flex items-start gap-2 font-black leading-relaxed max-w-xl shadow-inner uppercase tracking-tight">
                          <Lock size={14} className="mt-0.5 flex-shrink-0 text-yellow-600"/> 
                          <div>
                            <span className="block text-[9px] opacity-70 mb-1 tracking-widest">Main Production Note:</span>
                            {item.internal_notes}
                          </div>
                        </div>
                      )}

                      {/* MULTIPLE LOGGED NOTES / ACTIVITY */}
                      {(() => {
                        const itemLogs = logs
                          .filter(l => l.job_item_id === item.id || (l.details && l.details.includes(`ITEM:${item.id}`)))
                          .filter(l => l.action === 'Item Update' || l.action === 'Item Added');
                        
                        if (itemLogs.length === 0) return null;

                        return (
                          <div className="flex flex-col gap-2 max-w-xl">
                            {itemLogs.map((log) => (
                              <div key={log.id} className="text-[10px] bg-blue-50/50 text-blue-900 px-3 py-2 rounded-lg border border-blue-100 flex items-start gap-2 font-medium">
                                <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-blue-400"/>
                                <div>
                                  <span className="text-[8px] font-black opacity-50 block uppercase mb-0.5">{new Date(log.created_at).toLocaleDateString()}</span>
                                  {log.details}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                       {steps.map((step: any) => (
                         <span key={step.id} className={`text-[10px] px-2 py-0.5 border rounded-md uppercase font-black tracking-widest ${
                            step.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200 shadow-sm' : 'bg-white text-gray-400 border-gray-200'
                         }`}>
                            {step.status === 'Completed' ? '✓ ' : ''}{step.step_name}
                         </span>
                       ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right align-top">
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-gray-900 font-mono tracking-tighter">
                        {item.quantity?.toLocaleString() || '0'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">TOTAL PIECES</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 align-top">
                      <select 
                        value={item.status || 'Pending'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateItem(item.id, { status: e.target.value })}
                        className={`text-[11px] font-black px-3 py-1.5 rounded-lg border-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-black/5 uppercase tracking-widest transition-all
                        ${item.status === 'Completed' ? 'bg-green-600 text-white border-green-700' 
                          : item.status === 'Pending' ? 'bg-gray-100 text-gray-500 border-gray-200'
                          : 'bg-blue-600 text-white border-blue-700'}
                        `}
                      >
                         <option value="Pending">Pending</option>
                         {/* DYNAMIC STEPS AS STATUS OPTIONS */}
                         {steps.map((s: any) => (
                            <option key={s.id} value={s.step_name}>{s.step_name}</option>
                         ))}
                         <option value="Completed">Completed</option>
                         <option value="Cancelled">Cancelled</option>
                      </select>
                   </td>
                  <td className="px-6 py-6 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                         {(() => {
                            const itemAssets = assets.filter(a => a.job_item_id === item.id);
                            const hasProof = itemAssets.some(a => a.asset_type === 'proof');
                            const isApproved = itemAssets.some(a => a.asset_type === 'proof' && a.status === 'approved');
                            
                            return (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onOpenProofModal(item.id); }}
                                className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg font-black transition-all shadow-sm uppercase tracking-widest border-2
                                  ${isApproved ? 'bg-green-100 text-green-700 border-green-200' : 
                                    hasProof ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                    'bg-purple-600 text-white border-purple-700 hover:bg-purple-700 shadow-purple-100'}
                                `}
                              >
                                {isApproved ? <CheckCircle size={12}/> : <Plus size={12} />}
                                {isApproved ? 'Approved' : hasProof ? 'Sent / Send Another' : 'Proof'}
                              </button>
                            );
                         })()}
                         <div className="p-2 hover:bg-gray-100 rounded-full transition-colors inline-block">
                           <Settings size={18} className="text-gray-300 group-hover:text-black transition-colors" />
                         </div>
                      </div>
                  </td>
                </tr>
              )})}
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
  const [userRole, setUserRole] = useState('customer');
  
  // NEW: State for Dynamic Settings
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([]);

  // UI State
  const [rightTab, setRightTab] = useState<'chat' | 'activity'>('chat');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [proofItemId, setProofItemId] = useState<string | undefined>();
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
    
    // NEW: Fetch Workflow Settings on Load
    fetchWorkflowQueues();
    fetchUserRole();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  const fetchUserRole = async () => {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role) setUserRole(data.role);
  };

  const fetchWorkflowQueues = async () => {
    const { data } = await supabase.from('workflow_queues').select('*').order('rank', { ascending: true });
    if (data) setWorkflowOptions(data);
  };

  const refreshMessages = async () => {
    const { data } = await supabase.from('messages').select('*, profiles(email)').eq('job_id', jobId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const refreshAssets = async () => {
    const { data } = await supabase.from('job_assets').select('*, profiles(email)').eq('job_id', jobId).order('created_at', { ascending: false });
    if (data) setAssets(data);
  };

  const refreshLogs = async () => {
    const { data } = await supabase.from('job_logs').select('*, profiles(email)').eq('job_id', jobId).order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const logActivity = async (action: string, details: string, itemId?: string) => {
      await supabase.from('job_logs').insert({ 
        job_id: jobId, 
        user_id: user.id, 
        action, 
        details,
        job_item_id: itemId || null 
      });
      await Promise.all([refreshLogs(), refreshMessages()]);
  };

  // --- ITEM CRUD OPERATIONS ---
  const handleAddItem = async (newItem: any) => {
    const tempId = Math.random().toString();
    const optimisticItem = { ...newItem, id: tempId, status: 'Pending', job_id: jobId, job_item_steps: [] };
    setItems([...items, optimisticItem]);

    const { data, error } = await supabase.from('job_items').insert({
      job_id: jobId,
      description: newItem.description,
      quantity: newItem.quantity,
      paper_stock: newItem.paper_stock,
      status: 'Pending'
    }).select().single();

    if (error) {
      alert("Error adding item: " + error.message);
      setItems(items);
    } else {
      setItems(current => current.map(i => i.id === tempId ? { ...data, job_item_steps: [] } : i));
      logActivity('Item Added', `Added production item: ${newItem.description}`, data.id);
    }
  };

  const handleUpdateItem = async (id: string, updates: any) => {
    setItems(current => current.map(i => i.id === id ? { ...i, ...updates } : i));
    const { error } = await supabase.from('job_items').update(updates).eq('id', id);
    if (error) alert("Error saving item: " + error.message);
  };

  const handleUpdateJob = async (id: string, updates: any) => {
      setJob({ ...job, ...updates });
      await supabase.from('jobs').update(updates).eq('id', id);
  };

  const handleItemUpload = async (file: File, itemId: string) => {
      const storageName = `${jobId}-item-${itemId.substring(0,4)}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('uploads').upload(storageName, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('job_assets').insert({
          job_id: jobId, job_item_id: itemId, uploader_id: user.id, file_url: uploadData.path,
          file_name: file.name, asset_type: 'source', status: 'pending'
      });
      if (dbError) throw dbError;

      await refreshAssets();
      await logActivity('Asset Linked', `Uploaded ${file.name} to item.`, itemId);
  };

  // --- ITEM STATUS SYNCING (PHASE 3.10) ---
  const syncItemStatus = async (itemId: string, currentSteps: any[]) => {
    // Find first non-completed step
    const firstActive = currentSteps.find((s: any) => s.status !== 'Completed');
    let newStatus = 'Pending';
    
    if (firstActive) {
      newStatus = firstActive.step_name;
    } else if (currentSteps.length > 0 && currentSteps.every((s: any) => s.status === 'Completed')) {
      // If all steps are completed, then the item is completed
      newStatus = 'Completed';
    }

    setItems(current => current.map(item => {
      if (item.id === itemId) return { ...item, status: newStatus };
      return item;
    }));

    await supabase.from('job_items').update({ status: newStatus }).eq('id', itemId);
  };

  // --- STEP OPERATIONS (UPDATED FOR INTERNAL/EXTERNAL) ---
  const handleAddStep = async (itemId: string, stepName: string, isInternal: boolean) => {
    const tempId = Math.random().toString();
    const newStep = { id: tempId, job_item_id: itemId, step_name: stepName, status: 'Pending', is_internal: isInternal };
    
    // Optimistic Update
    setItems(current => current.map(i => {
      if (i.id === itemId) {
        return { ...i, job_item_steps: [...(i.job_item_steps || []), newStep] };
      }
      return i;
    }));

    const { data, error } = await supabase.from('job_item_steps').insert({
      job_item_id: itemId,
      step_name: stepName,
      status: 'Pending',
      is_internal: isInternal
    }).select().single();

    if (error) {
       alert('Error adding step: ' + error.message);
    } else {
       // Replace temp ID with real ID
       setItems(current => current.map(i => {
        if (i.id === itemId) {
           return { ...i, job_item_steps: i.job_item_steps.map((s: any) => s.id === tempId ? data : s) };
        }
        return i;
       }));
       // After adding, sync the parent item status
       const item = items.find(i => i.id === itemId);
       if (item) {
         const updatedSteps = [...(item.job_item_steps || []), data];
         await syncItemStatus(item.id, updatedSteps);
       }
    }
  };

  const handleToggleStep = async (stepId: string, currentStatus: string) => {
    const statusOptions = ['Pending', 'In Production', 'To Bindery', 'In Bindery', 'Bindery Complete', 'Completed', 'Cancelled'];
    const currentIndex = statusOptions.indexOf(currentStatus);
    const newStatus = currentIndex === statusOptions.length - 1 ? statusOptions[0] : statusOptions[currentIndex + 1];

    setItems(current => current.map(i => ({
      ...i,
      job_item_steps: i.job_item_steps?.map((s: any) => s.id === stepId ? { ...s, status: newStatus } : s)
    })));

    await supabase.from('job_item_steps').update({ status: newStatus }).eq('id', stepId);

    // After toggle, sync the parent item status
    const item = items.find(i => i.job_item_steps?.some((s: any) => s.id === stepId));
    if (item) {
      const updatedSteps = item.job_item_steps.map((s: any) => s.id === stepId ? { ...s, status: newStatus } : s);
      await syncItemStatus(item.id, updatedSteps);
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    setItems(current => current.map(item => {
      if (!item.job_item_steps) return item;
      const index = item.job_item_steps.findIndex((s: any) => s.id === stepId);
      if (index === -1) return item;
      
      const newSteps = [...item.job_item_steps];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex >= 0 && targetIndex < newSteps.length) {
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        const syncedItem = { ...item, job_item_steps: newSteps };
        syncItemStatus(item.id, newSteps); // Fire and forget sync
        return syncedItem;
      }
      return item;
    }));
  };

  const handleReorderSteps = async (itemId: string, newSteps: any[]) => {
    setItems(current => current.map(item => {
      if (item.id === itemId) return { ...item, job_item_steps: newSteps };
      return item;
    }));
    await syncItemStatus(itemId, newSteps);
    // Note: To persist this properly across sessions, we would need to update 'created_at' or a 'sort_order' column for EACH step.
  };

  const handleDeleteStep = async (stepId: string) => {
    setItems(current => current.map(i => ({
      ...i,
      job_item_steps: i.job_item_steps?.filter((s: any) => s.id !== stepId)
    })));

    await supabase.from('job_item_steps').delete().eq('id', stepId);
    
    const item = items.find(i => i.job_item_steps?.some((s: any) => s.id === stepId));
    if (item) {
      const remainingSteps = item.job_item_steps.filter((s: any) => s.id !== stepId);
      await syncItemStatus(item.id, remainingSteps);
    }
  };

  // --- GENERAL APP LOGIC ---
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

  // Load best asset for a line item into the preview panel:
  // priority: approved proof > pending proof > any source file
  const handlePreviewItem = (itemId: string) => {
      const itemAssets = assets.filter((a: any) => a.job_item_id === itemId);
      const best =
          itemAssets.find((a: any) => a.asset_type === 'proof' && a.status === 'approved') ||
          itemAssets.find((a: any) => a.asset_type === 'proof' && a.status !== 'archived') ||
          itemAssets.find((a: any) => a.asset_type === 'source') ||
          itemAssets[0];
      if (best) loadPreview(best);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
      if (!uploadFile || !user) return;
      setIsUploading(true);
      const fileName = `${jobId}-proof-${Math.random().toString(36).substring(7)}${proofItemId ? `-item-${proofItemId.substring(0,4)}` : ''}.${uploadFile.name.split('.').pop()}`;
      const { data, error } = await supabase.storage.from('uploads').upload(fileName, uploadFile);
      if (error) { alert(error.message); setIsUploading(false); return; }

      // Archive previous proofs for this SPECIFIC item OR global
      const updateQuery = supabase.from('job_assets')
        .update({ status: 'archived' })
        .eq('job_id', jobId)
        .eq('asset_type', 'proof')
        .eq('status', 'pending');
      
      if (proofItemId) {
          updateQuery.eq('job_item_id', proofItemId);
      } else {
          updateQuery.is('job_item_id', null);
      }
      await updateQuery;

      const { data: newAsset } = await supabase.from('job_assets').insert({
          job_id: jobId, 
          job_item_id: proofItemId || null,
          uploader_id: user.id, 
          file_url: data?.path, 
          file_name: uploadFile.name, 
          asset_type: 'proof', 
          status: 'pending'
      }).select().single();

      const itemDesc = proofItemId ? items.find(i => i.id === proofItemId)?.description : 'Main Job';
      await sendProofNotification(jobId, data?.path || '', `${uploadMessage} (Item: ${itemDesc})`);
      
      if (newAsset) { await refreshAssets(); loadPreview(newAsset); }
      setIsUploading(false); setShowUploadModal(false); setUploadFile(null); setUploadMessage(''); setProofItemId(undefined);
  };

  const handleApproveProof = async (assetId: string) => {
      if (!confirm("Mark APPROVED?")) return;
      await supabase.from('job_assets').update({ status: 'approved' }).eq('id', assetId);
      await supabase.from('jobs').update({ status: 'In Production' }).eq('id', jobId);
      refreshAssets();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = newMessage; setNewMessage(''); 
    await supabase.from('messages').insert({ job_id: jobId, user_id: user.id, content: msg });
  };

  const handleUpdateStepNote = async (stepId: string, note: string) => {
    const { error } = await supabase.from('job_item_steps').update({ notes: note }).eq('id', stepId);
    if (error) {
      console.error('Error updating step note:', error);
      alert('Failed to save step note');
    } else {
      setItems(current => current.map(i => ({
        ...i,
        job_item_steps: i.job_item_steps?.map((s: any) => s.id === stepId ? { ...s, notes: note } : s)
      })));
    }
  };

  const handleSaveNotes = async () => {
      if (!internalNotes.trim()) return;
      setIsSaving(true);
      
      // Save to database ('notes' column is what's displayed at top)
      const { error } = await supabase.from('jobs').update({ notes: internalNotes }).eq('id', jobId);
      if (error) {
        alert("Error saving notes: " + error.message);
      } else {
        setJob({ ...job, notes: internalNotes });
        await logActivity('Job Notes Updated', 'Production notes were updated.');
      }
      
      setIsSaving(false); 
  };

  const toggleFinishingOption = async (optionName: string) => {
      const currentOptions = job.finishing_options || [];
      const newOptions = currentOptions.includes(optionName) 
        ? currentOptions.filter((o: string) => o !== optionName) : [...currentOptions, optionName];
      setJob({ ...job, finishing_options: newOptions });
      await supabase.from('jobs').update({ finishing_options: newOptions }).eq('id', jobId);
  };

  const getCountdown = () => {
      if (!job?.due_date) return { text: "NO DATE", color: "bg-gray-800", textCol: "text-gray-500" };
      const due = new Date(job.due_date);
      due.setHours(23, 59, 59, 999);
      const diffDays = Math.ceil((due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { text: `${Math.abs(diffDays)} DAYS LATE`, color: "bg-red-600", textCol: "text-white" };
      if (diffDays === 0) return { text: "DUE TODAY", color: "bg-orange-500", textCol: "text-white" };
      return { text: `${diffDays} DAYS LEFT`, color: "bg-emerald-500", textCol: "text-white" };
  };

  const countdown = getCountdown();
  const currentAsset = assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  const originalAsset = assets.find(a => a.asset_type === 'source');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      
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
                        {uploadFile ? <p className="font-bold text-green-700 text-sm truncate">{uploadFile.name}</p> : <p className="text-sm font-bold text-gray-600">Click to Select File</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Message to Customer</label>
                        <textarea value={uploadMessage} onChange={(e) => setUploadMessage(e.target.value)} placeholder="e.g. Check spelling..." className="w-full border border-gray-300 rounded-lg p-3 text-sm h-20 resize-none"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Target Line Item (Optional)</label>
                        <select 
                            value={proofItemId || ''} 
                            onChange={(e) => setProofItemId(e.target.value || undefined)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                        >
                            <option value="">-- Apply to Entire Job --</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.description} ({i.size})</option>)}
                        </select>
                    </div>
                    <button onClick={handleSubmitProof} disabled={!uploadFile || isUploading} className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!uploadFile || isUploading ? 'bg-gray-300' : 'bg-black hover:bg-gray-800'}`}>
                        {isUploading ? 'Sending...' : 'Send Proof'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={20} /></Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">{job.title}</h1>
                <p className="text-xs font-mono text-gray-400 mt-1">#{jobId.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href={`/dashboard/invoices/new?jobId=${jobId}`} 
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-md font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <FilePlus size={14}/> Generate Invoice
            </Link>
            <div className={`px-4 py-1.5 rounded-md text-white font-bold uppercase text-[10px] flex items-center bg-gray-900 border border-gray-700`}>{job.status || 'Pending'}</div>
          </div>
        </div>
      </div>

       {/* STAGE COMMANDER */}
       <div className={`bg-gray-900 text-white shadow-xl`}>
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row">
              <div className="p-8 flex-1">
                  <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-2">Current Department</p>
                  <h1 className="text-6xl font-black uppercase tracking-tight leading-none">{job.status || 'PREPRESS'}</h1>
              </div>
              <div className="p-8 md:w-1/3 bg-black/20 border-l border-white/10 backdrop-blur-sm flex flex-col justify-center">
                  <div className="flex items-start gap-3">
                      <Megaphone size={24} className="mt-1 opacity-80" />
                      <div>
                          <p className="text-xs font-bold uppercase opacity-75 tracking-widest mb-1">Important Note</p>
                          <p className="text-lg font-bold leading-tight">{job.notes || "No general notes on this order."}</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-4 grid grid-cols-12 gap-4">
             {/* LEFT COL: ASSETS & INFO */}
        <div className="col-span-12 lg:col-span-2 space-y-4">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest flex items-center gap-2"><Layers size={14}/> SUMMARY</h3>
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Customer</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{job.profiles?.email?.split('@')[0] || 'Guest'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Timeline</p>
                        <div className="mt-1 flex flex-col gap-1.5">
                            <div className={`text-[10px] px-2 py-1 rounded font-bold inline-block w-max ${countdown.color} text-white`}>{countdown.text}</div>
                            <input 
                              type="date" 
                              value={job.due_date ? job.due_date.substring(0, 10) : ''} 
                              onChange={(e) => handleUpdateJob(job.id, { due_date: e.target.value })}
                              className="text-[10px] font-bold border rounded p-1 w-full bg-white focus:outline-none focus:border-black"
                            />
                        </div>
                    </div>
                </div>
            </div>

             <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                <h3 className="text-[10px] font-bold uppercase text-blue-800 mb-2 flex items-center gap-2 tracking-widest"><FileText size={14}/> SOURCE</h3>
                {originalAsset ? (
                    <div onClick={() => loadPreview(originalAsset)} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-200 cursor-pointer hover:border-blue-400 transition-all shadow-sm">
                        <div className="bg-blue-100 p-2 rounded text-blue-600"><FileImage size={20}/></div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-bold text-gray-900 truncate w-32">{originalAsset.file_name}</p>
                            <p className="text-[9px] text-blue-400 font-bold uppercase">View File</p>
                        </div>
                    </div>
                ) : <p className="text-[10px] text-blue-400 italic">No source file.</p>}
            </div>
        </div>

        {/* MIDDLE COL: MAIN PRODUCTION HUB */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
             <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold uppercase text-yellow-700 flex items-center gap-2"><Lock size={16}/> Global Job Notes</h3>
                    <button onClick={handleSaveNotes} disabled={isSaving} className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1.5 rounded hover:bg-yellow-500 flex items-center gap-2 shadow-sm uppercase tracking-wider"><Save size={12}/> Save Global Notes</button>
                </div>
                <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Private production notes for the whole job..." className="w-full h-24 bg-white border border-yellow-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"/>
             </div>

             <JobItemsTable 
               items={items} 
               assets={assets}
               workflowOptions={workflowOptions}
               onAddItem={handleAddItem} onUpdateItem={handleUpdateItem} onItemUpload={handleItemUpload}
               onAddStep={handleAddStep}
            onToggleStep={handleToggleStep}
            onDeleteStep={handleDeleteStep}
            onMoveStep={handleMoveStep}
            onReorderSteps={handleReorderSteps}
            onOpenProofModal={(itemId) => { setProofItemId(itemId); setShowUploadModal(true); }}
            onPreviewItem={handlePreviewItem}
            onUpdateStepNote={handleUpdateStepNote}
            onLogActivity={logActivity}
            logs={logs}
            userRole={userRole}
          />

             <div className={`bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden min-h-[500px] relative ${isApprovedAsset ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isApprovedAsset ? <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={12}/> PRODUCTION FILE</span> : <span className="text-xs font-bold uppercase text-gray-500">Preview Mode</span>}
                        {currentAsset?.job_item_id && (() => {
                            const linkedItem = items.find((i: any) => i.id === currentAsset.job_item_id);
                            return linkedItem ? (
                                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-widest">
                                    {linkedItem.description}
                                </span>
                            ) : null;
                        })()}
                        <span className="text-xs text-gray-400">| {currentAsset?.file_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentAsset?.asset_type === 'proof' && currentAsset.status === 'pending' && <button onClick={() => handleApproveProof(currentAsset.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500 shadow-sm flex items-center gap-1"><ThumbsUp size={12}/> Approve</button>}
                        {previewUrl && <a href={previewUrl} target="_blank" className="text-xs font-bold text-gray-600 hover:text-black border border-gray-300 px-2 py-1 rounded bg-white"><Download size={12}/></a>}
                    </div>
                </div>
                <div className="flex-1 bg-gray-100 flex items-center justify-center p-6 relative">
                    {!previewUrl ? <div className="text-gray-400 text-sm">Select a file to preview</div> : previewType === 'image' ? <img src={previewUrl} className="max-w-full max-h-[70vh] shadow-lg border border-gray-300 bg-white" /> : <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full shadow-lg bg-white" />}
                </div>
             </div>
        </div>

        {/* RIGHT COL: FILE VAULT & CHAT */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-[calc(100vh-100px)]">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-1/3">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                     <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><History size={14}/> File Vault</h3>
                     <button onClick={() => setShowUploadModal(true)} className="text-[10px] bg-black text-white px-2 py-1 rounded font-bold hover:bg-gray-800">+ New Proof</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {assets.map((asset) => {
                        const isCurrent = viewingAssetId === asset.id;
                        const linkedItem = asset.job_item_id ? items.find(i => i.id === asset.job_item_id) : null;
                        return (
                        <div key={asset.id} onClick={() => loadPreview(asset)} className={`p-2 rounded border cursor-pointer transition-all flex flex-col gap-2 group ${isCurrent ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                {asset.asset_type === 'source' ? <FileText size={16} className="text-gray-400"/> : <FileImage size={16} className="text-purple-500"/>}
                                <div><p className="text-xs font-bold text-gray-700 truncate w-32">{asset.file_name}</p><p className="text-[10px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</p></div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {asset.status === 'approved' && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 rounded flex items-center gap-1">APPROVED</span>}
                                {linkedItem && <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 rounded flex items-center gap-1 border border-blue-200 truncate max-w-full">LINKED: {linkedItem.description}</span>}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-2/3 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setRightTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'chat' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}><MessageSquare size={14}/> Discussion</button>
                    <button onClick={() => setRightTab('activity')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'activity' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}><Activity size={14}/> Activity Log</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
                    {rightTab === 'chat' && (
                        <>
                            {messages.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No messages yet.</div>}
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${msg.user_id === user?.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.content}</div>
                                    <span className="text-[9px] text-gray-400 mt-0.5">{msg.profiles?.email?.split('@')[0]}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                    {rightTab === 'activity' && (
                        <>
                            {logs.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No activity recorded yet.</div>}
                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-3 text-xs pb-3 border-b border-gray-50 last:border-0">
                                    <div className="mt-0.5 min-w-[30px] text-gray-400 font-mono text-[9px]">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                    <div><p className="font-bold text-gray-900">{log.action}</p><p className="text-gray-500">{log.details}</p></div>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </>
                    )}
                </div>
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
