'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Settings, Layers, ScrollText, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  // --- TABS ---
  const [activeTab, setActiveTab] = useState<'workflow' | 'paper'>('workflow');

  // --- STATE: WORKFLOW ---
  const [queues, setQueues] = useState<any[]>([]);
  const [subQueues, setSubQueues] = useState<any[]>([]);
  
  const [newQueueName, setNewQueueName] = useState('');
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);

  // --- STATE: EDITING ---
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editQueueName, setEditQueueName] = useState('');

  // --- STATE: PAPER ---
  const [stocks, setStocks] = useState<any[]>([]);
  const [newStockName, setNewStockName] = useState('');

  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: qData } = await supabase.from('production_queues').select('*').order('sort_order');
    const { data: sData } = await supabase.from('production_subqueues').select('*').order('sort_order');
    if (qData) setQueues(qData);
    if (sData) setSubQueues(sData);

    const { data: pData } = await supabase.from('paper_stocks').select('*').order('name');
    if (pData) setStocks(pData);

    setLoading(false);
  };

  // --- QUEUE ACTIONS ---
  const handleAddQueue = async () => {
    if (!newQueueName.trim()) return;
    const maxOrder = queues.length > 0 ? Math.max(...queues.map(q => q.sort_order)) : 0;
    await supabase.from('production_queues').insert({ name: newQueueName, sort_order: maxOrder + 1 });
    setNewQueueName('');
    fetchSettings();
  };

  const startEditing = (queue: any) => {
      setEditingQueueId(queue.id);
      setEditQueueName(queue.name);
  };

  const handleUpdateQueue = async () => {
      if (!editQueueName.trim() || !editingQueueId) return;
      await supabase.from('production_queues').update({ name: editQueueName }).eq('id', editingQueueId);
      setEditingQueueId(null);
      setEditQueueName('');
      fetchSettings();
  };

  const cancelEditing = () => {
      setEditingQueueId(null);
      setEditQueueName('');
  };

  const handleDeleteQueue = async (id: string) => {
    if (!confirm('Delete this queue and all its sub-options?')) return;
    await supabase.from('production_queues').delete().eq('id', id);
    fetchSettings();
  };

  const handleAddSubTask = async (queueId: string) => {
    if (!newSubTaskName.trim()) return;
    const queueTasks = subQueues.filter(sq => sq.queue_id === queueId);
    const maxOrder = queueTasks.length > 0 ? Math.max(...queueTasks.map(t => t.sort_order)) : 0;

    await supabase.from('production_subqueues').insert({
        queue_id: queueId,
        name: newSubTaskName,
        sort_order: maxOrder + 1
    });
    setNewSubTaskName('');
    fetchSettings();
  };

  const handleDeleteSubTask = async (id: string) => {
    await supabase.from('production_subqueues').delete().eq('id', id);
    fetchSettings();
  };

  // --- PAPER ACTIONS ---
  const handleAddStock = async () => {
      if (!newStockName.trim()) return;
      await supabase.from('paper_stocks').insert({ name: newStockName });
      setNewStockName('');
      fetchSettings();
  };

  const handleDeleteStock = async (id: string) => {
      if (!confirm('Remove this paper stock?')) return;
      await supabase.from('paper_stocks').delete().eq('id', id);
      fetchSettings();
  };

  if (loading) return <div className="p-8 text-gray-400">Loading settings...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* NEW: BACK BUTTON & HEADER */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 hover:text-black text-gray-500 transition-colors">
                <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                    <Settings size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-sm text-gray-500">Configure your shop standards.</p>
                </div>
            </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex gap-2 border-b border-gray-200 pb-1">
            <button 
                onClick={() => setActiveTab('workflow')}
                className={`px-6 py-2 text-sm font-bold rounded-t-lg transition-all ${activeTab === 'workflow' ? 'bg-white border border-gray-200 border-b-white text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}
            >
                <div className="flex items-center gap-2"><Layers size={16}/> Workflow Queues</div>
            </button>
            <button 
                onClick={() => setActiveTab('paper')}
                className={`px-6 py-2 text-sm font-bold rounded-t-lg transition-all ${activeTab === 'paper' ? 'bg-white border border-gray-200 border-b-white text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}
            >
                <div className="flex items-center gap-2"><ScrollText size={16}/> Paper Inventory</div>
            </button>
        </div>

        {/* TAB CONTENT */}
        <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            
            {/* --- WORKFLOW TAB --- */}
            {activeTab === 'workflow' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Production Path</h2>
                        <div className="flex gap-2 max-w-sm w-full">
                            <input 
                                type="text" 
                                placeholder="New Main Queue (e.g. Mailing)" 
                                value={newQueueName}
                                onChange={(e) => setNewQueueName(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-black text-sm"
                            />
                            <button onClick={handleAddQueue} className="bg-black text-white px-4 rounded-lg font-bold text-sm flex items-center gap-2">
                                <Plus size={16} /> Add
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {queues.map((queue) => {
                            const mySubTasks = subQueues.filter(sq => sq.queue_id === queue.id);
                            const isAddingToThis = activeQueueId === queue.id;
                            const isEditing = editingQueueId === queue.id;

                            return (
                                <div key={queue.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                                    {/* QUEUE HEADER */}
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                        <div className="flex items-center gap-3 flex-1">
                                            <span className="font-mono text-[10px] text-gray-400 font-bold bg-white px-1.5 py-0.5 rounded border">#{queue.sort_order}</span>
                                            
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        autoFocus
                                                        type="text" 
                                                        value={editQueueName}
                                                        onChange={(e) => setEditQueueName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleUpdateQueue();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        className="font-bold text-gray-900 bg-white border border-blue-400 rounded px-2 py-1 outline-none text-sm"
                                                    />
                                                    <button onClick={handleUpdateQueue} className="bg-green-500 text-white p-1 rounded hover:bg-green-600"><Check size={14}/></button>
                                                    <button onClick={cancelEditing} className="bg-gray-200 text-gray-600 p-1 rounded hover:bg-gray-300"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-bold text-gray-900">{queue.name}</h3>
                                                    {/* ALWAYS VISIBLE EDIT BUTTON */}
                                                    <button onClick={() => startEditing(queue)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50">
                                                        <Edit2 size={14}/>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {!isEditing && (
                                            <button onClick={() => handleDeleteQueue(queue.id)} className="text-gray-300 hover:text-red-600 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* SUB-TASKS */}
                                    <div className="p-4 bg-white">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {mySubTasks.map(task => (
                                                <div key={task.id} className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                                                    {task.name}
                                                    <button onClick={() => handleDeleteSubTask(task.id)} className="text-blue-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                </div>
                                            ))}
                                            {mySubTasks.length === 0 && <span className="text-xs text-gray-300 italic py-1">No sub-tasks</span>}
                                        </div>

                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="text" 
                                                placeholder={`+ Add option to ${queue.name}`}
                                                value={isAddingToThis ? newSubTaskName : ''}
                                                onChange={(e) => {
                                                    setActiveQueueId(queue.id);
                                                    setNewSubTaskName(e.target.value);
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask(queue.id)}
                                                className="text-xs border rounded-md px-2 py-1.5 w-48 focus:outline-none focus:border-black bg-gray-50 focus:bg-white"
                                            />
                                            {isAddingToThis && newSubTaskName && (
                                                <button onClick={() => handleAddSubTask(queue.id)} className="bg-black text-white p-1 rounded">
                                                    <Plus size={12}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- PAPER TAB --- */}
            {activeTab === 'paper' && (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Paper Inventory</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                        {stocks.map((stock) => (
                            <div key={stock.id} className="flex justify-between items-center px-4 py-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-sm font-medium text-gray-900">{stock.name}</span>
                                <button onClick={() => handleDeleteStock(stock.id)} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Add New Stock</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="e.g. 100lb Gloss Cover" 
                                value={newStockName} 
                                onChange={(e) => setNewStockName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                            />
                            <button onClick={handleAddStock} className="bg-black text-white px-4 rounded-lg font-bold text-sm">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}
