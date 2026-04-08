'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Settings, Layers, ScrollText, Edit2, Check, X, ArrowLeft, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { COLOR_RAMPS } from '@/lib/routing';

const POSITION_LABELS: Record<string, string> = {
  'before-press': 'Before press',
  'after-finishing': 'After finishing',
  'end': 'End of line',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'departments' | 'workflow' | 'paper' | 'finishing' | 'templates'>('departments');
  const [loading, setLoading] = useState(true);

  // Departments
  const [departments, setDepartments] = useState<any[]>([]);
  const [addingDept, setAddingDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', position: 'after-finishing', description: '', color_index: 1 });
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  // Workflow (preserved)
  const [queues, setQueues] = useState<any[]>([]);
  const [subQueues, setSubQueues] = useState<any[]>([]);
  const [newQueueName, setNewQueueName] = useState('');
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editQueueName, setEditQueueName] = useState('');

  // Paper (preserved)
  const [stocks, setStocks] = useState<any[]>([]);
  const [newStockName, setNewStockName] = useState('');

  // Finishing
  const [finishingOpts, setFinishingOpts] = useState<any[]>([]);
  const [addingFin, setAddingFin] = useState(false);
  const [newFinLabel, setNewFinLabel] = useState('');

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [dRes, qRes, sqRes, pRes, fRes, tRes] = await Promise.all([
      supabase.from('departments').select('*').order('sort_order'),
      supabase.from('production_queues').select('*').order('sort_order'),
      supabase.from('production_subqueues').select('*').order('sort_order'),
      supabase.from('paper_stocks').select('*').order('name'),
      supabase.from('finishing_options').select('*').order('sort_order'),
      supabase.from('order_templates').select('*').order('sort_order'),
    ]);
    if (dRes.data) setDepartments(dRes.data);
    if (qRes.data) setQueues(qRes.data);
    if (sqRes.data) setSubQueues(sqRes.data);
    if (pRes.data) setStocks(pRes.data);
    if (fRes.data) setFinishingOpts(fRes.data);
    if (tRes.data) setTemplates(tRes.data);
    setLoading(false);
  };

  // ── DEPARTMENT CRUD ──
  const handleAddDept = async () => {
    if (!newDept.name.trim()) return;
    const maxOrder = departments.length > 0 ? Math.max(...departments.map(d => d.sort_order || 0)) : 0;
    await supabase.from('departments').insert({ ...newDept, sort_order: maxOrder + 1, enabled: true });
    setNewDept({ name: '', position: 'after-finishing', description: '', color_index: 1 });
    setAddingDept(false);
    fetchAll();
  };
  const updateDept = async (id: string, updates: any) => {
    await supabase.from('departments').update(updates).eq('id', id);
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };
  const deleteDept = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    await supabase.from('departments').delete().eq('id', id);
    fetchAll();
  };
  const moveDept = async (idx: number, dir: number) => {
    const arr = [...departments];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    await Promise.all([
      supabase.from('departments').update({ sort_order: idx }).eq('id', arr[idx].id),
      supabase.from('departments').update({ sort_order: swap }).eq('id', arr[swap].id),
    ]);
    setDepartments(arr);
  };

  // ── FINISHING CRUD ──
  const handleAddFinishing = async () => {
    if (!newFinLabel.trim()) return;
    const maxOrder = finishingOpts.length > 0 ? Math.max(...finishingOpts.map(f => f.sort_order || 0)) : 0;
    await supabase.from('finishing_options').insert({ label: newFinLabel.trim(), sort_order: maxOrder + 1 });
    setNewFinLabel(''); setAddingFin(false); fetchAll();
  };
  const deleteFinishing = async (id: string) => { await supabase.from('finishing_options').delete().eq('id', id); fetchAll(); };

  // ── TEMPLATE CRUD ──
  const updateTemplate = async (id: string, updates: any) => {
    await supabase.from('order_templates').update(updates).eq('id', id);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  const deleteTemplate = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('order_templates').delete().eq('id', id); fetchAll(); };

  // ── WORKFLOW CRUD (preserved from original) ──
  const handleAddQueue = async () => {
    if (!newQueueName.trim()) return;
    const maxOrder = queues.length > 0 ? Math.max(...queues.map(q => q.sort_order)) : 0;
    await supabase.from('production_queues').insert({ name: newQueueName, sort_order: maxOrder + 1 });
    setNewQueueName(''); fetchAll();
  };
  const handleUpdateQueue = async () => {
    if (!editQueueName.trim() || !editingQueueId) return;
    await supabase.from('production_queues').update({ name: editQueueName }).eq('id', editingQueueId);
    setEditingQueueId(null); fetchAll();
  };
  const handleDeleteQueue = async (id: string) => { if (!confirm('Delete this queue and all sub-options?')) return; await supabase.from('production_queues').delete().eq('id', id); fetchAll(); };
  const handleAddSubTask = async (queueId: string) => {
    if (!newSubTaskName.trim()) return;
    const queueTasks = subQueues.filter(sq => sq.queue_id === queueId);
    const maxOrder = queueTasks.length > 0 ? Math.max(...queueTasks.map(t => t.sort_order)) : 0;
    await supabase.from('production_subqueues').insert({ queue_id: queueId, name: newSubTaskName, sort_order: maxOrder + 1 });
    setNewSubTaskName(''); fetchAll();
  };
  const handleDeleteSubTask = async (id: string) => { await supabase.from('production_subqueues').delete().eq('id', id); fetchAll(); };

  // ── PAPER CRUD (preserved from original) ──
  const handleAddStock = async () => { if (!newStockName.trim()) return; await supabase.from('paper_stocks').insert({ name: newStockName }); setNewStockName(''); fetchAll(); };
  const handleDeleteStock = async (id: string) => { if (!confirm('Remove?')) return; await supabase.from('paper_stocks').delete().eq('id', id); fetchAll(); };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200"><Settings size={24} /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-sm text-gray-500">Configure departments, workflow, paper, finishing, and templates.</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
          {([
            { key: 'departments' as const, label: 'Departments', icon: <Layers size={16} /> },
            { key: 'workflow' as const, label: 'Workflow Queues', icon: <Layers size={16} /> },
            { key: 'paper' as const, label: 'Paper Inventory', icon: <ScrollText size={16} /> },
            { key: 'finishing' as const, label: 'Finishing', icon: <Layers size={16} /> },
            { key: 'templates' as const, label: 'Product Templates', icon: <Layers size={16} /> },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-white border border-gray-200 border-b-white text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}>
              <div className="flex items-center gap-2">{tab.icon} {tab.label}</div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">

          {/* ═══ DEPARTMENTS ═══ */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Routing Departments</h2>
                  <p className="text-sm text-gray-500">Toggle departments on/off for the order form. Each has a pipeline position.</p>
                </div>
              </div>
              {departments.map((dept, idx) => (
                <div key={dept.id} className="border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-gray-300 transition-colors">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveDept(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-20"><ArrowUp size={12} /></button>
                    <button onClick={() => moveDept(idx, 1)} disabled={idx === departments.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-20"><ArrowDown size={12} /></button>
                  </div>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: COLOR_RAMPS[dept.color_index]?.bg || '#eee', border: `2px solid ${COLOR_RAMPS[dept.color_index]?.text || '#999'}` }} />
                  <div className="flex-1 min-w-0">
                    {editingDeptId === dept.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input value={dept.name} onChange={e => updateDept(dept.id, { name: e.target.value })} className="flex-1 border rounded px-2 py-1 text-sm font-bold" />
                          <select value={dept.position} onChange={e => updateDept(dept.id, { position: e.target.value })} className="border rounded px-2 py-1 text-xs">
                            <option value="before-press">Before press</option>
                            <option value="after-finishing">After finishing</option>
                            <option value="end">End of line</option>
                          </select>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input value={dept.description || ''} onChange={e => updateDept(dept.id, { description: e.target.value })} placeholder="Description" className="flex-1 border rounded px-2 py-1 text-xs" />
                          <div className="flex gap-1">{COLOR_RAMPS.map((c, ci) => (<button key={ci} onClick={() => updateDept(dept.id, { color_index: ci })} style={{ width: 18, height: 18, borderRadius: '50%', border: dept.color_index === ci ? `2px solid ${c.text}` : '1px solid #ddd', background: c.bg, cursor: 'pointer' }} />))}</div>
                        </div>
                        <button onClick={() => setEditingDeptId(null)} className="text-xs font-bold text-green-600">Done editing</button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{dept.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">{POSITION_LABELS[dept.position]}</span>
                        </div>
                        {dept.description && <p className="text-xs text-gray-500 mt-1">{dept.description}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateDept(dept.id, { enabled: !dept.enabled })} className="relative" style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: dept.enabled ? '#0F6E56' : '#ccc', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: 2, left: dept.enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                    <button onClick={() => setEditingDeptId(editingDeptId === dept.id ? null : dept.id)} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => deleteDept(dept.id)} className="text-gray-300 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {addingDept ? (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-sm">New department</h3>
                  <div className="flex gap-2">
                    <input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="Department name" onKeyDown={e => e.key === 'Enter' && handleAddDept()} className="flex-1 border rounded px-3 py-2 text-sm" />
                    <select value={newDept.position} onChange={e => setNewDept(p => ({ ...p, position: e.target.value }))} className="border rounded px-3 py-2 text-sm">
                      <option value="before-press">Before press</option><option value="after-finishing">After finishing</option><option value="end">End of line</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input value={newDept.description} onChange={e => setNewDept(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="flex-1 border rounded px-3 py-2 text-sm" />
                    <div className="flex gap-1">{COLOR_RAMPS.map((c, ci) => (<button key={ci} onClick={() => setNewDept(p => ({ ...p, color_index: ci }))} style={{ width: 18, height: 18, borderRadius: '50%', border: newDept.color_index === ci ? `2px solid ${c.text}` : '1px solid #ddd', background: c.bg, cursor: 'pointer' }} />))}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddDept} className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm">Add department</button>
                    <button onClick={() => setAddingDept(false)} className="border px-4 py-2 rounded-lg text-sm text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingDept(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-bold text-green-700 hover:border-gray-300">+ Add department</button>
              )}
            </div>
          )}

          {/* ═══ WORKFLOW (preserved) ═══ */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Production Path</h2>
                <div className="flex gap-2 max-w-sm w-full">
                  <input type="text" placeholder="New Main Queue" value={newQueueName} onChange={e => setNewQueueName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-black text-sm" />
                  <button onClick={handleAddQueue} className="bg-black text-white px-4 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16} /> Add</button>
                </div>
              </div>
              {queues.map(queue => {
                const mySubTasks = subQueues.filter(sq => sq.queue_id === queue.id);
                const isAddingToThis = activeQueueId === queue.id;
                const isEditing = editingQueueId === queue.id;
                return (
                  <div key={queue.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-mono text-[10px] text-gray-400 font-bold bg-white px-1.5 py-0.5 rounded border">#{queue.sort_order}</span>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input autoFocus value={editQueueName} onChange={e => setEditQueueName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleUpdateQueue(); if (e.key === 'Escape') setEditingQueueId(null); }} className="font-bold border border-blue-400 rounded px-2 py-1 text-sm" />
                            <button onClick={handleUpdateQueue} className="bg-green-500 text-white p-1 rounded"><Check size={14} /></button>
                            <button onClick={() => setEditingQueueId(null)} className="bg-gray-200 text-gray-600 p-1 rounded"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-900">{queue.name}</h3>
                            <button onClick={() => { setEditingQueueId(queue.id); setEditQueueName(queue.name); }} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"><Edit2 size={14} /></button>
                          </div>
                        )}
                      </div>
                      {!isEditing && <button onClick={() => handleDeleteQueue(queue.id)} className="text-gray-300 hover:text-red-600 p-1"><Trash2 size={16} /></button>}
                    </div>
                    <div className="p-4 bg-white">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {mySubTasks.map(task => (<div key={task.id} className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">{task.name}<button onClick={() => handleDeleteSubTask(task.id)} className="text-blue-300 hover:text-red-500"><Trash2 size={12} /></button></div>))}
                        {mySubTasks.length === 0 && <span className="text-xs text-gray-300 italic py-1">No sub-tasks</span>}
                      </div>
                      <div className="flex gap-2 items-center">
                        <input type="text" placeholder={`+ Add option to ${queue.name}`} value={isAddingToThis ? newSubTaskName : ''} onChange={e => { setActiveQueueId(queue.id); setNewSubTaskName(e.target.value); }} onKeyDown={e => e.key === 'Enter' && handleAddSubTask(queue.id)} className="text-xs border rounded-md px-2 py-1.5 w-48 focus:outline-none focus:border-black bg-gray-50 focus:bg-white" />
                        {isAddingToThis && newSubTaskName && <button onClick={() => handleAddSubTask(queue.id)} className="bg-black text-white p-1 rounded"><Plus size={12} /></button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ PAPER (preserved) ═══ */}
          {activeTab === 'paper' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Paper Inventory</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {stocks.map(stock => (<div key={stock.id} className="flex justify-between items-center px-4 py-3 bg-white rounded-lg border border-gray-200 shadow-sm"><span className="text-sm font-medium text-gray-900">{stock.name}</span><button onClick={() => handleDeleteStock(stock.id)} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50"><Trash2 size={16} /></button></div>))}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Add New Stock</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. 100lb Gloss Cover" value={newStockName} onChange={e => setNewStockName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddStock()} className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-black" />
                  <button onClick={handleAddStock} className="bg-black text-white px-4 rounded-lg font-bold text-sm">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ FINISHING ═══ */}
          {activeTab === 'finishing' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Finishing Options</h2>
              <p className="text-sm text-gray-500 mb-4">These appear as toggleable pills on the order form.</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                {finishingOpts.map((fin, idx) => (<div key={fin.id} className={`flex items-center justify-between px-4 py-3 ${idx < finishingOpts.length - 1 ? 'border-b border-gray-100' : ''}`}><span className="text-sm font-medium text-gray-900">{fin.label}</span><button onClick={() => deleteFinishing(fin.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button></div>))}
                {finishingOpts.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No finishing options.</div>}
              </div>
              {addingFin ? (
                <div className="flex gap-2">
                  <input value={newFinLabel} onChange={e => setNewFinLabel(e.target.value)} placeholder="e.g. Foil stamp" onKeyDown={e => e.key === 'Enter' && handleAddFinishing()} className="flex-1 border rounded-lg px-3 py-2 text-sm" autoFocus />
                  <button onClick={handleAddFinishing} className="bg-black text-white px-4 rounded-lg text-sm font-bold">Add</button>
                  <button onClick={() => { setAddingFin(false); setNewFinLabel(''); }} className="border px-4 rounded-lg text-sm text-gray-500">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAddingFin(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-bold text-green-700">+ Add finishing option</button>
              )}
            </div>
          )}

          {/* ═══ TEMPLATES ═══ */}
          {activeTab === 'templates' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Product Templates</h2>
              <p className="text-sm text-gray-500 mb-4">Pre-fill the order form with defaults. Edit size, substrate, finishing, and auto-attached departments.</p>
              {templates.map(t => (
                <div key={t.id} className="border border-gray-200 rounded-xl p-4 mb-3">
                  {editingTemplateId === t.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input value={t.label} onChange={e => updateTemplate(t.id, { label: e.target.value })} className="flex-1 border rounded px-2 py-1 text-sm font-bold" />
                        <input value={t.icon} onChange={e => updateTemplate(t.id, { icon: e.target.value })} className="w-12 border rounded px-2 py-1 text-center text-lg" />
                      </div>
                      <div className="flex gap-2">
                        <input value={t.default_size || ''} onChange={e => updateTemplate(t.id, { default_size: e.target.value })} placeholder="Size" className="flex-1 border rounded px-2 py-1 text-sm" />
                        <input value={t.default_substrate || ''} onChange={e => updateTemplate(t.id, { default_substrate: e.target.value })} placeholder="Substrate" className="flex-1 border rounded px-2 py-1 text-sm" />
                        <select value={t.default_color_mode || '4/4'} onChange={e => updateTemplate(t.id, { default_color_mode: e.target.value })} className="border rounded px-2 py-1 text-sm w-20">
                          {['4/4', '4/1', '4/0', '1/1', '1/0'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-500">Default departments:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {departments.filter(d => d.enabled).map(dept => {
                            const active = (t.default_dept_ids || []).includes(dept.id);
                            const c = COLOR_RAMPS[dept.color_index] || COLOR_RAMPS[6];
                            return (<button key={dept.id} onClick={() => { const newIds = active ? (t.default_dept_ids || []).filter((id: string) => id !== dept.id) : [...(t.default_dept_ids || []), dept.id]; updateTemplate(t.id, { default_dept_ids: newIds }); }}
                              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${active ? '' : 'bg-transparent text-gray-400 border-gray-200'}`}
                              style={active ? { background: c.bg, color: c.text, borderColor: `${c.text}40` } : {}}>{dept.name}</button>);
                          })}
                        </div>
                      </div>
                      <button onClick={() => setEditingTemplateId(null)} className="text-xs font-bold text-green-600">Done editing</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg opacity-50">{t.icon}</span>
                        <div>
                          <span className="font-bold text-gray-900">{t.label}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{[t.default_size, t.default_substrate, t.default_color_mode].filter(Boolean).join(' · ')}{(t.default_dept_ids || []).length > 0 && ` · +${t.default_dept_ids.map((id: string) => departments.find(d => d.id === id)?.name || id).join(', ')}`}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingTemplateId(t.id)} className="text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-gray-300 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
