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
                <tr key={item.id} onClick={() => setEditingItemId(item.id)} className="hover:bg-blue-50/50 transition-all cursor-pointer group">
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
  const [rightTab, setRightTab] = useState<'notes' | 'files' | 'chat' | 'history'>('notes');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [notePriority, setNotePriority] = useState('Low');
  const [noteStep, setNoteStep] = useState('');
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

  const activeItemId = selectedItemId || items[0]?.id || null;
  const selectedItem = items.find(i => i.id === activeItemId) || items[0] || null;
  const selectedSteps = [...(selectedItem?.job_item_steps || [])].sort((a: any, b: any) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const firstActiveIndex = selectedSteps.findIndex((s: any) => s.status !== 'Completed');
  const defaultExpandIndex = firstActiveIndex >= 0 ? firstActiveIndex : 0;

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* PROOF UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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
                <select value={proofItemId || ''} onChange={(e) => setProofItemId(e.target.value || undefined)} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white">
                  <option value="">-- Apply to Entire Job --</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.description}</option>)}
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center justify-between">
          <h1 className="text-sm font-bold text-gray-900">
            # {jobId.substring(0, 5).toUpperCase()} &mdash; {selectedItem?.description || job.title}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/invoices/new?jobId=${jobId}`}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded flex items-center gap-1.5 hover:bg-gray-700 transition-colors"
            >
              <Eye size={13}/> VIEW INVOICE
            </Link>
            <Link
              href={`/dashboard/invoices/new?jobId=${jobId}`}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
            >
              <FilePlus size={13}/> EDIT INVOICE
            </Link>
            <button
              onClick={handleSaveNotes}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded hover:bg-gray-700 transition-colors"
            >
              UPDATE JOB
            </button>
            <Link href="/dashboard" className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors ml-1">
              <X size={18}/>
            </Link>
          </div>
        </div>
      </div>

      {/* INFO PANEL */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-1">
            <div className="flex gap-2"><span className="text-gray-500 w-20">CSR:</span><span className="font-medium text-gray-900">{job.csr_name || 'Unassigned'}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-20">Date In:</span><span className="font-medium text-red-600">{fmtDate(job.created_at)}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-20">Due on:</span><span className="font-medium text-gray-900">{job.due_date ? fmtDate(job.due_date) : 'No date set'}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-20">Job Items:</span><span className="font-medium text-gray-900">{items.length}</span></div>
          </div>
          <div className="space-y-1">
            <div className="flex gap-2"><span className="text-gray-500 w-36">Customer Name:</span><span className="font-medium text-gray-900">{job.profiles?.email?.split('@')[0] || 'Guest'}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-36">Company:</span><span className="font-medium text-gray-900">{job.orders?.brands?.name || '-'}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-36">Attention:</span><span className="font-medium text-gray-400">-</span></div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-36">Phone:</span><span className="font-medium text-gray-400">-</span>
              <span className="text-gray-500 ml-4">Ext:</span><span className="font-medium text-gray-400">-</span>
            </div>
          </div>
        </div>
      </div>

      {/* ITEM SELECTOR */}
      {items.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 flex-wrap">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => { setSelectedItemId(item.id); setExpandedStepId(null); }}
              className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${
                activeItemId === item.id
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
              }`}
            >
              {item.description}
            </button>
          ))}
        </div>
      )}

      {/* SPECS BAR */}
      {selectedItem && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Quantity:</span>
            <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{selectedItem.quantity?.toLocaleString() || '-'}</span>
          </div>
          {selectedItem.size && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Size:</span>
              <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{selectedItem.size}</span>
            </div>
          )}
          {selectedItem.paper_stock && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Stock:</span>
              <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{selectedItem.paper_stock}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer select-none">
              <input type="checkbox" className="rounded border-gray-300" />
              Union Bug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Rush Date:</span>
              <input
                type="date"
                value={job.due_date ? job.due_date.substring(0, 10) : ''}
                onChange={(e) => handleUpdateJob(job.id, { due_date: e.target.value })}
                className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 'calc(100vh - 260px)' }}>

        {/* LEFT PANEL: Workflow Steps */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {!selectedItem ? (
            <div className="text-center text-gray-400 text-sm py-12">No items found for this job.</div>
          ) : selectedSteps.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12">No steps defined. Open the item to add workflow steps.</div>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {selectedSteps.map((step: any, index: number) => {
                const isCompleted = step.status === 'Completed';
                const isExpanded = expandedStepId === step.id || (expandedStepId === null && index === defaultExpandIndex);
                return (
                  <div key={step.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedStepId(isExpanded ? '__none__' : step.id)}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isCompleted ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'
                      }`}>
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span className="font-semibold text-gray-900 text-sm flex-1">{step.step_name}</span>
                      {isCompleted && <span className="text-xs text-green-600 font-medium">Completed</span>}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-4 bg-white">
                        <div className="mb-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Step notes</p>
                          <div className="bg-gray-50 rounded border border-gray-200 px-3 py-2 text-xs text-gray-400 min-h-[40px]">
                            {step.notes || 'No notes available.'}
                          </div>
                        </div>
                        {!isCompleted && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={async () => {
                                await supabase.from('job_item_steps').update({ status: 'Completed' }).eq('id', step.id);
                                const updatedSteps = selectedSteps.map((s: any) => s.id === step.id ? { ...s, status: 'Completed' } : s);
                                setItems(current => current.map(i => i.id === selectedItem.id ? { ...i, job_item_steps: updatedSteps } : i));
                                syncItemStatus(selectedItem.id, updatedSteps);
                                logActivity('Step Completed', `Completed step: ${step.step_name}`, selectedItem.id);
                                const next = selectedSteps[index + 1];
                                setExpandedStepId(next ? next.id : '__none__');
                              }}
                              className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-xs font-bold rounded hover:bg-gray-700 transition-colors"
                            >
                              ✓ Mark As Completed
                            </button>
                            <button className="px-4 py-2 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition-colors">
                              Send to
                            </button>
                          </div>
                        )}
                        {isCompleted && (
                          <p className="text-xs text-green-700 font-medium">{step.notes || 'Completed.'}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Notes / Files / Chat / History */}
        <div className="w-80 xl:w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {(['notes', 'files', 'chat', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                  rightTab === tab
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {tab === 'notes' ? 'Job notes' : tab === 'files' ? 'Job files' : tab === 'history' ? 'History' : 'Chat'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* NOTES TAB */}
            {rightTab === 'notes' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-3">
                    <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 w-full">
                      <option>Job Notes</option>
                      <option>Internal Notes</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    {logs.filter((l: any) => l.action === 'Note').length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-4 border border-gray-100 rounded bg-gray-50">
                        No notes available.
                      </div>
                    ) : (
                      logs.filter((l: any) => l.action === 'Note').map((note: any) => (
                        <div key={note.id} className="bg-gray-50 border border-gray-200 rounded p-3 text-xs">
                          <p className="text-gray-700">{note.details}</p>
                          <p className="text-gray-400 mt-1">{note.profiles?.email?.split('@')[0]} · {new Date(note.created_at).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-200 p-4 space-y-3">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Leave a Note"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs resize-none h-20 focus:outline-none focus:border-gray-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!noteText.trim()) return;
                        logActivity('Note', noteText);
                        setNoteText('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded hover:bg-gray-700 transition-colors whitespace-nowrap"
                    >
                      + Add Note
                    </button>
                    <select
                      value={noteStep}
                      onChange={(e) => setNoteStep(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-2 bg-white text-gray-600 min-w-0"
                    >
                      <option value="">Select step (Optional)</option>
                      {selectedSteps.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.step_name}</option>
                      ))}
                    </select>
                    <select
                      value={notePriority}
                      onChange={(e) => setNotePriority(e.target.value)}
                      className="w-16 text-xs border border-gray-200 rounded px-1 py-2 bg-white text-gray-600"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* FILES TAB */}
            {rightTab === 'files' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {assets.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-4">No files uploaded yet.</div>
                  ) : (
                    assets.map(asset => (
                      <div key={asset.id} onClick={() => loadPreview(asset)} className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                        <FileText size={16} className="text-gray-400 flex-shrink-0" />
                        <div className="overflow-hidden flex-1">
                          <p className="text-xs font-medium text-gray-800 truncate">{asset.file_name}</p>
                          <p className="text-[10px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()} · {asset.asset_type}</p>
                        </div>
                        {asset.status === 'approved' && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">APPROVED</span>}
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-200 p-4">
                  <button onClick={() => setShowUploadModal(true)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
                    + Upload New Proof
                  </button>
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {rightTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && <div className="text-center text-gray-300 text-xs py-4">No messages yet.</div>}
                  {messages.map((msg: any) => (
                    <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${msg.user_id === user?.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-gray-400 mt-0.5">{msg.profiles?.email?.split('@')[0]}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-gray-100 p-3 bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 px-3 py-2 rounded border border-gray-200 text-xs focus:outline-none focus:border-gray-500"
                      placeholder="Type here..."
                    />
                    <button onClick={handleSendMessage} className="bg-gray-900 text-white p-2 rounded hover:bg-gray-700 transition-colors">
                      <Send size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {rightTab === 'history' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {logs.length === 0 && <div className="text-center text-gray-300 text-xs py-4">No activity recorded yet.</div>}
                {logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-xs pb-3 border-b border-gray-50 last:border-0">
                    <div className="mt-0.5 text-gray-400 font-mono text-[9px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{log.action}</p>
                      <p className="text-gray-500">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
