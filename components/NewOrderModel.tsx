'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, FileText, Trash2, ShoppingCart, UploadCloud, Loader2, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { deriveRoute, COLOR_RAMPS, type DeptInfo } from '@/lib/routing';
import RouteBadge from '@/components/RouteBadge';
import { sendOrderConfirmation } from '@/app/server-actions';

const COLOR_MODES = ['4/4', '4/1', '4/0', '1/1', '1/0'];

interface Props {
  user: any;
  role: string;
  customers: any[];
  brandList: any[];
  onClose: () => void;
  onSubmitted: () => void;
}

export default function NewOrderModal({ user, role, customers, brandList, onClose, onSubmitted }: Props) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  // Config from DB
  const [departments, setDepartments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [finishingOpts, setFinishingOpts] = useState<any[]>([]);
  const [stockLibrary, setStockLibrary] = useState<any[]>([]);

  // Step 1
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(user?.id || '');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [priority, setPriority] = useState('standard');
  const [notes, setNotes] = useState('');

  // Step 2
  const [cart, setCart] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const isInternal = ['admin', 'staff', 'csr'].includes(role);
  const enabledDepts = departments.filter((d: any) => d.enabled);

  useEffect(() => {
    (async () => {
      const [dRes, tRes, fRes, sRes] = await Promise.all([
        supabase.from('departments').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('order_templates').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('finishing_options').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('paper_stocks').select('*').order('name'),
      ]);
      if (dRes.data) setDepartments(dRes.data);
      if (tRes.data) setTemplates(tRes.data);
      if (fRes.data) setFinishingOpts(fRes.data);
      if (sRes.data) setStockLibrary(sRes.data);
      if (brandList.length > 0) setSelectedBrandId(brandList[0].id);
    })();
  }, []);

  const pickTemplate = (t: any) => {
    const tDepts = enabledDepts.filter((d: any) => (t.default_dept_ids || []).includes(d.id));
    setCurrentItem({
      template: t.id, label: t.label, size: t.default_size || '', substrate: t.default_substrate || '',
      color: t.default_color_mode || '4/4', finishing: [...(t.default_finishing || [])],
      qty: '', fileName: null, file: null, extraDepts: tDepts,
    });
    setShowTemplates(false);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!currentItem) {
      setCurrentItem({
        template: 'custom', label: file.name.split('.').slice(0, -1).join('.') || 'Custom job',
        size: '', substrate: '', color: '4/4', finishing: [], qty: '',
        fileName: file.name, file, extraDepts: [],
      });
      setShowTemplates(false);
    } else {
      setCurrentItem((prev: any) => ({ ...prev, fileName: file.name, file }));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer?.files?.[0]);
  }, [currentItem]);

  const toggleDept = (dept: any) => {
    setCurrentItem((prev: any) => {
      const has = prev.extraDepts.some((d: any) => d.id === dept.id);
      return { ...prev, extraDepts: has ? prev.extraDepts.filter((d: any) => d.id !== dept.id) : [...prev.extraDepts, dept] };
    });
  };

  const toggleFinishing = (label: string) => {
    setCurrentItem((prev: any) => ({
      ...prev, finishing: prev.finishing.includes(label) ? prev.finishing.filter((f: string) => f !== label) : [...prev.finishing, label],
    }));
  };

  const addToCart = () => {
    if (!currentItem?.qty || !currentItem?.file) return;
    setCart(prev => [...prev, { ...currentItem, id: Math.random().toString(36) }]);
    setCurrentItem(null);
    setShowTemplates(true);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setIsUploading(true);
    try {
      let targetUserId = user?.id;
      let targetEmail = user?.email;

      if (isInternal) {
        if (isNewCustomer) { targetUserId = null; targetEmail = newCustomerEmail; }
        else if (selectedCustomerId) {
          targetUserId = selectedCustomerId;
          targetEmail = customers.find((c: any) => c.id === selectedCustomerId)?.email || '';
        }
      }

      const { data: newOrder, error: orderError } = await supabase.from('orders').insert({ user_id: targetUserId, status: 'New', brand_id: selectedBrandId }).select().single();
      if (orderError) throw orderError;

      const allDepts = cart.reduce((acc: any[], item: any) => { item.extraDepts.forEach((d: any) => { if (!acc.some((a: any) => a.id === d.id)) acc.push(d); }); return acc; }, []);
      const overallRoute = deriveRoute(Math.max(...cart.map((i: any) => parseInt(i.qty) || 0)), cart[0]?.size, cart.flatMap((i: any) => i.finishing), allDepts);

      const { data: newJob, error: jobError } = await supabase.from('jobs').insert({
        order_id: newOrder.id, user_id: targetUserId,
        guest_email: isNewCustomer ? targetEmail : null,
        title: cart.length === 1 ? cart[0].label : `Order #${newOrder.id.substring(0, 6).toUpperCase()}`,
        quantity: cart.reduce((acc: number, i: any) => acc + (parseInt(i.qty) || 0), 0),
        status: 'Pending Review', created_by: user.id,
        priority, special_instructions: notes || null,
        route_pipeline: overallRoute, template_used: cart[0]?.label || null,
      }).select().single();
      if (jobError) throw jobError;

      for (const item of cart) {
        const { data: newItem, error: itemError } = await supabase.from('job_items').insert({
          job_id: newJob.id, description: item.label, quantity: parseInt(item.qty) || 0,
          paper_stock: item.substrate, size: item.size, status: 'Pending',
          internal_notes: item.finishing.length > 0 ? `Color: ${item.color} · Finishing: ${item.finishing.join(', ')}` : `Color: ${item.color}`,
        }).select().single();
        if (itemError) throw itemError;

        if (item.file) {
          const ext = item.file.name.split('.').pop();
          const fname = `${newJob.id}-${Math.random().toString(36).substring(7)}.${ext}`;
          const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fname, item.file);
          if (!uploadError && fileData) {
            await supabase.from('job_assets').insert({
              job_id: newJob.id, job_item_id: newItem.id, uploader_id: user.id,
              file_url: fileData.path, file_name: item.file.name, asset_type: 'source', status: 'pending',
            });
          }
        }

        await supabase.from('job_item_steps').insert({ job_item_id: newItem.id, step_name: 'Prepress', status: 'Pending', is_internal: true });
        for (const dept of item.extraDepts) {
          await supabase.from('job_item_steps').insert({ job_item_id: newItem.id, step_name: dept.name, status: 'Pending', is_internal: true });
        }
      }

      const brandName = brandList.find((b: any) => b.id === selectedBrandId)?.name || 'PrintHQ';
      if (targetEmail) await sendOrderConfirmation(targetEmail, newJob.id, `${cart.length} Item(s) from ${brandName}`);

      alert('✅ Order Submitted Successfully!');
      onClose();
      onSubmitted();
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error creating order. ' + (error?.message || ''));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900">New Production Order</h3>
            <p className="text-xs text-gray-500">{step === 1 ? 'Who is this for?' : 'Add items to the order'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={20} /></button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-6 pt-4">
          <div className="flex-1 h-1 rounded-full bg-green-600" />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {step === 1 && (
            <>
              {isInternal && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase text-yellow-800 flex items-center"><User size={14} className="mr-1" /> Customer</label>
                    <button onClick={() => setIsNewCustomer(!isNewCustomer)} className="text-xs font-bold text-blue-600 hover:underline">{isNewCustomer ? 'Select Existing' : '+ New Guest'}</button>
                  </div>
                  {isNewCustomer ? (
                    <input type="email" placeholder="client@email.com" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm" />
                  ) : (
                    <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm">
                      {customers.map((c: any) => <option key={c.id} value={c.id}>{c.email} {c.role !== 'customer' ? `(${c.role})` : ''}</option>)}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Company / Brand</label>
                <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold">
                  {brandList.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Turnaround</label>
                <div className="flex gap-2">
                  {[
                    { key: 'rush', label: 'Rush', sub: 'Same / next day', active: 'bg-red-50 border-red-300 text-red-800' },
                    { key: 'standard', label: 'Standard', sub: '2–3 days', active: 'bg-blue-50 border-blue-300 text-blue-800' },
                    { key: 'flexible', label: 'Flexible', sub: '1 week+', active: 'bg-gray-50 border-gray-300 text-gray-700' },
                  ].map(p => (
                    <button key={p.key} onClick={() => setPriority(p.key)} className={`flex-1 py-3 rounded-xl text-center transition-all border-2 ${priority === p.key ? p.active : 'border-gray-200'}`}>
                      <div className={`text-sm font-bold ${priority === p.key ? '' : 'text-gray-500'}`}>{p.label}</div>
                      <div className={`text-[10px] mt-0.5 ${priority === p.key ? '' : 'text-gray-400'}`}>{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Special instructions (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything that should travel with this job…" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-vertical" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {cart.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 text-xs font-bold uppercase text-gray-500 flex justify-between"><span>Items ({cart.length})</span><span>Qty</span></div>
                  {cart.map((item: any) => (
                    <div key={item.id} className="p-3 bg-white border-t border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-blue-500" />
                          <span className="text-sm font-bold text-gray-900">{item.label}</span>
                          {item.fileName && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100">file</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold">{item.qty}</span>
                          <button onClick={() => setCart(prev => prev.filter((i: any) => i.id !== item.id))} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <RouteBadge stages={deriveRoute(parseInt(item.qty) || 0, item.size, item.finishing, item.extraDepts)} depts={departments} />
                    </div>
                  ))}
                </div>
              )}

              {showTemplates && !currentItem && (
                <>
                  <p className="text-xs font-bold uppercase text-gray-500">Pick a product type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map((t: any) => (
                      <button key={t.id} onClick={() => pickTemplate(t)} className="p-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-center transition-all">
                        <div className="text-lg opacity-50 mb-1">{t.icon}</div>
                        <div className="text-xs font-bold text-gray-800">{t.label}</div>
                        {(t.default_dept_ids || []).length > 0 && <div className="text-[9px] text-gray-400 mt-1">+{t.default_dept_ids.map((id: string) => enabledDepts.find((d: any) => d.id === id)?.name).filter(Boolean).join(', ')}</div>}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs text-gray-400">or drop a file to start</div>
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-black'}`}>
                    <UploadCloud className={`mx-auto h-8 w-8 mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="text-sm font-bold text-gray-600">{dragOver ? 'Drop file here!' : 'Click or drag artwork here'}</p>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                  </div>
                </>
              )}

              {currentItem && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">{currentItem.label}</span>
                    <button onClick={() => { setCurrentItem(null); setShowTemplates(true); }} className="text-xs text-gray-500">Cancel</button>
                  </div>

                  <div onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer ${currentItem.fileName ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-black'}`}>
                    {currentItem.fileName ? <p className="text-sm text-green-700 font-bold">✓ {currentItem.fileName}</p> : <p className="text-sm text-gray-500">Click or drag artwork</p>}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Quantity</label><input type="number" value={currentItem.qty} onChange={e => setCurrentItem((p: any) => ({ ...p, qty: e.target.value }))} placeholder="500" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Size</label><input value={currentItem.size} onChange={e => setCurrentItem((p: any) => ({ ...p, size: e.target.value }))} placeholder="8.5x11" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Color</label><select value={currentItem.color} onChange={e => setCurrentItem((p: any) => ({ ...p, color: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">{COLOR_MODES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Substrate</label>
                    <select value={currentItem.substrate} onChange={e => setCurrentItem((p: any) => ({ ...p, substrate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">Select substrate…</option>
                      {stockLibrary.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Finishing</label>
                    <div className="flex flex-wrap gap-1.5">
                      {finishingOpts.map((f: any) => {
                        const active = currentItem.finishing.includes(f.label);
                        return <button key={f.id} onClick={() => toggleFinishing(f.label)} className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${active ? 'bg-green-50 text-green-800 border-green-300' : 'text-gray-400 border-gray-200'}`}>{f.label}</button>;
                      })}
                    </div>
                  </div>

                  {enabledDepts.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Additional departments</label>
                      <div className="flex flex-wrap gap-1.5">
                        {enabledDepts.map((dept: any) => {
                          const active = currentItem.extraDepts.some((d: any) => d.id === dept.id);
                          const c = COLOR_RAMPS[dept.color_index] || COLOR_RAMPS[6];
                          return <button key={dept.id} onClick={() => toggleDept(dept)} title={dept.description}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${active ? '' : 'text-gray-400 border-gray-200'}`}
                            style={active ? { background: c.bg, color: c.text, borderColor: `${c.text}40` } : {}}>{dept.name}</button>;
                        })}
                      </div>
                    </div>
                  )}

                  {currentItem.qty && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-gray-500 mb-1">Auto-route preview</p>
                      <RouteBadge stages={deriveRoute(parseInt(currentItem.qty) || 0, currentItem.size, currentItem.finishing, currentItem.extraDepts)} depts={departments} />
                    </div>
                  )}

                  <button onClick={addToCart} disabled={!currentItem.qty || !currentItem.file} className={`w-full py-2.5 rounded-lg font-bold text-sm ${currentItem.qty && currentItem.file ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    {!currentItem.file ? 'Upload a file first…' : !currentItem.qty ? 'Enter quantity…' : '+ Add to order'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
          {step === 1 ? (
            <button onClick={() => setStep(2)} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800">Continue to items →</button>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-100">← Back</button>
              <button onClick={handleSubmit} disabled={isUploading || cart.length === 0} className="flex-1 py-3 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <ShoppingCart size={16} />}
                Submit order ({cart.length} item{cart.length !== 1 ? 's' : ''})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
