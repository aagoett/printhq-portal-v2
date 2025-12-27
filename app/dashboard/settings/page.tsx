'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Settings, Layers, ScrollText } from 'lucide-react';

export default function SettingsPage() {
  // --- STATE: WORKFLOW ---
  const [queues, setQueues] = useState<any[]>([]);
  const [subQueues, setSubQueues] = useState<any[]>([]);
  const [newQueueName, setNewQueueName] = useState('');
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);

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
    // 1. Fetch Workflow Data
    const { data: qData } = await supabase.from('production_queues').select('*').order('sort_order');
    const { data: sData } = await supabase.from('production_subqueues').select('*').order('sort_order');
    if (qData) setQueues(qData);
    if (sData) setSubQueues(sData);

    // 2. Fetch Paper Data (RESTORED)
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

  // --- PAPER ACTIONS (RESTORED) ---
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
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* HEADER */}
        <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                <Settings size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-sm text-gray-500">Manage production workflows and resources.</p>
            </div>
        </div>

        {/* SECTION 1: WORKFLOW MANAGER */}
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Layers size={18}/> Production Workflow
            </h2>
            <div className="space-y-6">
                {queues.map((queue) => {
                    const mySubTasks = subQueues.filter(sq => sq.queue_id === queue.id);
                    const isAddingToThis = activeQueueId === queue.id;

                    return (
                        <div key={queue.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* QUEUE HEADER */}
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-gray-400 font-bold bg-white px-2 py-1 rounded border">#{queue.sort_order}</span>
                                    <h3 className="font-bold text-lg text-gray-900">{queue.name}</h3>
                                </div>
                                <button onClick={() => handleDeleteQueue(queue.id)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* SUB-TASKS LIST */}
                            <div className="p-6">
                                {mySubTasks.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic mb-4">No specific options defined.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {mySubTasks.map(task => (
                                            <div key={task.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 group">
                                                {task.name}
                                                <button onClick={() => handleDeleteSubTask(task.id)} className="text-blue-300 hover:text-red-500"><Trash2 size={12}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* ADD SUB-TASK INPUT */}
                                <div className="flex gap-2 items-center mt-2">
                                    <input 
                                        type="text" 
                                        placeholder={`Add option to ${queue.name}...`}
                                        value={isAddingToThis ? newSubTaskName : ''}
                                        onChange={(e) => {
                                            setActiveQueueId(queue.id);
                                            setNewSubTaskName(e.target.value);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask(queue.id)}
                                        className="text-xs border rounded-lg px-3 py-2 w-64 focus:outline-none focus:border-blue-500"
                                    />
                                    {isAddingToThis && newSubTaskName && (
                                        <button onClick={() => handleAddSubTask(queue.id)} className="bg-black text-white p-1.5 rounded-lg">
                                            <Plus size={14}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* ADD NEW QUEUE */}
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 flex gap-2 max-w-md">
                    <input 
                        type="text" 
                        placeholder="New Main Queue (e.g. Mailing)" 
                        value={newQueueName}
                        onChange={(e) => setNewQueueName(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-black text-sm"
                    />
                    <button onClick={handleAddQueue} className="bg-black text-white px-4 rounded-lg font-bold text-sm flex items-center gap-2">
                        <Plus size={16} /> Add
                    </button>
                </div>
            </div>
        </div>

        {/* SECTION 2: PAPER LIBRARY (RESTORED) */}
        <div className="pt-8 border-t border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ScrollText size={18}/> Paper Inventory
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-3 mb-6">
                    {stocks.map((stock) => (
                        <div key={stock.id} className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 group">
                            {stock.name}
                            <button onClick={() => handleDeleteStock(stock.id)} className="text-gray-400 hover:text-red-500 opacity-50 group-hover:opacity-100">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))}
                    {stocks.length === 0 && <p className="text-gray-400 italic text-sm">No paper stocks added yet.</p>}
                </div>

                <div className="flex gap-2 max-w-md">
                    <input 
                        type="text" 
                        placeholder="Add New Stock (e.g. 100lb Gloss)" 
                        value={newStockName} 
                        onChange={(e) => setNewStockName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                        className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:border-black"
                    />
                    <button onClick={handleAddStock} className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm">
                        Add Stock
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
