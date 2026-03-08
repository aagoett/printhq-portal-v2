'use client';

import { 
  X, MessageSquare, ListTodo, ArrowUp, ArrowDown, 
  CheckSquare, Globe, Lock, Trash2, FileImage, 
  UploadCloud, Plus, ThumbsUp, ExternalLink, Save 
} from 'lucide-react';
import { useState, useRef } from 'react';

// --- HELPER COMPONENT: ITEM DETAIL DRAWER ---
export default function ItemDetailDrawer({
  item,
  assets,
  workflowOptions,
  onClose,
  onUpdate,
  onUpload,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onMoveStep,
  onReorderSteps,
  onOpenProofModal,
  onLogActivity,
  onUpdateStepNote,
  getPublicUrl,
  logs,
  userRole
}: { 
  item: any, 
  assets: any[],
  workflowOptions: any[],
  onClose: () => void, 
  onUpdate: (id: string, data: any) => void,
  onUpload: (file: File, itemId: string) => Promise<void>,
  onAddStep: (itemId: string, stepName: string, isInternal: boolean) => void,
  onToggleStep: (stepId: string, currentStatus: string) => void,
  onUpdateStepNote?: (stepId: string, note: string) => Promise<void>,
  onDeleteStep: (stepId: string) => void,
  onMoveStep: (stepId: string, direction: 'up' | 'down') => void,
  onReorderSteps: (itemId: string, newSteps: any[]) => void,
  onOpenProofModal?: (itemId?: string) => void,
  getPublicUrl?: (path: string) => string,
  onLogActivity: (action: string, details: string, itemId?: string) => Promise<void>,
  logs: any[],
  userRole: string
}) {
  const [formData, setFormData] = useState({
    description: item.description || '',
    quantity: item.quantity || 0,
    paper_stock: item.paper_stock || '',
    size: item.size || '',
    ink_colors: item.ink_colors || '',
    internal_notes: item.internal_notes || '' 
  });
  
  const [selectedStep, setSelectedStep] = useState('');
  const [customStep, setCustomStep] = useState('');
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [isInternalStep, setIsInternalStep] = useState(true);
  const [itemNote, setItemNote] = useState('');
  const [isPostingItemNote, setIsPostingItemNote] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStepIds, setSavingStepIds] = useState<Set<string>>(new Set());
  const [savedStepIds, setSavedStepIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemAssets = assets.filter(a => a.job_item_id === item.id);
  const steps = item.job_item_steps?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [];

  const handleSaveStepNote = async (stepId: string) => {
    if (!onUpdateStepNote) return;
    setSavingStepIds(prev => new Set(prev).add(stepId));
    await onUpdateStepNote(stepId, stepNotes[stepId] ?? '');
    setSavingStepIds(prev => { const n = new Set(prev); n.delete(stepId); return n; });
    setSavedStepIds(prev => new Set(prev).add(stepId));
    setTimeout(() => setSavedStepIds(prev => { const n = new Set(prev); n.delete(stepId); return n; }), 2000);
  };

  // Controlled state for step notes so they save via the main Save button
  const [stepNotes, setStepNotes] = useState<Record<string, string>>(
    () => Object.fromEntries(steps.map((s: any) => [s.id, s.notes || '']))
  );

  const handleSave = async () => {
    setIsSaving(true);
    onUpdate(item.id, formData);
    // Save any changed step notes
    if (onUpdateStepNote) {
      const changed = steps.filter((s: any) => (stepNotes[s.id] ?? '') !== (s.notes || ''));
      await Promise.all(changed.map((s: any) => onUpdateStepNote!(s.id, stepNotes[s.id] ?? '')));
    }
    setIsSaving(false);
    onClose();
  };

  const handleAddStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalStepName = selectedStep === 'Custom' ? customStep : selectedStep;
    if (!finalStepName || finalStepName.trim() === '') return;

    onAddStep(item.id, finalStepName, isInternalStep);
    
    // Reset
    setSelectedStep('');
    setCustomStep('');
    setIsInternalStep(true);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedStepId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedStepId || draggedStepId === targetId) return;
    
    // We determine direction based on indices to reuse onMoveStep
    const dragIndex = steps.findIndex((s: any) => s.id === draggedStepId);
    const dropIndex = steps.findIndex((s: any) => s.id === targetId);
    
    if (dragIndex === -1 || dropIndex === -1) return;
    
    const newSteps = [...steps];
    const [movedStep] = newSteps.splice(dragIndex, 1);
    newSteps.splice(dropIndex, 0, movedStep);
    
    onReorderSteps(item.id, newSteps);
    setDraggedStepId(null);
  };

  const handlePostItemNote = async () => {
    if (!itemNote.trim()) return;
    setIsPostingItemNote(true);
    await onLogActivity('Item Update', itemNote, item.id);
    setItemNote('');
    setIsPostingItemNote(false);
  };

  const itemLogs = logs.filter(l => l.job_item_id === item.id || (l.details && l.details.includes(`ITEM:${item.id}`)));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      try {
        await onUpload(e.target.files[0], item.id);
      } catch (err) {
        alert("Upload failed.");
      }
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" />
      
      {/* The Drawer */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-gray-200 flex flex-col">
        <div className="flex justify-between items-start mb-6">
           <div>
             <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
             <p className="text-xs text-gray-400 font-mono uppercase">{item.id.split('-')[0]} • {item.description}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="space-y-6 flex-1">
            {/* Section 1: Basics */}
            <div className="space-y-4">
               <h3 className="text-xs font-bold uppercase text-gray-500 border-b pb-1">General Info</h3>
               <div>
                 <label className="block text-xs font-bold text-gray-700 mb-1">Description / Name</label>
                 <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded text-sm font-bold" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-700 mb-1">Flat Size</label>
                 <input placeholder="8.5 x 11" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} className="w-full border p-2 rounded text-sm font-bold" />
               </div>

               {/* PERSISTENT ITEM NOTES (Shows in Yellow Box on Main Screen) */}
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <Lock size={12} className="text-yellow-600"/> PERSISTENT ITEM NOTES (INTERNAL ONLY)
                  </label>
                  <textarea 
                    placeholder="This note stays visible on the production screen..."
                    value={formData.internal_notes} 
                    onChange={e => setFormData({...formData, internal_notes: e.target.value})} 
                    className="w-full border p-3 rounded-xl text-sm bg-yellow-50/30 border-yellow-100 focus:border-yellow-300 outline-none min-h-[60px]"
                  />
               </div>

               <div className="pt-2">
                 <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-2 uppercase tracking-widest">
                   <MessageSquare size={14}/> Log Quick Note
                 </label>
                 <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 shadow-inner">
                     <textarea
                       value={itemNote}
                       onChange={e => setItemNote(e.target.value)}
                       placeholder="Type a note to add to this item's history..."
                       className="w-full text-xs p-3 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[60px] shadow-sm"
                     />
                     <div className="flex justify-end mt-2">
                         <button
                           onClick={handlePostItemNote}
                           disabled={isPostingItemNote || !itemNote.trim()}
                           className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all uppercase tracking-widest shadow-md hover:shadow-blue-200"
                         >
                            {isPostingItemNote ? 'Posting...' : 'Post to History'}
                         </button>
                     </div>
                 </div>

                 {/* THREADED ITEM NOTES HISTORY */}
                 <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Item Activity History</h4>
                     {itemLogs.length > 0 ? (
                       itemLogs.map((log: any) => (
                         <div key={log.id} className="bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                             <div className="flex justify-between items-start mb-1">
                                 <span className={`text-[9px] font-black uppercase tracking-tighter ${log.action.includes('Proof') ? 'text-purple-500' : 'text-blue-500'}`}>{log.action}</span>
                                 <span className="text-[8px] text-gray-400 font-bold">{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                             </div>
                             <p className="text-[11px] text-gray-700 leading-tight">{log.details}</p>
                         </div>
                       ))
                     ) : (
                       <p className="text-[10px] text-gray-400 italic px-2">No history recorded yet.</p>
                     )}
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4 mt-2">
                 <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                     <input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                     <div className="p-2 bg-gray-100 rounded text-sm font-black text-gray-500 uppercase tracking-widest">{item.status}</div>
                 </div>
               </div>
            </div>

           {/* Section 2: Production Steps (LIVE QUEUE SELECTOR) */}
           <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-gray-500 border-b pb-1 flex items-center gap-2">
                <ListTodo size={14}/> Production Path
              </h3>
              
              <div className="space-y-2">
                 {steps.length === 0 && <p className="text-[11px] text-gray-400 italic">No steps defined. Add one below.</p>}
                 {steps.map((step: any, index: number) => {
                   const isDone = step.status === 'Completed';
                   const isInternal = step.is_internal !== false; 
                   const isDragged = draggedStepId === step.id;
                   return (
                      <div 
                        key={step.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, step.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, step.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${isDragged ? 'opacity-30' : ''} ${isDone ? 'bg-green-50 border-green-200' : isInternal ? 'bg-white border-gray-200 shadow-sm' : 'bg-blue-50 border-blue-200 shadow-sm'} group/step hover:border-black/20`}
                      >
                         <div className="flex flex-col gap-1">
                            <button onClick={() => onMoveStep(step.id, 'up')} disabled={index === 0} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-10 bg-gray-100/50 text-gray-600 transition-colors"><ArrowUp size={12} strokeWidth={3}/></button>
                            <button onClick={() => onMoveStep(step.id, 'down')} disabled={index === steps.length - 1} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-10 bg-gray-100/50 text-gray-600 transition-colors"><ArrowDown size={12} strokeWidth={3}/></button>
                         </div>
                         
                         <button 
                           onClick={() => onToggleStep(step.id, step.status)}
                           className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isDone ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-300 hover:border-black shadow-inner'}`}
                         >
                           {isDone && <CheckSquare size={14}/>}
                         </button>
                         
                         <div className="flex-1 flex flex-col gap-1.5">
                            <div className="flex flex-col">
                               <span className={`text-sm font-black tracking-tight ${isDone ? 'text-green-800 line-through opacity-70' : 'text-gray-900'}`}>
                                 {step.step_name}
                               </span>
                               <span className="text-[10px] flex items-center gap-1 text-gray-400 uppercase font-black tracking-widest mt-0.5">
                                  {isInternal ? <><Lock size={10}/> INTERNAL STAFF</> : <><Globe size={10} className="text-blue-500"/> CUSTOMER DASH</>}
                               </span>
                            </div>

                            {/* STEP SPECIFIC NOTES */}
                            {isDone ? (
                              stepNotes[step.id] ? (
                                <p className="text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-xl px-2.5 py-1.5 font-medium leading-snug">{stepNotes[step.id]}</p>
                              ) : null
                            ) : (
                              <div className="flex gap-1.5 items-start">
                                <textarea
                                  placeholder={`Add note for ${step.step_name}...`}
                                  value={stepNotes[step.id] ?? ''}
                                  onChange={(e) => setStepNotes(prev => ({ ...prev, [step.id]: e.target.value }))}
                                  className="flex-1 text-[11px] p-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 outline-none bg-gray-50/30 min-h-[50px] transition-all font-medium text-gray-700 resize-none"
                                />
                                <button
                                  onClick={() => handleSaveStepNote(step.id)}
                                  disabled={savingStepIds.has(step.id) || !(stepNotes[step.id] ?? '').trim()}
                                  className={`flex-shrink-0 mt-0.5 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-widest shadow-sm disabled:opacity-30 ${
                                    savedStepIds.has(step.id)
                                      ? 'bg-green-500 text-white'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {savingStepIds.has(step.id) ? '...' : savedStepIds.has(step.id) ? '✓' : 'Save'}
                                </button>
                              </div>
                            )}
                         </div>

                         <button onClick={() => onDeleteStep(step.id)} className="text-gray-300 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    );
                  })}
              </div>

              {/* Add Step Input - DYNAMIC SELECT */}
              <div className="pt-3 pb-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
                <form onSubmit={handleAddStepSubmit} className="flex flex-col gap-3">
                   <div className="flex gap-2">
                     <select 
                       value={selectedStep} 
                       onChange={e => setSelectedStep(e.target.value)}
                       className="flex-1 text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/5 bg-white font-bold"
                     >
                        <option value="">+ Add Next Step...</option>
                        {workflowOptions.map((queue) => (
                            <optgroup key={queue.queue_name} label={queue.queue_name}>
                                {queue.steps?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                        ))}
                        <option value="Custom">Custom / Other...</option>
                     </select>
                     <button type="submit" disabled={!selectedStep} className="bg-black text-white px-4 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-30">ADD</button>
                   </div>
                   
                   {/* Custom Input */}
                   {selectedStep === 'Custom' && (
                       <input 
                         placeholder="Type custom step name..."
                         value={customStep}
                         onChange={e => setCustomStep(e.target.value)}
                         className="w-full text-xs p-2 rounded border border-gray-300 focus:outline-none focus:border-black animate-in fade-in"
                         autoFocus
                       />
                   )}

                   {/* INTERNAL TOGGLE */}
                   <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div className={`w-3 h-3 border rounded flex items-center justify-center ${isInternalStep ? 'bg-gray-500 border-gray-600' : 'bg-white border-gray-300'}`}>
                         {isInternalStep && <CheckSquare size={10} className="text-white"/>}
                      </div>
                      <input type="checkbox" checked={isInternalStep} onChange={e => setIsInternalStep(e.target.checked)} className="hidden" />
                      <span className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1">
                        {isInternalStep ? <><Lock size={10}/> Internal Only (Hidden)</> : <><Globe size={10}/> Customer Can See</>}
                      </span>
                   </label>
                </form>
              </div>
           </div>

           {/* Section 3: Print Specs */}
           <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-gray-500 border-b pb-1">Specs</h3>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Paper Stock</label>
                <input placeholder="e.g. 100lb Gloss Cover" value={formData.paper_stock} onChange={e => setFormData({...formData, paper_stock: e.target.value})} className="w-full border p-2 rounded text-sm" />
              </div>
              <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ink / Colors</label>
                    <input placeholder="4/4, 4/0" value={formData.ink_colors} onChange={e => setFormData({...formData, ink_colors: e.target.value})} className="w-full border p-2 rounded text-sm" />
                </div>
              </div>
           </div>

           {/* Section 4: Item Specific Files */}
           <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-4 shadow-sm">
              <h3 className="text-xs font-black uppercase text-blue-800 mb-4 flex items-center justify-between tracking-widest">
                <span className="flex items-center gap-2"><FileImage size={14}/> Item Artwork & Proofs</span>
                <span className="text-[10px] bg-blue-200 px-2 py-0.5 rounded-full text-blue-900 font-bold">{itemAssets.length}</span>
              </h3>
              
              <div className="flex gap-3 mb-6">
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                    className="flex-1 text-[11px] bg-white border-2 border-blue-200 text-blue-700 px-4 py-2.5 rounded-xl hover:bg-blue-100 hover:border-blue-300 font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                     {isUploading ? 'Uploading...' : <><UploadCloud size={16}/> Upload Art</>}
                  </button>
                  <button 
                    onClick={() => {
                        onOpenProofModal && onOpenProofModal(item.id);
                        onClose();
                    }}
                    className="flex-1 text-[11px] bg-purple-600 text-white px-4 py-2.5 rounded-xl border-2 border-purple-700 hover:bg-purple-700 font-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-200"
                  >
                     <Plus size={16}/> Send Proof
                  </button>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                 {itemAssets.length === 0 && (
                   <div className="text-center py-6 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50">
                     <p className="text-[11px] text-blue-400 font-bold italic">No files linked yet.</p>
                   </div>
                 )}
                 {itemAssets.map(asset => {
                   const fileUrl = getPublicUrl ? getPublicUrl(asset.file_url) : null;
                   const isImage = /\.(png|jpg|jpeg|gif|webp|svg|pdf)$/i.test(asset.file_name || '');
                   return (
                   <div
                     key={asset.id}
                     onClick={() => fileUrl && window.open(fileUrl, '_blank')}
                     className={`bg-white rounded-xl border border-blue-100 shadow-sm hover:border-blue-400 transition-colors overflow-hidden ${fileUrl ? 'cursor-pointer' : ''}`}
                   >
                     {isImage && fileUrl && (
                       <div className="w-full h-28 bg-gray-100 overflow-hidden border-b border-blue-100">
                         <img src={fileUrl} alt={asset.file_name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                       </div>
                     )}
                     <div className="flex items-center gap-3 p-3">
                       <div className={`p-2 rounded-lg flex-shrink-0 ${asset.asset_type === 'proof' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                         {asset.asset_type === 'proof' ? <ThumbsUp size={14}/> : <FileImage size={14}/>}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-black text-gray-900 truncate">{asset.file_name}</p>
                         <p className="text-[9px] uppercase font-bold text-gray-400">{asset.asset_type}</p>
                       </div>
                       {fileUrl && <ExternalLink size={14} className="text-blue-400 flex-shrink-0" />}
                     </div>
                   </div>
                   );
                 })}
              </div>
              <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
           </div>
        </div>

        <div className="pt-4 mt-4 border-t px-2">
           <button
             onClick={handleSave}
             disabled={isSaving}
             className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
           >
             <Save size={18}/> {isSaving ? 'Saving...' : 'Save Changes'}
           </button>
        </div>
      </div>
    </div>
  );
}
