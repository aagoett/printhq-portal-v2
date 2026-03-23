'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  ArrowLeft, Send, FileText, Download, Scissors, CheckSquare, Megaphone,
  History, Eye, FileImage, ThumbsUp, XCircle, CheckCircle,
  Activity, Save, Lock, X, UploadCloud, MessageSquare, Layers, Plus, Settings, Paperclip, Trash2, ListTodo, Globe, ChevronDown, ArrowUp, ArrowDown, ExternalLink, FilePlus, Clock, User, ChevronRight
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import CustomerPortalShell from '@/components/CustomerPortalShell';
// Fix: Use relative path (3 dots) for Dashboard folder
import { sendProofNotification } from '../../../server-actions'; 
import { normalizePortalVisibility } from '@/lib/customerJobs';
import { getJobFollowUpState } from '@/lib/jobFollowUp';

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

function OpsDisclosure({
  title,
  eyebrow,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-gray-200 bg-white shadow-sm open:border-gray-300"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4">
        <div>
          {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p> : null}
          <h3 className="mt-1 text-lg font-black text-gray-900">{title}</h3>
          {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
        </div>
        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition group-open:rotate-90 group-open:border-gray-300 group-open:bg-white group-open:text-gray-900">
          <ChevronRight size={16} />
        </span>
      </summary>
      <div className="border-t border-gray-100 px-4 py-4">{children}</div>
    </details>
  );
}

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
  userRole,
  getBlockingReasons,
  isReleaseBlocked,
  staffOptions = [],
  currentUserId,
}: { 
  items: any[], 
  assets: any[], 
  workflowOptions: any[],
  onAddItem: (item: any) => void, 
  onUpdateItem: (id: string, data: any) => void,
  onItemUpload: (file: File, itemId: string) => Promise<void>,
  onAddStep: (itemId: string, stepName: string, isInternal: boolean) => void,
  onToggleStep: (stepId: string, currentStatus: string, itemId?: string) => void,
  onDeleteStep: (stepId: string) => void,
  onMoveStep: (stepId: string, direction: 'up' | 'down') => void,
  onReorderSteps: (itemId: string, newSteps: any[]) => void,
  onOpenProofModal: (itemId?: string) => void,
  onLogActivity: (action: string, details: string, itemId?: string) => Promise<void>,
  logs: any[],
  userRole: string,
  getBlockingReasons: (itemId?: string, includeWarnings?: boolean) => any[],
  isReleaseBlocked: (itemId?: string) => boolean,
  staffOptions?: any[],
  currentUserId?: string | null,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const isStaff = userRole !== 'customer';
  const editingItem = items.find(i => i.id === editingItemId);

  return (
    <>
      {/* DRAWER */}
      {editingItem && isStaff && (
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
          staffOptions={staffOptions}
          currentUserId={currentUserId}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
            <Layers size={14} /> Production Line Items
          </h3>
          <div className="flex items-center gap-2">
             <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded text-gray-600">{items.length} Items</span>
             {isStaff && (
               <button onClick={() => setIsAdding(true)} className="flex items-center gap-1 text-[10px] bg-black text-white px-2 py-1 rounded font-bold hover:bg-gray-800 transition-colors">
                 <Plus size={12} /> Add Item
               </button>
             )}
          </div>
        </div>
        
        {isStaff && isAdding && (
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
                 const itemBlockers = getBlockingReasons(item.id, true);
                 const itemBlocked = isReleaseBlocked(item.id);
                 return (
                <tr 
                  key={item.id} 
                  onClick={() => { if (!isStaff) return; setEditingItemId(item.id); }} 
                  className={`hover:bg-blue-50/50 transition-all ${isStaff ? 'cursor-pointer' : 'cursor-default'} group`}
                >
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
                          {itemBlocked && <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Blocked</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                         <span className="flex items-center gap-1.5"><Layers size={12}/> {item.paper_stock || 'TBD STOCK'}</span>
                         <span className="flex items-center gap-1.5"> {item.ink_colors || 'CMYK'}</span>
                      </div>

                      {/* PRIMARY PERSISTENT NOTE */}
                      {isStaff && item.internal_notes && (
                        <div className="text-[11px] bg-yellow-400/10 text-yellow-800 p-3 rounded-lg border border-yellow-200 flex items-start gap-2 font-black leading-relaxed max-w-xl shadow-inner uppercase tracking-tight">
                          <Lock size={14} className="mt-0.5 flex-shrink-0 text-yellow-600"/> 
                          <div>
                            <span className="block text-[9px] opacity-70 mb-1 tracking-widest">Main Production Note:</span>
                            {item.internal_notes}
                          </div>
                        </div>
                      )}

                      {/* MULTIPLE LOGGED NOTES / ACTIVITY */}
                      {isStaff && (() => {
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
                      {isStaff ? (
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
                      ) : (
                        <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg border-2 uppercase tracking-widest bg-gray-50 text-gray-600 border-gray-200 inline-block`}>
                          {item.status || 'Pending'}
                        </span>
                      )}
                   </td>
                  <td className="px-6 py-6 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                         {(() => {
                            const itemAssets = assets.filter(a => a.job_item_id === item.id);
                            const hasProof = itemAssets.some(a => a.asset_type === 'proof');
                            const isApproved = itemAssets.some(a => a.asset_type === 'proof' && a.status === 'approved');
                            
                            return isStaff ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onOpenProofModal(item.id); }}
                                className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg font-black transition-all shadow-sm uppercase tracking-widest border-2
                                  ${isApproved ? 'bg-green-100 text-green-700 border-green-200' : 
                                    hasProof ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                    'bg-purple-600 text-white border-purple-700 hover:bg-purple-700 shadow-purple-100'}
                                `}
                              >
                                {isApproved ? <CheckCircle size={12}/> : <Plus size={12} />}
                                {isApproved ? 'Approved' : hasProof ? 'Live / Replace' : 'Share'}
                              </button>
                            ) : (
                              <span className={`text-[10px] px-2.5 py-1.5 rounded-lg font-black uppercase tracking-widest border-2 ${isApproved ? 'bg-green-50 text-green-700 border-green-200' : hasProof ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                {isApproved ? 'Proof Approved' : hasProof ? 'Proof Sent' : 'No Proof Yet'}
                              </span>
                            );
                         })()}
                         {isStaff && (
                           <div className="p-2 hover:bg-gray-100 rounded-full transition-colors inline-block">
                             <Settings size={18} className="text-gray-300 group-hover:text-black transition-colors" />
                           </div>
                         )}
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
  initialBlockers: any[];
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
  initialBlockers,
  jobId 
}: JobViewProps) {

  const toLocalInput = (iso?: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const toIsoFromLocal = (value?: string | null) => (value ? new Date(value).toISOString() : null);

  // --- STATE ---
  const [job, setJob] = useState(initialJob);
  const [items, setItems] = useState(initialItems || []);
  const [messages, setMessages] = useState(initialMessages);
  const [logs, setLogs] = useState(initialLogs); 
  const [assets, setAssets] = useState(initialAssets);
  const [blockers, setBlockers] = useState(initialBlockers || []);
  const [userRole, setUserRole] = useState('customer');
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  
  const [advancedOpen, setAdvancedOpen] = useState(userRole === 'admin');
  const isStaff = userRole !== 'customer';
  const isCSRMode = isStaff && userRole !== 'admin';
  const showAdvancedOps = !isCSRMode || advancedOpen;

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

  const [shareProofToPortal, setShareProofToPortal] = useState(true);
  const [selectedDraftProofId, setSelectedDraftProofId] = useState<string>('');
  const [messageInternal, setMessageInternal] = useState(false);
  const [portalActionLoading, setPortalActionLoading] = useState(false);
  const [customerActionNote, setCustomerActionNote] = useState(initialJob.customer_action_note || '');
  const [followUpNote, setFollowUpNote] = useState(initialJob.follow_up_note || '');
  const [followUpOwner, setFollowUpOwner] = useState<string | null>(initialJob.follow_up_owner || initialJob.assigned_to || null);
  const [followUpStatus, setFollowUpStatus] = useState<string>(initialJob.follow_up_status || 'open');
  const [followUpAtInput, setFollowUpAtInput] = useState<string>(toLocalInput(initialJob.follow_up_at));

  const [blockerType, setBlockerType] = useState<'artwork' | 'proof' | 'customer' | 'spec' | 'payment' | 'inventory' | 'scheduling' | 'other'>('artwork');
  const [blockerSeverity, setBlockerSeverity] = useState<'block' | 'hold' | 'warn'>('block');
  const [blockerReason, setBlockerReason] = useState('');
  const [blockerNextStep, setBlockerNextStep] = useState('');
  const [blockerItemId, setBlockerItemId] = useState<string | null>(null);

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

  const itemAggregate = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalQty = 0;
    items.forEach((it: any) => {
      const status = it?.status || 'Pending';
      counts[status] = (counts[status] || 0) + 1;
      totalQty += Number(it?.quantity || 0);
    });
    return { counts, totalQty };
  }, [items]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const channel = supabase.channel('job_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` }, 
        () => refreshMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_assets', filter: `job_id=eq.${jobId}` }, 
        () => refreshAssets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_blockers', filter: `job_id=eq.${jobId}` }, 
        () => refreshBlockers())
      .subscribe();

    if (assets.length > 0) {
        const approved = assets.find((a: any) => a.status === 'approved');
        const latestProof = assets.find((a: any) => a.asset_type === 'proof' && a.status !== 'archived');
        loadPreview(approved || latestProof || assets[0]);
        syncPortalStateFromAssets(assets);
    }
    
    // NEW: Fetch Workflow Settings on Load
    fetchWorkflowQueues();
    fetchUserRole();
    refreshBlockers();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  useEffect(() => {
    if (userRole === 'admin') {
      setAdvancedOpen(true);
    } else if (userRole && userRole !== 'customer') {
      setAdvancedOpen(false);
    }
    if (!showAdvancedOps && rightTab === 'activity') {
      setRightTab('chat');
    }
  }, [userRole, showAdvancedOps, rightTab]);

  const fetchUserRole = async () => {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role) {
      setUserRole(data.role);
      if (data.role !== 'customer') {
        const { data: staff } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role')
          .in('role', ['admin', 'staff']);
        if (staff) setStaffOptions(staff);
      }
    }
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
    if (data) {
      setAssets(data);
      await syncPortalStateFromAssets(data);
    }
  };

  const refreshLogs = async () => {
    const { data } = await supabase.from('job_logs').select('*, profiles(email)').eq('job_id', jobId).order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const refreshBlockers = async () => {
    const { data } = await supabase.from('job_blockers').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
    if (data) setBlockers(data);
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

  const ownerLabel = (staffId?: string | null) => {
    if (!staffId) return 'Unassigned';
    const staffMember = staffOptions.find((s: any) => s.id === staffId);
    return staffMember?.first_name || staffMember?.email || 'Staff';
  };

  const handleAssignItemOwner = async (itemId: string, staffId: string | null, extraUpdates: Record<string, any> = {}) => {
    const targetItem = items.find((i: any) => i.id === itemId);
    if (!targetItem) return;

    const prevOwner = targetItem.assigned_to || null;
    const nextOwner = staffId || null;
    const { claimed_at: _ignoredClaimedAt, ...restUpdates } = extraUpdates;
    if (prevOwner === nextOwner && Object.keys(restUpdates).length === 0) return;

    const payload = {
      ...restUpdates,
      assigned_to: nextOwner,
      claimed_at: nextOwner ? new Date().toISOString() : null,
    };

    const prevItems = items;
    setItems((current) => current.map((itm: any) => (itm.id === itemId ? { ...itm, ...payload } : itm)));

    const { error } = await supabase.from('job_items').update(payload).eq('id', itemId);
    if (error) {
      alert(error.message);
      setItems(prevItems);
      return;
    }

    if (prevOwner !== nextOwner) {
      const prevLabel = ownerLabel(prevOwner);
      const nextLabel = ownerLabel(nextOwner);
      await logActivity(nextOwner ? (prevOwner ? 'Item reassigned' : 'Item claimed') : 'Item unclaimed', `Owner ${prevLabel} → ${nextLabel}`, itemId);
    }
  };

  // --- Portal visibility helpers ---
  const updatePortalVisibility = async (visibility: 'internal' | 'shell' | 'proof_live' | 'hidden') => {
    if (!isStaff) return;
    const normalized = normalizePortalVisibility(visibility);
    const timestamp = normalized === 'internal' ? null : new Date().toISOString();
    setJob((prev: any) => ({
      ...prev,
      portal_visibility: normalized,
      portal_shared_at: timestamp,
      portal_shared_by: user.id,
    }));
    await supabase.from('jobs').update({
      portal_visibility: normalized,
      portal_shared_at: timestamp,
      portal_shared_by: user.id,
    }).eq('id', jobId);
    await logActivity('Portal visibility', `Set portal visibility to ${normalized}`);
  };

  const setPortalShell = async () => {
    if (!isStaff) return;
    setPortalActionLoading(true);
    try {
      await supabase
        .from('job_assets')
        .update({ portal_visible: false })
        .eq('job_id', jobId)
        .eq('asset_type', 'proof')
        .neq('status', 'archived');
      await updatePortalVisibility('shell');
      await refreshAssets();
    } finally {
      setPortalActionLoading(false);
    }
  };

  const hidePortalFromCustomer = async () => {
    if (!isStaff) return;
    setPortalActionLoading(true);
    try {
      await supabase
        .from('job_assets')
        .update({ portal_visible: false })
        .eq('job_id', jobId)
        .eq('asset_type', 'proof')
        .neq('status', 'archived');
      await updatePortalVisibility('hidden');
      await refreshAssets();
    } finally {
      setPortalActionLoading(false);
    }
  };

  const resetPortalInternal = async () => {
    if (!isStaff) return;
    setPortalActionLoading(true);
    try {
      await supabase
        .from('job_assets')
        .update({ portal_visible: false })
        .eq('job_id', jobId)
        .eq('asset_type', 'proof')
        .neq('status', 'archived');
      await updatePortalVisibility('internal');
      await refreshAssets();
    } finally {
      setPortalActionLoading(false);
    }
  };

  const toggleAssetPortalVisibility = async (assetId: string, makeVisible: boolean) => {
    if (!isStaff) return;
    const timestamp = makeVisible ? new Date().toISOString() : null;
    setAssets((current) => current.map((asset: any) =>
      asset.id === assetId ? { ...asset, portal_visible: makeVisible, portal_shared_at: timestamp } : asset
    ));
    await supabase.from('job_assets').update({
      portal_visible: makeVisible,
      portal_shared_at: timestamp,
    }).eq('id', assetId);
    if (makeVisible && normalizePortalVisibility(job.portal_visibility) === 'internal') {
      await updatePortalVisibility('proof_live');
    }
    if (!makeVisible) {
      const remainingShared = assets.some((a: any) => a.id !== assetId && a.asset_type === 'proof' && a.status !== 'archived' && a.portal_visible !== false);
      if (!remainingShared && normalizePortalVisibility(job.portal_visibility) === 'proof_live') {
        setJob((prev: any) => ({ ...prev, portal_visibility: 'shell', customer_action_required: false, customer_action_type: null }));
        await supabase.from('jobs').update({ portal_visibility: 'shell', customer_action_required: false, customer_action_type: null, customer_action_note: null }).eq('id', jobId);
      }
    }
    await refreshAssets();
  };

  const syncPortalStateFromAssets = async (assetList?: any[]) => {
    const list = assetList || assets;
    const portalProofs = list.filter((asset: any) => asset.asset_type === 'proof' && asset.status !== 'archived' && asset.portal_visible !== false);
    const pendingPortalProof = portalProofs.find((asset: any) => asset.status === 'pending');
    const hasPortalProof = portalProofs.length > 0;

    const updates: any = {};
    const normalizedVisibility = normalizePortalVisibility(job.portal_visibility);

    if (hasPortalProof && normalizedVisibility === 'internal') {
      updates.portal_visibility = 'proof_live';
      updates.portal_shared_at = new Date().toISOString();
      updates.portal_shared_by = user.id;
    }

    if (!hasPortalProof && normalizedVisibility === 'proof_live') {
      updates.portal_visibility = 'shell';
    }

    if (pendingPortalProof) {
      if (!job.customer_action_required || job.customer_action_type !== 'approve_proof') {
        updates.customer_action_required = true;
        updates.customer_action_type = 'approve_proof';
        updates.customer_action_note = job.customer_action_note || 'Review and approve the latest proof.';
      }
    } else if (job.customer_action_type === 'approve_proof' && job.customer_action_required) {
      updates.customer_action_required = false;
      updates.customer_action_type = null;
      updates.customer_action_note = null;
    }

    if (Object.keys(updates).length > 0) {
      setJob((prev: any) => ({ ...prev, ...updates }));
      await supabase.from('jobs').update(updates).eq('id', jobId);
    }
  };

  const setCustomerAction = async (
    type: 'upload_artwork' | 'approve_proof' | 'review_quote' | 'other',
    note?: string
  ) => {
    if (!isStaff) return;
    const payload: any = {
      customer_action_required: true,
      customer_action_type: type,
      customer_action_note: note || customerActionNote || null,
    };
    setJob((prev: any) => ({ ...prev, ...payload }));
    setCustomerActionNote(payload.customer_action_note || '');
    await supabase.from('jobs').update(payload).eq('id', jobId);
    await logActivity('Customer action', `Set customer action to ${type}${note ? ': ' + note : ''}`);
    const visibility = normalizePortalVisibility(job.portal_visibility);
    if (type === 'upload_artwork' && visibility === 'internal') {
      await updatePortalVisibility('shell');
    }
    if (type === 'approve_proof' && visibility === 'internal') {
      await updatePortalVisibility('proof_live');
    }
  };

  const clearCustomerAction = async () => {
    if (!isStaff) return;
    const payload = { customer_action_required: false, customer_action_type: null, customer_action_note: null };
    setJob((prev: any) => ({ ...prev, ...payload }));
    setCustomerActionNote('');
    await supabase.from('jobs').update(payload).eq('id', jobId);
    await logActivity('Customer action', 'Cleared customer action requirement');
  };

  // --- ITEM CRUD OPERATIONS ---
  // --- ITEM CRUD OPERATIONS ---
  const handleAddItem = async (newItem: any) => {
    if (!isStaff) return;
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
    if (!isStaff) return;
    const currentItem = items.find((i: any) => i.id === id);
    if (updates.status) {
      const blocking = blockingReasonsForItem(id);
      if (blocking.length > 0 && !['Pending', 'Cancelled'].includes(updates.status)) {
        alert(`Release blocked: ${blocking[0].label} — ${blocking[0].detail}`);
        await logActivity('Release gate blocked', `Attempted to set item status to ${updates.status} while blocked: ${blocking[0].label}`, id);
        return;
      }
    }

    const { assigned_to, claimed_at: _ignoredClaimedAt, ...rest } = updates || {};

    if (assigned_to !== undefined) {
      await handleAssignItemOwner(id, assigned_to || null, rest);
      if (Object.keys(rest).length === 0) return;
    }

    if (Object.keys(rest).length === 0) return;

    setItems(current => current.map(i => i.id === id ? { ...i, ...rest } : i));
    const { error } = await supabase.from('job_items').update(rest).eq('id', id);
    if (error) {
      alert("Error saving item: " + error.message);
      // rollback UI if needed
      if (currentItem) {
        setItems(current => current.map(i => i.id === id ? currentItem : i));
      }
    }
  };

  const handleUpdateJob = async (id: string, updates: any) => {
      if (!isStaff) return;
      setJob({ ...job, ...updates });
      await supabase.from('jobs').update(updates).eq('id', id);
  };

  const handleItemUpload = async (file: File, itemId: string) => {
      if (!isStaff) return;
      const storageName = `${jobId}-item-${itemId.substring(0,4)}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('uploads').upload(storageName, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('job_assets').insert({
          job_id: jobId, job_item_id: itemId, uploader_id: user.id, file_url: uploadData.path,
          file_name: file.name, asset_type: 'source', status: 'pending'
      });
      if (dbError) throw dbError;

      const itemDesc = items.find(i => i.id == itemId)?.description || 'Job item';
      await supabase.from('messages').insert({
        job_id: jobId,
        user_id: user.id,
        content: `[Asset] ${file.name} uploaded to ${itemDesc}`,
        is_customer_visible: false,
      });

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
    if (!isStaff) return;
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

  const handleToggleStep = async (stepId: string, currentStatus: string, itemId?: string) => {
    if (!isStaff) return;
    const statusOptions = ['Pending', 'In Production', 'To Bindery', 'In Bindery', 'Bindery Complete', 'Completed', 'Cancelled'];
    const currentIndex = statusOptions.indexOf(currentStatus);
    const newStatus = currentIndex === statusOptions.length - 1 ? statusOptions[0] : statusOptions[currentIndex + 1];

    const blocking = blockingReasonsForItem(itemId);
    if (blocking.length > 0 && !['Pending', 'Cancelled'].includes(newStatus)) {
      alert(`Release blocked: ${blocking[0].label} — ${blocking[0].detail}`);
      await logActivity('Release gate blocked', `Attempted to move step to ${newStatus} while blocked: ${blocking[0].label}`, itemId);
      return;
    }

    setItems(current => current.map(i => ({
      ...i,
      job_item_steps: i.job_item_steps?.map((s: any) => s.id === stepId ? { ...s, status: newStatus } : s)
    })));

    await supabase.from('job_item_steps').update({ status: newStatus }).eq('id', stepId);

    // After toggle, sync the parent item status
    const item = items.find(i => i.id === itemId || i.job_item_steps?.some((s: any) => s.id === stepId));
    if (item) {
      const updatedSteps = item.job_item_steps.map((s: any) => s.id === stepId ? { ...s, status: newStatus } : s);
      await syncItemStatus(item.id, updatedSteps);
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    if (!isStaff) return;
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
    if (!isStaff) return;
    setItems(current => current.map(item => {
      if (item.id === itemId) return { ...item, job_item_steps: newSteps };
      return item;
    }));
    await syncItemStatus(itemId, newSteps);
    // Note: To persist this properly across sessions, we would need to update 'created_at' or a 'sort_order' column for EACH step.
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!isStaff) return;
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

  const handleCreateBlocker = async () => {
    if (!isStaff) return;
    const reason = blockerReason.trim();
    if (!reason) {
      alert('Add a blocker reason first.');
      return;
    }
    const payload: any = {
      job_id: jobId,
      job_item_id: blockerItemId || null,
      blocker_type: blockerType,
      severity: blockerSeverity,
      reason,
      next_step: blockerNextStep || null,
      created_by: user.id,
    };
    const { data, error } = await supabase.from('job_blockers').insert(payload).select().single();
    if (error) {
      alert('Error saving blocker: ' + error.message);
      return;
    }
    setBlockers((current: any[]) => [data, ...current]);
    setBlockerReason('');
    setBlockerNextStep('');
    setBlockerItemId(null);
    setBlockerSeverity('block');
    setBlockerType('artwork');
    const label = blockerMeta[blockerType]?.label || 'Blocker added';
    await logActivity('Blocker added', `${label}: ${reason}`, blockerItemId || undefined);
  };

  const resolveBlocker = async (id: string) => {
    if (!isStaff) return;
    const { error } = await supabase.from('job_blockers').update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id }).eq('id', id);
    if (error) {
      alert('Error clearing blocker: ' + error.message);
      return;
    }
    setBlockers((current: any[]) => current.map((b: any) => b.id === id ? { ...b, status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id } : b));
    await logActivity('Blocker resolved', `Resolved blocker ${id}`);
    refreshBlockers();
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
      setSelectedDraftProofId('');
    }
  };

  const openUploadModal = (itemId?: string) => {
    if (!isStaff) return;
    setProofItemId(itemId);
    setShareProofToPortal(true);
    setUploadFile(null);
    setUploadMessage('');
    setSelectedDraftProofId('');
    setShowUploadModal(true);
  };

  const handleSubmitProof = async () => {
      if (!isStaff || !user) return;
      if (!uploadFile && !selectedDraftProofId) {
        alert('Upload a proof file or pick an existing draft to share.');
        return;
      }

      setIsUploading(true);
      try {
        let sharedAsset: any = null;

        if (uploadFile) {
          const fileName = `${jobId}-proof-${Math.random().toString(36).substring(7)}${proofItemId ? `-item-${proofItemId.substring(0,4)}` : ''}.${uploadFile.name.split('.').pop()}`;
          const { data, error } = await supabase.storage.from('uploads').upload(fileName, uploadFile);
          if (error) throw error;

          const updateQuery = supabase.from('job_assets')
            .update({ status: 'archived', portal_visible: false })
            .eq('job_id', jobId)
            .eq('asset_type', 'proof')
            .eq('status', 'pending');
          if (proofItemId) {
              updateQuery.eq('job_item_id', proofItemId);
          } else {
              updateQuery.is('job_item_id', null);
          }
          await updateQuery;

          const { data: newAsset, error: insertError } = await supabase.from('job_assets').insert({
              job_id: jobId, 
              job_item_id: proofItemId || null,
              uploader_id: user.id, 
              file_url: data?.path, 
              file_name: uploadFile.name, 
              asset_type: 'proof', 
              status: 'pending',
              portal_visible: shareProofToPortal,
              portal_shared_at: shareProofToPortal ? new Date().toISOString() : null,
          }).select().single();
          if (insertError) throw insertError;
          sharedAsset = newAsset;
        } else if (selectedDraftProofId) {
          const { data: draftAsset, error: draftError } = await supabase.from('job_assets').update({
            portal_visible: shareProofToPortal,
            portal_shared_at: shareProofToPortal ? new Date().toISOString() : null,
            status: 'pending',
          }).eq('id', selectedDraftProofId).select().single();
          if (draftError) throw draftError;
          sharedAsset = draftAsset;

          const archiveQuery = supabase.from('job_assets')
            .update({ status: 'archived', portal_visible: false })
            .eq('job_id', jobId)
            .eq('asset_type', 'proof')
            .eq('status', 'pending')
            .neq('id', selectedDraftProofId);
          if (draftAsset?.job_item_id) {
            archiveQuery.eq('job_item_id', draftAsset.job_item_id);
          } else {
            archiveQuery.is('job_item_id', null);
          }
          await archiveQuery;
        }

        if (!sharedAsset) throw new Error('No proof asset available after upload/share.');

        const itemDesc = sharedAsset.job_item_id ? items.find(i => i.id === sharedAsset.job_item_id)?.description : 'Main Job';
        const proofMessage = uploadMessage || 'Review and approve the latest proof.';

        await supabase.from('messages').insert({
          job_id: jobId,
          user_id: user.id,
          content: `[Proof Shared] ${proofMessage}${itemDesc ? ` • ${itemDesc}` : ''}`,
          is_customer_visible: shareProofToPortal,
        });

        const jobUpdates: any = {};
        if (shareProofToPortal) {
          jobUpdates.portal_visibility = 'proof_live';
          jobUpdates.portal_shared_at = new Date().toISOString();
          jobUpdates.portal_shared_by = user.id;
          jobUpdates.customer_action_required = true;
          jobUpdates.customer_action_type = 'approve_proof';
          jobUpdates.customer_action_note = proofMessage;
          const statusString = (job.status || '').toLowerCase();
          if (!job.status || job.status === 'Changes Requested' || !statusString.includes('proof')) {
            jobUpdates.status = 'Proof Sent - Awaiting Approval';
          }
        }

        if (Object.keys(jobUpdates).length > 0) {
          await supabase.from('jobs').update(jobUpdates).eq('id', jobId);
          setJob((prev: any) => ({ ...prev, ...jobUpdates }));
        }

        await logActivity('Proof shared', `${proofMessage}${shareProofToPortal ? ' (customer-visible)' : ' (internal only)'}`, sharedAsset.job_item_id || undefined);

        if (shareProofToPortal) {
          await sendProofNotification(jobId, sharedAsset.file_url || '', `${proofMessage}${itemDesc ? ` • ${itemDesc}` : ''}`);
        }
        if (sharedAsset) { await refreshAssets(); loadPreview(sharedAsset); }
      } catch (err: any) {
        console.error(err);
        alert(err?.message || 'Unable to share proof.');
      } finally {
        setIsUploading(false);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadMessage('');
        setProofItemId(undefined);
        setShareProofToPortal(true);
        setSelectedDraftProofId('');
      }
  };
  const handleApproveProof = async (assetId: string) => {
      if (!confirm("Mark APPROVED?")) return;
      await supabase.from('job_assets').update({ status: 'approved' }).eq('id', assetId);
      const blocking = blockingReasonsForItem(undefined).filter((b) => b.blocker_type !== 'proof');
      const nextStatus = blocking.length > 0 ? 'Proof Approved - Waiting Release' : 'In Production';
      await supabase.from('jobs').update({ status: nextStatus, customer_action_required: false, customer_action_type: null, customer_action_note: null }).eq('id', jobId);
      const approvedAsset = assets.find((a: any) => a.id === assetId);
      await supabase.from('messages').insert({
        job_id: jobId,
        user_id: user.id,
        content: `[Proof Approved] ${approvedAsset?.file_name || 'Proof'} approved for production`,
        is_customer_visible: true,
      });
      await logActivity('Proof approved (staff)', `Approved ${approvedAsset?.file_name || 'proof'} for production`);
      if (blocking.length > 0) {
        await logActivity('Release gate blocked', `Proof approved but still blocked: ${blocking[0].label}`);
      }
      setJob((prev: any) => ({ ...prev, status: nextStatus, customer_action_required: false, customer_action_type: null, customer_action_note: null }));
      refreshAssets();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = newMessage; setNewMessage('');
    await supabase.from('messages').insert({ job_id: jobId, user_id: user.id, content: msg, is_customer_visible: !messageInternal });
    await logActivity(messageInternal ? 'Internal note' : 'Message', msg);
    setMessageInternal(false);
  };

  const handleUpdateStepNote = async (stepId: string, note: string) => {
    if (!isStaff) return;
    const { error } = await supabase.from('job_item_steps').update({ notes: note }).eq('id', stepId);
    if (error) {
      console.error('Error updating step note:', error);
      alert('Failed to save step note');
    } else {
      setItems(current => current.map(item => ({
        ...item,
        job_item_steps: item.job_item_steps?.map((s: any) => s.id === stepId ? { ...s, notes: note } : s)
      })));
    }
  };

  const handleSaveNotes = async () => {
      if (!isStaff) return;
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

  const handleSaveFollowUp = async (mode: 'save' | 'done' | 'clear') => {
    if (!isStaff) return;
    const nextStatus = mode === 'done' || mode === 'clear' ? 'done' : 'open';
    const nextFollowUpAt = nextStatus === 'done' ? null : toIsoFromLocal(followUpAtInput);
    const payload: any = {
      follow_up_note: mode === 'clear' ? null : (followUpNote.trim() || null),
      follow_up_at: mode === 'clear' ? null : nextFollowUpAt,
      follow_up_owner: mode === 'clear' ? null : (followUpOwner || null),
      follow_up_status: nextStatus,
      follow_up_completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
    };
    if (nextStatus === 'open') {
      payload.follow_up_completed_at = null;
    }

    const { error } = await supabase.from('jobs').update(payload).eq('id', jobId);
    if (error) {
      alert('Error saving follow-up: ' + error.message);
      return;
    }

    setJob((prev: any) => ({ ...prev, ...payload }));
    setFollowUpStatus(nextStatus);
    if (mode === 'clear') {
      setFollowUpNote('');
      setFollowUpAtInput('');
      setFollowUpOwner(null);
    }
    await logActivity(
      'Follow-up updated',
      `Status: ${nextStatus.toUpperCase()} • Note: ${payload.follow_up_note || 'none'} • When: ${payload.follow_up_at ? new Date(payload.follow_up_at).toLocaleString() : 'not set'}${payload.follow_up_owner ? ` • Owner: ${ownerLabel(payload.follow_up_owner)}` : ''}`
    );
  };

  const toggleFinishingOption = async (optionName: string) => {
      if (!isStaff) return;
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
  const portalSharedAssets = assets.filter((asset: any) => asset.asset_type === 'proof' && asset.status !== 'archived' && asset.portal_visible !== false);
  const sharedPortalCount = portalSharedAssets.length;
  const archivedProofCount = assets.filter((asset: any) => asset.asset_type === 'proof' && asset.status === 'archived').length;
  const visibleAssets = isStaff ? assets : portalSharedAssets;
  const currentAsset = visibleAssets.find(a => a.id === viewingAssetId) || visibleAssets[0] || assets.find(a => a.id === viewingAssetId);
  const isApprovedAsset = currentAsset?.status === 'approved';
  const originalAsset = assets.find(a => a.asset_type === 'source');
  const portalHref = `/portal/jobs/${jobId}`;
  const latestPortalProof = portalSharedAssets[0];
  const portalVisibility = normalizePortalVisibility(job.portal_visibility || initialJob?.portal_visibility || 'internal');
  const awaitingArtworkItems = items.filter((item: any) => item.waitingOnArt || item.artwork_status === 'Waiting on Art' || item.artworkStatus === 'Waiting on Art');
  const pendingPortalProof = portalSharedAssets.find((asset: any) => asset.status === 'pending');
  const customerActionType = job.customer_action_type || (pendingPortalProof ? 'approve_proof' : null);
  const customerActionRequired = job.customer_action_required || (customerActionType === 'approve_proof' && !!pendingPortalProof) || (customerActionType === 'upload_artwork' && awaitingArtworkItems.length > 0);
  const customerActionNoteValue = customerActionNote || job.customer_action_note;
  const customerAction = (() => {
    if (!customerActionRequired || !customerActionType) return { required: false, label: 'No action needed', description: 'No customer action is currently required.', tone: 'gray' };
    if (customerActionType === 'upload_artwork') {
      return { required: true, label: 'Artwork required', description: customerActionNoteValue || 'Customer owes files or copy before proofing can continue.', tone: 'orange' };
    }
    if (customerActionType === 'approve_proof') {
      return { required: true, label: 'Review & approve proof', description: customerActionNoteValue || 'Customer should review the live proof and approve or request changes.', tone: 'blue' };
    }
    return { required: true, label: 'Customer action needed', description: customerActionNoteValue || 'Customer owes info before we proceed.', tone: 'yellow' };
  })();
  const isPortalHidden = portalVisibility === 'hidden';
  const isPortalShell = portalVisibility === 'shell';
  const isPortalProofLive = portalVisibility === 'proof_live';
  const portalState = (() => {
    if (portalVisibility === 'hidden') {
      return {
        label: 'Hidden from portal',
        description: 'Portal access is disabled. Customer cannot see this job until you change visibility.',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
        panelClass: 'border-gray-200 bg-gray-50',
      };
    }
    if (portalVisibility === 'shell') {
      return {
        label: 'Portal shell only',
        description: customerActionType === 'upload_artwork' ? 'Customer shell is live; they still owe artwork or copy to move forward.' : 'Customer sees the job shell, line items, and shared messages. Proofs stay hidden until you share them.',
        badgeClass: customerActionType === 'upload_artwork' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-blue-100 text-blue-800 border-blue-200',
        panelClass: customerActionType === 'upload_artwork' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50',
      };
    }
    if (portalVisibility === 'proof_live') {
      if (job.status === 'Changes Requested') {
        return {
          label: 'Changes requested',
          description: 'Customer asked for edits. Keep the current proof private until the next revision is ready to share.',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          panelClass: 'border-amber-200 bg-amber-50',
        };
      }
      if (customerActionRequired && customerActionType === 'approve_proof') {
        return {
          label: 'Awaiting customer review',
          description: customerAction.description,
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          panelClass: 'border-purple-200 bg-purple-50',
        };
      }
      if (latestPortalProof?.status === 'approved' || ['In Production', 'Shipped', 'Complete', 'Proof Approved - Waiting Release'].includes(job.status)) {
        return {
          label: 'Approved proof live',
          description: 'Customer can still see the approved proof and job shell, but approval is locked and production is underway.',
          badgeClass: 'bg-green-100 text-green-800 border-green-200',
          panelClass: 'border-green-200 bg-green-50',
        };
      }
      if (latestPortalProof) {
        return {
          label: 'Awaiting customer review',
          description: 'A live proof is on the portal now. Sharing another proof will replace the current pending version for this item or job.',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          panelClass: 'border-purple-200 bg-purple-50',
        };
      }
    }
    return {
      label: 'Internal only',
      description: 'Nothing customer-visible yet. Source files and shop notes stay private until you share a shell or proof to the portal.',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      panelClass: 'border-gray-200 bg-gray-50',
    };
  })();
  const portalNextAction = customerAction.required
    ? customerAction.description
    : portalVisibility === 'proof_live' && latestPortalProof?.status !== 'approved'
      ? 'Customer should review the live proof and either approve it or request changes.'
      : portalVisibility === 'proof_live' && (latestPortalProof?.status === 'approved' || ['In Production', 'Shipped', 'Complete', 'Proof Approved - Waiting Release'].includes(job.status))
        ? 'No customer action needed. Proof is approved and production is moving.'
        : portalVisibility === 'shell'
          ? 'Customer can see the shell, thread, and shared updates, but no proof yet.'
          : 'No portal handoff is active yet.';
  const dueRisk = countdown.text.includes('LATE') ? 'late' : countdown.text === 'DUE TODAY' ? 'today' : 'safe';
  const allProofAssets = assets.filter((asset: any) => asset.asset_type === 'proof');
  const hiddenDraftProofs = allProofAssets.filter((asset: any) => asset.status !== 'archived' && asset.portal_visible === false);
  const latestInternalProof = hiddenDraftProofs[0];
  const latestPortalProofScope = latestPortalProof?.job_item_id ? items.find((item: any) => item.id === latestPortalProof.job_item_id)?.description : null;
  const latestPortalProofLabel = latestPortalProofScope || 'Job-wide proof';
  const followUpState = getJobFollowUpState({
    ...job,
    follow_up_note: followUpNote || job.follow_up_note,
    follow_up_at: followUpAtInput ? toIsoFromLocal(followUpAtInput) : job.follow_up_at,
    follow_up_owner: followUpOwner ?? job.follow_up_owner,
    follow_up_status: followUpStatus || job.follow_up_status,
    follow_up_completed_at: job.follow_up_completed_at,
    notes: job.notes || internalNotes || '',
  });
  const followUpOwnerLabel = followUpState.ownerId ? ownerLabel(followUpState.ownerId) : job.assigned_to ? ownerLabel(job.assigned_to) : null;
  const followUpToneClasses: Record<string, string> = {
    overdue: 'border-red-200 bg-red-50 text-red-800',
    today: 'border-amber-200 bg-amber-50 text-amber-800',
    scheduled: 'border-blue-200 bg-blue-50 text-blue-800',
    cleared: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    missing: 'border-gray-200 bg-gray-50 text-gray-700',
  };
  const followUpBadgeClass = followUpToneClasses[followUpState.displayStatus] || followUpToneClasses.missing;

  const customerVisibleMessages = (messages || []).filter((m: any) => m.is_customer_visible !== false);
  const customerTouchEvents = [
    ...portalSharedAssets.map((asset: any) => ({
      occurredAt: asset.portal_shared_at || asset.created_at,
      label: asset.status === 'approved' ? 'Approved proof shared' : 'Proof shared',
    })),
    ...customerVisibleMessages.map((msg: any) => ({
      occurredAt: msg.created_at,
      label: msg.user_id === user?.id ? 'PrintHQ replied' : 'Customer replied',
    })),
  ].filter((e: any) => !!e.occurredAt);
  const lastCustomerTouch = customerTouchEvents.sort((a: any, b: any) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
  const lastTouchValue = lastCustomerTouch ? new Date(lastCustomerTouch.occurredAt).toLocaleString() : 'No customer touch yet';
  const lastTouchDetail = lastCustomerTouch ? lastCustomerTouch.label : 'Share a proof or post a portal-visible reply to start the thread.';

  const proofWorkflowCards = [
    {
      key: 'proof-state',
      label: 'Proof on file',
      value: latestPortalProof ? (latestPortalProof.status === 'approved' ? 'Approved proof live' : 'Live proof waiting') : latestInternalProof ? 'Internal proof only' : 'No proof yet',
      detail: latestPortalProof
        ? `${latestPortalProof.file_name || 'Latest proof'} • ${latestPortalProofLabel}`
        : latestInternalProof
          ? `${latestInternalProof.file_name || 'Draft proof'} is still internal-only`
          : 'CSR still needs a customer-safe proof before review can start.',
      tone: latestPortalProof ? (latestPortalProof.status === 'approved' ? 'green' : 'purple') : latestInternalProof ? 'amber' : 'gray',
    },
    {
      key: 'shareable',
      label: 'Shareable now',
      value: sharedPortalCount > 0 ? `${sharedPortalCount} live on portal` : 'Nothing customer-visible',
      detail: sharedPortalCount > 0
        ? `${archivedProofCount} archived / replaced • ${hiddenDraftProofs.length} internal draft${hiddenDraftProofs.length === 1 ? '' : 's'}`
        : hiddenDraftProofs.length > 0
          ? `${hiddenDraftProofs.length} draft proof${hiddenDraftProofs.length === 1 ? '' : 's'} exist but are still private`
          : 'Only the shell and thread can be shared right now.',
      tone: sharedPortalCount > 0 ? 'blue' : hiddenDraftProofs.length > 0 ? 'amber' : 'gray',
    },
    {
      key: 'customer-action',
      label: 'Customer action',
      value: customerAction.required ? customerAction.label : 'No action open',
      detail: customerAction.required ? customerAction.description : portalNextAction,
      tone: customerAction.required ? (customerAction.tone === 'orange' ? 'orange' : customerAction.tone === 'blue' ? 'purple' : 'amber') : 'green',
    },
    {
      key: 'last-touch',
      label: 'Last customer-visible touch',
      value: lastTouchValue,
      detail: lastTouchDetail,
      tone: lastCustomerTouch ? 'blue' : 'red',
    },
    {
      key: 'follow-up',
      label: 'Next promised follow-up',
      value: followUpState.summary || 'Not captured yet',
      detail: followUpState.displayAt ? (followUpOwnerLabel ? `Owner: ${followUpOwnerLabel}. ${followUpState.helperText}` : followUpState.helperText) : followUpState.disciplineHint,
      tone:
        followUpState.displayStatus === 'overdue'
          ? 'red'
          : followUpState.displayStatus === 'today'
            ? 'orange'
            : followUpState.displayStatus === 'cleared'
              ? 'green'
              : followUpState.displayStatus === 'scheduled'
                ? 'blue'
                : 'amber',
    },
    {
      key: 'follow-up-timing',
      label: followUpState.displayLabel,
      value: followUpState.displayValue,
      detail: followUpState.displayAt ? followUpState.helperText : followUpState.disciplineHint,
      tone:
        followUpState.displayStatus === 'overdue'
          ? 'red'
          : followUpState.displayStatus === 'today'
            ? 'orange'
            : followUpState.displayStatus === 'scheduled'
              ? 'blue'
              : followUpState.displayStatus === 'cleared'
                ? 'green'
                : 'amber',
    },
  ];

  type BlockerDisplay = {
    key: string;
    id?: string;
    tone: string;
    label: string;
    detail: string;
    nextStep: string;
    job_item_id?: string | null;
    source: 'explicit' | 'system';
    blocking: boolean;
    severity: 'block' | 'hold' | 'warn';
    blocker_type?: string;
  };

  const blockerMeta: Record<string, { label: string; tone: string; nextStep: string }> = {
    artwork: { label: 'Waiting on artwork', tone: 'orange', nextStep: 'Collect final art/copy before release.' },
    proof: { label: 'Proof approval required', tone: 'purple', nextStep: 'Get approval or a clean revision note.' },
    customer: { label: 'Customer action required', tone: 'amber', nextStep: 'Collect the requested customer response.' },
    spec: { label: 'Specs incomplete', tone: 'gray', nextStep: 'Fill the missing specs or build items before release.' },
    payment: { label: 'Payment/PO required', tone: 'red', nextStep: 'Collect payment/PO before releasing to production.' },
    inventory: { label: 'Paper/stock not secured', tone: 'red', nextStep: 'Confirm stock/PO before scheduling press time.' },
    scheduling: { label: 'Scheduling hold', tone: 'amber', nextStep: 'Re-sequence or confirm the production slot.' },
    other: { label: 'Hold', tone: 'gray', nextStep: 'Resolve the noted issue before releasing.' },
  } as const;

  const openExplicitBlockers = (blockers || []).filter((b: any) => b.status === 'open');
  const explicitBlockers: BlockerDisplay[] = openExplicitBlockers.map((b: any) => {
    const meta = blockerMeta[b.blocker_type as keyof typeof blockerMeta] || blockerMeta.other;
    const itemLabel = b.job_item_id ? items.find((i: any) => i.id === b.job_item_id)?.description : null;
    const severityTone = b.severity === 'warn' ? 'blue' : b.severity === 'hold' ? 'amber' : meta.tone;
    return {
      key: `explicit-${b.id}`,
      tone: severityTone,
      label: itemLabel ? `${meta.label} (${itemLabel})` : meta.label,
      detail: itemLabel ? `${b.reason} — Item: ${itemLabel}` : b.reason,
      nextStep: b.next_step || meta.nextStep,
      job_item_id: b.job_item_id,
      source: 'explicit',
      blocking: b.severity !== 'warn',
      severity: b.severity,
      blocker_type: b.blocker_type,
      id: b.id,
    };
  });

  const hasExplicit = (type: string, itemId?: string | null) =>
    openExplicitBlockers.some((b: any) => b.blocker_type === type && (itemId ? b.job_item_id === itemId : true));

  const systemBlockers: BlockerDisplay[] = [];

  awaitingArtworkItems.forEach((item: any) => {
    if (!hasExplicit('artwork', item.id)) {
      systemBlockers.push({
        key: `artwork-${item.id}`,
        tone: 'orange',
        label: `Waiting on artwork (${item.description || 'Item'})`,
        detail: `${item.description || 'Item'} still needs files or copy before release.`,
        nextStep: 'Collect files before releasing this item.',
        job_item_id: item.id,
        source: 'system',
        blocking: true,
        severity: 'block',
        blocker_type: 'artwork',
      });
    }
  });

  if (customerAction.required && !hasExplicit(customerActionType === 'approve_proof' ? 'proof' : 'customer', null)) {
    systemBlockers.push({
      key: 'customer-action',
      tone: customerAction.tone === 'orange' ? 'orange' : customerAction.tone === 'blue' ? 'purple' : 'amber',
      label: customerAction.label,
      detail: customerAction.description,
      nextStep: customerActionType === 'approve_proof' ? 'Wait for approval or capture a clean revision request.' : 'Customer must respond in the thread before release.',
      job_item_id: null,
      source: 'system',
      blocking: true,
      severity: 'block',
      blocker_type: customerActionType === 'approve_proof' ? 'proof' : 'customer',
    });
  }

  if (items.length === 0 && !hasExplicit('spec')) {
    systemBlockers.push({
      key: 'no-items',
      tone: 'gray',
      label: 'No production items built',
      detail: 'This job has no line items yet, so the floor has nothing concrete to run.',
      nextStep: 'Add at least one production item with qty and workflow steps.',
      job_item_id: null,
      source: 'system',
      blocking: true,
      severity: 'block',
      blocker_type: 'spec',
    });
  }

  if (portalVisibility === 'proof_live' && !!latestPortalProof && latestPortalProof.status !== 'approved' && !hasExplicit('proof', latestPortalProof.job_item_id || null)) {
    systemBlockers.push({
      key: 'proof-pending',
      tone: 'purple',
      label: 'Proof live but not approved',
      detail: 'Customer can see the proof, but production release is still waiting on an approval or revision note.',
      nextStep: 'Hold release until the live proof is approved or replaced.',
      job_item_id: latestPortalProof.job_item_id,
      source: 'system',
      blocking: true,
      severity: 'block',
      blocker_type: 'proof',
    });
  }

  if (dueRisk === 'late' && !hasExplicit('scheduling')) {
    systemBlockers.push({
      key: 'late',
      tone: 'red',
      label: 'Past due',
      detail: 'The due date has already passed, so this job needs operator attention even if nothing else is blocked.',
      nextStep: 'Re-sequence the work or reset expectations now.',
      job_item_id: null,
      source: 'system',
      blocking: false,
      severity: 'warn',
      blocker_type: 'scheduling',
    });
  } else if (dueRisk === 'today' && !hasExplicit('scheduling')) {
    systemBlockers.push({
      key: 'due-today',
      tone: 'amber',
      label: 'Due today',
      detail: 'This job ships today, so any missing customer action is now a same-day release risk.',
      nextStep: 'Resolve open dependencies before the floor burns time on it.',
      job_item_id: null,
      source: 'system',
      blocking: false,
      severity: 'warn',
      blocker_type: 'scheduling',
    });
  }

  const combinedBlockers: BlockerDisplay[] = [...explicitBlockers, ...systemBlockers];
  const blockersForScope = (itemId?: string, includeWarnings = false) => combinedBlockers.filter((b) => (!itemId || b.job_item_id === itemId || !b.job_item_id) && (includeWarnings || b.blocking));

  const releaseChecklist = [
    {
      key: 'items',
      label: 'Production items defined',
      done: items.length > 0,
      note: items.length > 0 ? `${items.length} line item${items.length === 1 ? '' : 's'} ready.` : 'No line items yet.',
    },
    {
      key: 'art',
      label: 'Artwork dependency cleared',
      done: awaitingArtworkItems.length === 0 && blockersForScope(undefined).every((b) => b.blocker_type !== 'artwork'),
      note: awaitingArtworkItems.length === 0 ? 'No items are flagged waiting on art.' : `${awaitingArtworkItems.length} item${awaitingArtworkItems.length === 1 ? '' : 's'} still waiting on art.`,
    },
    {
      key: 'approval',
      label: 'Customer approval cleared',
      done: !customerAction.required && !(portalVisibility === 'proof_live' && latestPortalProof?.status !== 'approved'),
      note: !customerAction.required && !(portalVisibility === 'proof_live' && latestPortalProof?.status !== 'approved') ? 'No open customer approval gate.' : 'Customer action is still open.',
    },
    {
      key: 'blockers',
      label: 'Blockers / holds cleared',
      done: blockersForScope(undefined).length === 0,
      note: blockersForScope(undefined).length === 0 ? 'No open blockers or holds.' : `${blockersForScope(undefined).length} open blocker${blockersForScope(undefined).length === 1 ? '' : 's'} remain.`,
    },
  ];
  const releaseBlocked = releaseChecklist.some((item) => !item.done);
  const primaryBlocker = blockersForScope(undefined, true)[0];
  const releaseGate = releaseBlocked
    ? {
        label: 'Production release blocked',
        tone: 'red',
        detail: primaryBlocker?.detail || 'There is still an unresolved dependency before this should be released to production.',
        nextStep: primaryBlocker?.nextStep || 'Clear the open dependency first.',
      }
    : {
        label: 'Production release clear',
        tone: 'green',
        detail: 'No open art, approval, or blocking hold is visible on this job.',
        nextStep: 'Safe to move the job forward on the shop side.',
      };
  const jobBlockers = blockersForScope(undefined, true);
  const blockingReasonsForItem = (itemId?: string, includeWarnings = false) => blockersForScope(itemId, includeWarnings);
  const isReleaseBlockedForItem = (itemId?: string) => blockersForScope(itemId).length > 0;
  const customerMessages = messages.filter((m: any) => m.is_customer_visible !== false);
  const visibleMessages = isStaff ? messages : customerMessages;
  const customerTimeline = useMemo(() => {
    const proofEvents = portalSharedAssets.map((asset: any) => {
      const linkedItem = asset.job_item_id ? items.find((item: any) => item.id === asset.job_item_id) : null;
      const stateLabel = asset.status === 'approved' ? 'Proof approved' : 'Proof shared';
      const detailBits = [
        linkedItem ? linkedItem.description : 'Job-wide proof',
        asset.file_name,
      ].filter(Boolean);
      return {
        id: `asset-${asset.id}`,
        occurredAt: asset.portal_shared_at || asset.created_at,
        title: stateLabel,
        detail: detailBits.join(' • '),
        tone: asset.status === 'approved' ? 'green' : 'purple',
      };
    });

    const messageEvents = customerMessages.map((msg: any) => ({
      id: `message-${msg.id}`,
      occurredAt: msg.created_at,
      title: msg.user_id === user?.id ? 'You replied' : 'PrintHQ replied',
      detail: msg.content,
      tone: msg.user_id === user?.id ? 'gray' : 'blue',
    }));

    const actionEvents: any[] = [];
    if (customerActionRequired && customerActionType) {
      actionEvents.push({
        id: `action-${customerActionType}-${job.updated_at || job.created_at}`,
        occurredAt: job.updated_at || job.created_at,
        title: customerActionType === 'upload_artwork' ? 'Artwork requested' : customerActionType === 'approve_proof' ? 'Approval requested' : 'Customer action requested',
        detail: customerAction.description,
        tone: customerActionType === 'upload_artwork' ? 'orange' : 'amber',
      });
    }

    return [...proofEvents, ...messageEvents, ...actionEvents]
      .filter((event) => event.occurredAt)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 8);
  }, [portalSharedAssets, items, customerMessages, user?.id, customerActionRequired, customerActionType, customerAction.description, job.updated_at, job.created_at]);

  if (!isStaff) {
    const sharedProofs = portalSharedAssets;

    return (
      <CustomerPortalShell
        title={job.title}
        description="Job-safe view: progress, shared proofs/files, line items, and the conversation thread. Internal production controls stay hidden."
        activeHref="/dashboard/jobs"
        backHref="/dashboard/jobs"
        backLabel="All jobs"
        eyebrow="Job workspace"
        meta={
          <>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black uppercase text-gray-600">{job.status || 'In Progress'}</span>
            <span>#{jobId.substring(0, 8).toUpperCase()}</span>
          </>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className={`rounded-3xl border p-5 shadow-sm ${portalState.panelClass}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Portal status</p>
                  <h2 className="mt-1 text-xl font-black text-gray-900">{portalState.label}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-gray-700">{portalState.description}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${portalState.badgeClass}`}>{portalState.label}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Your next step</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{portalNextAction}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">What stays private</p>
                  <p className="mt-2 text-sm text-gray-700">Internal shop notes, source files, and staff-only workflow details never appear in this view.</p>
                </div>
              </div>
            </div>

            {customerAction.required ? (
              <div className={`rounded-3xl border p-5 shadow-sm ${customerAction.tone === 'orange' ? 'border-orange-200 bg-orange-50' : customerAction.tone === 'blue' ? 'border-purple-200 bg-purple-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Action required</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">{customerAction.label}</h2>
                <p className="mt-2 text-sm text-gray-700">{customerAction.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600">
                  <span className="rounded-full border border-white/80 bg-white px-3 py-1">Replies stay attached to this job</span>
                  <span className="rounded-full border border-white/80 bg-white px-3 py-1">You will only see customer-safe updates</span>
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Overview</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Status</p>
                  <p className="mt-2 text-lg font-black text-gray-900">{job.status || 'In Progress'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Items</p>
                  <p className="mt-2 text-lg font-black text-gray-900">{items.length}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Total qty</p>
                  <p className="mt-2 text-lg font-black text-gray-900">{(itemAggregate.totalQty || job.quantity || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1">Brand {job.orders?.brand || 'PrintHQ'}</span>
                {job.due_date ? <span className="rounded-full border border-gray-200 bg-white px-3 py-1">Due {new Date(job.due_date).toLocaleDateString()}</span> : null}
                {job.profiles?.email ? <span className="rounded-full border border-gray-200 bg-white px-3 py-1">Customer {job.profiles.email}</span> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">What you can do here</p>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="rounded-2xl bg-gray-50 p-4">Open a proof or shared file and confirm approval when it looks right.</div>
                <div className="rounded-2xl bg-gray-50 p-4">Reply in the job thread so every update stays attached to this order.</div>
                <div className="rounded-2xl bg-gray-50 p-4">See line items and customer-safe production status without the shop’s internal notes.</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Line items</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">What’s in this job</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">{items.length} items</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-400 md:col-span-2 xl:col-span-3">No line items added yet.</div> : items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-gray-900">{item.description}</p>
                      <p className="mt-1 text-[11px] uppercase text-gray-500">Qty {item.quantity?.toLocaleString() || 0}</p>
                    </div>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">{item.status || 'Pending'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                    {item.size ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">{item.size}</span> : null}
                    {item.paper_stock ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">{item.paper_stock}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Timeline</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">Proofs, requests, and replies</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">{customerTimeline.length} events</span>
            </div>
            <div className="mt-5 space-y-3">
              {customerTimeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-400">No customer-facing activity yet.</div>
              ) : customerTimeline.map((event) => (
                <div key={event.id} className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full ${event.tone === 'green' ? 'bg-green-500' : event.tone === 'purple' ? 'bg-purple-500' : event.tone === 'orange' ? 'bg-orange-500' : event.tone === 'blue' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900">{event.title}</p>
                      <span className="text-[11px] text-gray-400">{new Date(event.occurredAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Shared files</p>
                  <h2 className="mt-1 text-xl font-black text-gray-900">Proofs and downloads</h2>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">{sharedProofs.length}</span>
              </div>

              <div className="mt-5 space-y-3">
                {sharedProofs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-400">No shared proofs yet.</div>
                ) : (
                  sharedProofs.map((asset) => (
                    <button key={asset.id} type="button" onClick={() => loadPreview(asset)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${viewingAssetId === asset.id ? 'border-black bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{asset.file_name}</p>
                        <p className="mt-1 text-[11px] text-gray-500">{new Date(asset.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${asset.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {asset.status === 'approved' ? 'Approved' : 'Proof'}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {previewUrl ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{currentAsset?.file_name}</p>
                      <p className="text-[11px] text-gray-500">{currentAsset?.status === 'approved' ? 'Approved proof' : 'Shared proof'}</p>
                    </div>
                    {previewUrl ? <a href={previewUrl} target="_blank" className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black">Open file</a> : null}
                  </div>
                  <div className="flex min-h-[420px] items-center justify-center p-4">
                    {previewType === 'image' ? <img src={previewUrl} className="max-h-[540px] max-w-full rounded-2xl bg-white shadow-sm" /> : <iframe src={`${previewUrl}#toolbar=0`} className="h-[540px] w-full rounded-2xl bg-white" />}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Messages</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">Job conversation</h2>
              </div>
              <div className="max-h-[620px] overflow-y-auto px-6 py-5 space-y-3">
                {customerMessages.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-400">No messages yet.</div> : customerMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.user_id === user?.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {msg.content}
                    </div>
                    <span className="mt-1 text-[11px] text-gray-400">{msg.profiles?.email?.split('@')[0] || 'PrintHQ'}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t border-gray-100 bg-gray-50 p-4">
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-black focus:outline-none" placeholder="Reply on this job..." />
                  <button onClick={handleSendMessage} className="inline-flex items-center justify-center rounded-2xl bg-black px-4 text-white hover:bg-gray-800"><Send size={16} /></button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </CustomerPortalShell>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      
      {isStaff && showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">Send New Proof</h3>
                    <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className={`rounded-2xl border p-4 ${portalState.panelClass}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Share to portal</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{proofItemId ? `This proof will go live for ${items.find(i => i.id === proofItemId)?.description || 'this item'}.` : 'This proof will go live on the customer job shell.'}</p>
                                <p className="mt-2 text-xs text-gray-600">Source files and internal notes stay private. If a pending proof is already live for this scope, it will be replaced automatically.</p>
                                <p className="mt-2 text-xs font-semibold text-gray-700">Customer next action: {proofItemId ? 'Review this proof inside the same job thread and respond without leaving the portal.' : portalNextAction}</p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${portalState.badgeClass}`}>{portalState.label}</span>
                        </div>
                    </div>
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <UploadCloud className={`mx-auto h-10 w-10 mb-2 ${uploadFile ? 'text-green-600' : 'text-gray-400'}`} />
                        {uploadFile ? <p className="font-bold text-green-700 text-sm truncate">{uploadFile.name}</p> : <p className="text-sm font-bold text-gray-600">Click to Select File</p>}
                        <p className="mt-1 text-[11px] text-gray-500">Upload a new PDF/JPG here, or pick a stored draft below.</p>
                    </div>
                    {hiddenDraftProofs.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Or share an existing draft</label>
                        <select
                          value={selectedDraftProofId}
                          onChange={(e) => setSelectedDraftProofId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                        >
                          <option value="">-- Keep using the uploaded file --</option>
                          {hiddenDraftProofs.map((draft) => (
                            <option key={draft.id} value={draft.id}>
                              {draft.file_name} • {new Date(draft.created_at).toLocaleDateString()}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[11px] text-gray-500">Selecting a draft flips it to portal-visible and archives other pending proofs for this scope.</p>
                      </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Message to Customer</label>
                        <textarea value={uploadMessage} onChange={(e) => setUploadMessage(e.target.value)} placeholder="e.g. Please review version 2 for copy and phone number placement." className="w-full border border-gray-300 rounded-lg p-3 text-sm h-20 resize-none"/>
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
                    <button onClick={handleSubmitProof} disabled={(!uploadFile && !selectedDraftProofId) || isUploading} className={`w-full py-3 rounded-xl font-bold text-white transition-all ${(!uploadFile && !selectedDraftProofId) || isUploading ? 'bg-gray-300' : 'bg-black hover:bg-gray-800'}`}>
                        {isUploading ? 'Sharing...' : 'Share Proof to Portal'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Link href={isStaff ? "/dashboard" : "/dashboard/messages"} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={20} /></Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">{job.title}</h1>
                <p className="text-xs font-mono text-gray-400 mt-1">#{jobId.substring(0,8).toUpperCase()} • {job.orders?.brand}</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
            {isStaff ? (
              <Link href={`/dashboard/invoices/new?jobId=${jobId}`} className="px-4 py-1.5 bg-emerald-600 text-white rounded-md font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"><FilePlus size={14}/> Generate Invoice</Link>
            ) : (
              <div className="hidden sm:flex gap-2">
                <Link href="/dashboard" className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:border-gray-300 hover:text-black">Home</Link>
                <Link href="/dashboard/messages" className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:border-gray-300 hover:text-black">Messages</Link>
              </div>
            )}
            <div className={`px-4 py-1.5 rounded-md text-white font-bold uppercase text-[10px] flex items-center bg-gray-900 border border-gray-700`}>{job.status || 'Pending'}</div>
          </div>
        </div>
      </div>

       {/* STAGE COMMANDER / CSR MODE */}
      {isCSRMode ? (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1920px] mx-auto px-4 py-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Customer action</p>
                <p className="mt-2 text-lg font-black text-gray-900">{customerAction.required ? customerAction.label : 'No action open'}</p>
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{customerAction.required ? customerAction.description : portalNextAction}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${releaseGate.tone === 'red' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Release</p>
                <p className={`mt-2 text-lg font-black ${releaseGate.tone === 'red' ? 'text-red-900' : 'text-green-900'}`}>{releaseGate.label}</p>
                <p className="mt-1 text-xs text-gray-700 line-clamp-2">Next: {releaseGate.nextStep}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Portal / proof</p>
                <p className="mt-2 text-lg font-black text-gray-900">{portalState.label}</p>
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{portalState.description}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Due</p>
                <p className="mt-2 text-lg font-black text-gray-900">{countdown.text}</p>
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">Last touch: {lastTouchValue}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openUploadModal()} className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:bg-gray-800"><UploadCloud size={14}/> Share proof</button>
              <button onClick={() => setCustomerAction('upload_artwork', customerActionNote || 'Please upload artwork or copy to proceed.')} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-800 hover:border-orange-300"><Paperclip size={14}/> Request files</button>
              <button onClick={() => { setRightTab('chat'); const el = document.getElementById('csr-message-box') as HTMLInputElement | null; el?.focus(); }} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-800 hover:border-blue-300"><MessageSquare size={14}/> Message customer</button>
              <button onClick={() => setAdvancedOpen(!advancedOpen)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 hover:border-black">{advancedOpen ? 'Hide ops console' : 'Open ops console'}</button>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Line items</p>
                  <p className="text-sm text-gray-700">Visible to CSR</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-700">{items.length} items</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {items.length === 0 ? (
                  <span className="text-xs text-gray-500 italic">No line items yet.</span>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 min-w-[180px]">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-600">
                        <span className="rounded-full bg-white px-2 py-0.5 border border-gray-200">Qty {item.quantity?.toLocaleString() || 0}</span>
                        <span className={`rounded-full px-2 py-0.5 border text-[9px] font-black uppercase tracking-[0.18em] ${item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{item.status || 'Pending'}</span>
                        {(item.waitingOnArt || item.artwork_status === 'Waiting on Art' || item.artworkStatus === 'Waiting on Art') && (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 border border-orange-200 text-[9px] font-black uppercase tracking-[0.18em] text-orange-800">Waiting on art</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : isStaff ? (
       <div className="bg-gray-900 text-white shadow-xl">
          <div className="max-w-[1920px] mx-auto px-4 py-4 lg:py-5">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1.1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">Current status</p>
                <p className="mt-2 text-2xl font-black uppercase tracking-tight">{job.status || 'PREPRESS'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">Due</p>
                <p className="mt-2 text-xl font-black uppercase tracking-tight">{countdown.text}</p>
                <p className="mt-1 text-xs text-gray-300">{job.due_date ? new Date(job.due_date).toLocaleDateString() : 'No due date set'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">Release gate</p>
                <p className="mt-2 text-xl font-black uppercase tracking-tight">{releaseBlocked ? 'Blocked' : 'Clear'}</p>
                <p className="mt-1 text-xs text-gray-300">{releaseGate.nextStep}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Megaphone size={14} className="text-gray-300" />
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">Shift handoff</p>
                </div>
                <p className="mt-2 line-clamp-3 text-sm font-semibold leading-snug text-white/95">{job.notes || 'No handoff note yet. Capture the risk, promise, or next move below.'}</p>
              </div>
            </div>
          </div>
      </div>
      ) : (
        <div className="bg-gray-900 text-white shadow-xl">
          <div className="max-w-[1920px] mx-auto px-6 py-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase opacity-70 tracking-widest">Job status</p>
              <h2 className="text-3xl font-black tracking-tight">{job.status || 'In Progress'}</h2>
            </div>
            <p className="max-w-xl text-sm text-gray-300">Customer view only: progress, proofs, files we have shared, and your message thread. Internal production notes stay hidden.</p>
          </div>
        </div>
      )}

      <div className="max-w-[1920px] mx-auto w-full px-4 mt-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[11px] font-black uppercase text-gray-400">Order & Items</p>
              <p className="text-sm text-gray-700">Order #{job.order_id?.substring(0, 8) || jobId.substring(0, 8)} • {items.length} line items</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-black">Total Qty {(itemAggregate.totalQty || job.quantity || 0).toLocaleString()}</span>
              {Object.entries(itemAggregate.counts).map(([status, count]) => (
                <span key={status} className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600 capitalize">{status}: {count}</span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.length === 0 && <div className="text-sm text-gray-400 italic">No items added yet.</div>}
            {items.map((item) => (
              <div key={item.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.description}</p>
                    <p className="text-[11px] text-gray-500 uppercase">Qty {item.quantity?.toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {item.status || 'Pending'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
                  {item.size && <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">{item.size}</span>}
                  {item.paper_stock && <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 truncate">{item.paper_stock}</span>}
                  {(item.waitingOnArt || item.artwork_status === 'Waiting on Art' || item.artworkStatus === 'Waiting on Art') && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 font-black uppercase tracking-wider">Waiting on art</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showAdvancedOps && (<>
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Proof / file handoff</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">What CSR can safely tell the customer</h2>
              </div>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-700">Portal {portalState.label}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {proofWorkflowCards.map((card) => (
                <div
                  key={card.key}
                  className={`rounded-2xl border px-4 py-4 ${card.tone === 'green' ? 'border-green-200 bg-green-50 text-green-900' : card.tone === 'purple' ? 'border-purple-200 bg-purple-50 text-purple-900' : card.tone === 'orange' ? 'border-orange-200 bg-orange-50 text-orange-900' : card.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' : card.tone === 'red' ? 'border-red-200 bg-red-50 text-red-900' : card.tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{card.label}</p>
                  <p className="mt-2 text-sm font-bold leading-snug">{card.value}</p>
                  <p className="mt-2 text-xs opacity-80">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 shadow-sm ${releaseGate.tone === 'red' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Production release gate</p>
                <h2 className={`mt-1 text-xl font-black ${releaseGate.tone === 'red' ? 'text-red-900' : 'text-green-900'}`}>{releaseGate.label}</h2>
                <p className={`mt-2 text-sm ${releaseGate.tone === 'red' ? 'text-red-800' : 'text-green-800'}`}>{releaseGate.detail}</p>
                <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.18em] ${releaseGate.tone === 'red' ? 'text-red-700' : 'text-green-700'}`}>Next move: {releaseGate.nextStep}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${releaseGate.tone === 'red' ? 'border-red-200 bg-white text-red-700' : 'border-green-200 bg-white text-green-700'}`}>{releaseBlocked ? 'Blocked' : 'Clear'}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {releaseChecklist.map((item) => (
                <div key={item.key} className={`rounded-2xl border px-3 py-3 ${item.done ? 'border-green-200 bg-white text-green-800' : 'border-red-200 bg-white text-red-800'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]">{item.done ? 'Clear' : 'Open gate'}</p>
                  <p className="mt-1 text-sm font-bold">{item.label}</p>
                  <p className="mt-1 text-xs opacity-80">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <OpsDisclosure
            title="Blockers, holds, and release reasons"
            eyebrow="Advanced ops"
            description={`${jobBlockers.length} active blocker${jobBlockers.length === 1 ? '' : 's'} tracked across art, approval, and scheduling.`}
            defaultOpen={jobBlockers.length > 0}
          >
            {isStaff && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-5">
                  <select value={blockerType} onChange={(e) => setBlockerType(e.target.value as any)} className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                    <option value="artwork">Waiting on artwork</option>
                    <option value="proof">Proof approval</option>
                    <option value="customer">Customer action</option>
                    <option value="spec">Specs / build missing</option>
                    <option value="payment">Payment / PO</option>
                    <option value="inventory">Paper / stock</option>
                    <option value="scheduling">Scheduling hold</option>
                    <option value="other">Other hold</option>
                  </select>
                  <select value={blockerSeverity} onChange={(e) => setBlockerSeverity(e.target.value as any)} className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                    <option value="block">Block</option>
                    <option value="hold">Hold</option>
                    <option value="warn">Warn</option>
                  </select>
                  <select value={blockerItemId || ''} onChange={(e) => setBlockerItemId(e.target.value ? e.target.value : null)} className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                    <option value="">Job-wide</option>
                    {items.map((it: any) => (
                      <option key={it.id} value={it.id}>Item: {it.description}</option>
                    ))}
                  </select>
                  <input value={blockerReason} onChange={(e) => setBlockerReason(e.target.value)} placeholder="Reason / what's blocked" className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-[11px]" />
                  <input value={blockerNextStep} onChange={(e) => setBlockerNextStep(e.target.value)} placeholder="Next step to clear" className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-[11px]" />
                </div>
                <div className="flex justify-end">
                  <button onClick={handleCreateBlocker} className="inline-flex items-center gap-2 rounded border border-gray-300 bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm hover:bg-gray-800">Add blocker / hold</button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {jobBlockers.length === 0 ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
                  No active blocker detected from art, approval, portal handoff, or missing line-item setup.
                </div>
              ) : jobBlockers.map((blocker) => {
                const linkedItem = blocker.job_item_id ? items.find((i: any) => i.id === blocker.job_item_id) : null;
                const blockerId = blocker.source === 'explicit' ? (blocker.id || blocker.key.replace('explicit-', '')) : null;
                return (
                <div key={blocker.key} className={`rounded-2xl border px-4 py-4 ${blocker.tone === 'red' ? 'border-red-200 bg-red-50 text-red-900' : blocker.tone === 'orange' ? 'border-orange-200 bg-orange-50 text-orange-900' : blocker.tone === 'purple' ? 'border-purple-200 bg-purple-50 text-purple-900' : blocker.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' : blocker.tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-900'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em]">{blocker.blocking ? 'Blocker reason' : 'Waiting / Warning'}</p>
                      {blocker.source === 'explicit' ? (
                        <span className="text-[9px] rounded-full border border-gray-300 bg-white px-2 py-0.5 font-black uppercase tracking-[0.18em] text-gray-700">Recorded</span>
                      ) : (
                        <span className="text-[9px] rounded-full border border-gray-300 bg-white px-2 py-0.5 font-black uppercase tracking-[0.18em] text-gray-500">System</span>
                      )}
                      {blocker.blocking ? (
                        <span className="text-[9px] rounded-full border border-red-200 bg-white px-2 py-0.5 font-black uppercase tracking-[0.18em] text-red-700">Blocking</span>
                      ) : (
                        <span className="text-[9px] rounded-full border border-amber-200 bg-white px-2 py-0.5 font-black uppercase tracking-[0.18em] text-amber-700">Waiting</span>
                      )}
                      {linkedItem && <span className="text-[9px] rounded-full border border-blue-200 bg-white px-2 py-0.5 font-black uppercase tracking-[0.18em] text-blue-700">Item: {linkedItem.description}</span>}
                    </div>
                    {isStaff && blockerId && (
                      <button onClick={() => resolveBlocker(blockerId)} className="text-[10px] font-black uppercase tracking-[0.18em] rounded-full border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:border-black">Resolve</button>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold">{blocker.label}</p>
                  <p className="mt-2 text-sm opacity-90">{blocker.detail}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">What must happen: {blocker.nextStep}</p>
                </div>
              );})}
            </div>
          </OpsDisclosure>
        </div>

        <OpsDisclosure
          title="Portal handoff controls"
          eyebrow="Advanced ops"
          description={`${portalState.label}. Use this when CSR needs to change what the customer can see.`}
          defaultOpen={customerAction.required || isPortalHidden}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Portal handoff</p>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${portalState.badgeClass}`}>{portalState.label}</span>
              </div>
              <p className="max-w-3xl text-sm text-gray-700">{portalState.description}</p>
              <p className="max-w-3xl text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">Customer next action: {portalNextAction}</p>
              {customerAction.required && (
                <div className={`rounded-xl border px-3 py-2 text-sm ${customerAction.tone === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-800' : customerAction.tone === 'blue' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]">Action live on portal</p>
                  <p className="font-semibold">{customerAction.label}</p>
                  <p className="text-xs opacity-80">{customerAction.description}</p>
                </div>
              )}
              {isStaff && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Customer action note (portal-visible)</label>
                  <textarea value={customerActionNote} onChange={(e) => setCustomerActionNote(e.target.value)} className="w-full rounded-lg border border-gray-200 p-2 text-sm" placeholder="What do you need from the customer?" />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setCustomerAction('upload_artwork', customerActionNote || 'Please upload artwork or copy to proceed.')} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-800 hover:border-orange-300">Request artwork</button>
                    <button onClick={() => setCustomerAction('approve_proof', customerActionNote || 'Review and approve the latest proof.')} className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-purple-800 hover:border-purple-300">Require proof approval</button>
                    <button onClick={clearCustomerAction} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-700 hover:border-black">Clear action</button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                <span className="rounded-full border border-white/70 bg-white px-3 py-1">Live proofs {sharedPortalCount}</span>
                <span className="rounded-full border border-white/70 bg-white px-3 py-1">Archived proofs {archivedProofCount}</span>
                <span className="rounded-full border border-white/70 bg-white px-3 py-1">Customer-visible steps {items.reduce((sum, item) => sum + ((item.job_item_steps || []).filter((step: any) => step.is_internal === false).length), 0)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={portalHref} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-700 hover:border-black hover:text-black">
                <ExternalLink size={14} /> Open Portal
              </a>
              <button
                type="button"
                onClick={setPortalShell}
                disabled={portalActionLoading}
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-700 hover:border-black hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Globe size={14} /> {isPortalShell ? 'Shell live' : 'Shell only'}
              </button>
              <button
                type="button"
                onClick={() => openUploadModal()}
                disabled={portalActionLoading}
                className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Globe size={14} /> {isPortalProofLive ? 'Replace portal proof' : 'Share proof to portal'}
              </button>
              <button
                type="button"
                onClick={isPortalHidden ? resetPortalInternal : hidePortalFromCustomer}
                disabled={portalActionLoading}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${isPortalHidden ? 'border-green-200 bg-green-50 text-green-700 hover:border-green-400' : 'border-red-200 bg-red-50 text-red-700 hover:border-red-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isPortalHidden ? 'Restore internal-only' : 'Hide from portal'}
              </button>
            </div>
          </div>
        </OpsDisclosure>
      </div>

        </>)}

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
                              disabled={!isStaff}
                              className="text-[10px] font-bold border rounded p-1 w-full bg-white focus:outline-none focus:border-black disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>
            </div>

             {isStaff ? (
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
            ) : null}
        </div>

        {/* MIDDLE COL: MAIN PRODUCTION HUB */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
             {isStaff && (
               <OpsDisclosure
                 title="Shift handoff note"
                 eyebrow="Internal only"
                 description="Capture the risk, promise, or exact next move for the next operator."
               >
                 <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-yellow-700"><Lock size={16}/> Global Job Notes / Handoff</div>
                      <button onClick={handleSaveNotes} disabled={isSaving} className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1.5 rounded hover:bg-yellow-500 flex items-center gap-2 shadow-sm uppercase tracking-wider"><Save size={12}/> Save Handoff Note</button>
                    </div>
                    <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Private production handoff: what changed, what is blocked, and what the next owner needs to do..." className="w-full h-24 bg-white border border-yellow-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"/>
                 </div>
               </OpsDisclosure>
             )}

             {isStaff && (
               <OpsDisclosure
                 title="Follow-up discipline"
                 eyebrow="Customer promise tracking"
                 description={`Current state: ${followUpState.badgeLabel}. Keep the next touchpoint explicit.`}
               >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-gray-900">Next promised touchpoint</h3>
                      <p className="mt-1 text-sm text-gray-600">Keep the next customer follow-up explicit: note, owner, and time.</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${followUpBadgeClass}`}>
                      {followUpState.badgeLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Follow-up note</label>
                      <textarea value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="e.g. Call with revised stock option / confirm ship method" className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-black focus:outline-none" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Follow-up time</label>
                        <input type="datetime-local" value={followUpAtInput} onChange={(e) => setFollowUpAtInput(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:border-black focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Owner</label>
                        <select value={followUpOwner || ''} onChange={(e) => setFollowUpOwner(e.target.value || null)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:border-black focus:outline-none">
                          <option value="">Unassigned</option>
                          {job.assigned_to ? <option value={job.assigned_to}>{ownerLabel(job.assigned_to)}</option> : null}
                          {staffOptions.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.first_name || s.email || 'Staff'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-gray-600">{followUpState.displayAt ? followUpState.helperText : followUpState.disciplineHint}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-700">
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold">
                      <Clock size={12} /> {followUpState.displayValue || 'No timing set'}
                    </span>
                    {followUpOwnerLabel ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold">
                        <User size={12} /> Owner: {followUpOwnerLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => handleSaveFollowUp('save')} className="rounded-full bg-black px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white hover:bg-gray-800">
                      Save follow-up
                    </button>
                    <button onClick={() => handleSaveFollowUp('done')} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wide text-gray-700 hover:border-black">
                      Mark done / clear
                    </button>
                  </div>
               </OpsDisclosure>
             )}

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
            onOpenProofModal={(itemId) => { if (!isStaff) return; openUploadModal(itemId); }}
            onLogActivity={logActivity}
            logs={logs}
            userRole={userRole}
            getBlockingReasons={blockingReasonsForItem}
            isReleaseBlocked={isReleaseBlockedForItem}
            staffOptions={staffOptions}
            currentUserId={user?.id}
          />

             <div className={`bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden min-h-[500px] relative ${isApprovedAsset ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {isApprovedAsset ? <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={12}/> PRODUCTION FILE</span> : <span className="text-xs font-bold uppercase text-gray-500">Preview Mode</span>}
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
            {showAdvancedOps ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-1/3">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center gap-2">
                     <div>
                       <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><History size={14}/> File Vault</h3>
                       <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">Live proofs, hidden drafts, and source files</p>
                     </div>
                     {isStaff && (
                       <div className="flex items-center gap-2">
                         <a href={portalHref} target="_blank" className="text-[10px] border border-gray-200 bg-white px-2 py-1 rounded font-bold text-gray-600 hover:border-black hover:text-black">Portal</a>
                         <button onClick={() => openUploadModal()} className="text-[10px] bg-black text-white px-2 py-1 rounded font-bold hover:bg-gray-800">+ New Proof</button>
                       </div>
                     )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {visibleAssets.map((asset) => {
                        const isCurrent = viewingAssetId === asset.id;
                        const linkedItem = asset.job_item_id ? items.find(i => i.id === asset.job_item_id) : null;
                        return (
                        <div key={asset.id} onClick={() => loadPreview(asset)} className={`p-2 rounded border cursor-pointer transition-all flex flex-col gap-2 group ${isCurrent ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                {asset.asset_type === 'source' ? <FileText size={16} className="text-gray-400"/> : <FileImage size={16} className="text-purple-500"/>}
                                <div><p className="text-xs font-bold text-gray-700 truncate w-32">{asset.file_name}</p><p className="text-[10px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</p></div>
                            </div>
                            <div className="flex flex-wrap gap-1 items-center">
                                {asset.asset_type === 'source' ? (
                                  <span className="text-[9px] font-bold bg-gray-100 text-gray-700 px-1.5 rounded border border-gray-200">SOURCE · INTERNAL ONLY</span>
                                ) : asset.status === 'archived' ? (
                                  <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 rounded border border-gray-200">REPLACED / ARCHIVED</span>
                                ) : asset.portal_visible === false ? (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 rounded border border-amber-200">PROOF EXISTS · NOT SHAREABLE YET</span>
                                ) : asset.status === 'approved' ? (
                                  <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 rounded flex items-center gap-1 border border-green-200">LIVE · APPROVED</span>
                                ) : (
                                  <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 rounded border border-purple-200">LIVE ON PORTAL · REVIEW OPEN</span>
                                )}
                                {linkedItem && <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 rounded flex items-center gap-1 border border-blue-200 truncate max-w-full">LINKED: {linkedItem.description}</span>}
                                {isStaff && asset.asset_type === 'proof' && asset.status !== 'archived' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleAssetPortalVisibility(asset.id, asset.portal_visible === false); }}
                                    className="text-[9px] font-bold px-2 py-1 rounded border border-gray-200 bg-white hover:border-black transition"
                                  >
                                    {asset.portal_visible === false ? 'Share to portal' : 'Hide from portal'}
                                  </button>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-1/3">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><History size={14}/> Proofs & files</h3>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">Portal visibility summary</p>
                  </div>
                  <button onClick={() => setAdvancedOpen(true)} className="text-[10px] border border-gray-200 bg-white px-2 py-1 rounded font-bold text-gray-600 hover:border-black hover:text-black">Open ops</button>
                </div>
                <div className="flex-1 p-4 text-sm text-gray-700 space-y-2">
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-700">
                    <span className="rounded-full bg-gray-100 px-3 py-1">Live proofs {sharedPortalCount}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">Archived {archivedProofCount}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">Internal drafts {hiddenDraftProofs.length}</span>
                  </div>
                  <p className="text-xs text-gray-500">Use the ops console to manage portal visibility, archives, and uploads.</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-2/3 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setRightTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'chat' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}><MessageSquare size={14}/> Discussion</button>
                    {isStaff && showAdvancedOps && <button onClick={() => setRightTab('activity')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${rightTab === 'activity' ? 'bg-white text-black border-b-2 border-black' : 'bg-gray-50 text-gray-400'}`}><Activity size={14}/> Activity Log</button>}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
                    {rightTab === 'chat' && (
                        <>
                            {visibleMessages.length === 0 && <div className="text-center text-gray-300 text-xs mt-4">No messages yet.</div>}
                            {visibleMessages.map((msg) => {
                              const internalHidden = msg.is_customer_visible === false;
                              return (
                                <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${msg.user_id === user?.id ? 'bg-black text-white' : internalHidden ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-gray-100 text-gray-800'}`}>
                                      {msg.content}
                                      {internalHidden && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Internal</span>}
                                    </div>
                                    <span className="text-[9px] text-gray-400 mt-0.5">{msg.profiles?.email?.split('@')[0]}</span>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                    {rightTab === 'activity' && showAdvancedOps && (
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
                    <div className="p-2 border-t border-gray-100 bg-gray-50 space-y-2">
                        {isStaff && (
                          <div className={`rounded-xl border px-3 py-2 text-[11px] ${messageInternal ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
                            <p className="font-black uppercase tracking-[0.18em]">{messageInternal ? 'Internal-only note' : 'Customer-visible reply'}</p>
                            <p className="mt-1 opacity-80">{messageInternal ? 'This stays inside the shop. Customer cannot see it in the portal or job thread preview.' : 'This posts to the job thread and is visible in the customer portal timeline.'}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                            <input id="csr-message-box" type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 rounded border border-gray-200 text-xs focus:outline-none focus:border-black" placeholder="Type here..." />
                            <button onClick={handleSendMessage} className="bg-black text-white p-2 rounded hover:bg-gray-800"><Send size={14} /></button>
                        </div>
                        {isStaff && (
                          <label className="flex items-center gap-2 text-[10px] text-gray-500 pl-1">
                            <input type="checkbox" checked={messageInternal} onChange={(e) => setMessageInternal(e.target.checked)} className="rounded border-gray-300" />
                            Internal note (hide from portal)
                          </label>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
