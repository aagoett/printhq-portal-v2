'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, DollarSign, Settings, Save, ArrowLeft, Clock, Zap, Maximize } from 'lucide-react';
import Link from 'next/link';

export default function PricingBuilderPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newUnit, setNewUnit] = useState('per_sheet');
  
  // NEW: Advanced Specs
  const [setupMins, setSetupMins] = useState('');
  const [runSpeed, setRunSpeed] = useState('');
  const [sheetW, setSheetW] = useState('');
  const [sheetH, setSheetH] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: cats } = await supabase.from('pricing_categories').select('*').order('sort_order');
    const { data: comps } = await supabase.from('pricing_components').select('*').order('name');
    
    if (cats) {
        setCategories(cats);
        if (!activeCatId && cats.length > 0) setActiveCatId(cats[0].id);
    }
    if (comps) setComponents(comps);
    setLoading(false);
  };

  const handleAddComponent = async () => {
      if (!newName.trim() || !newCost || !activeCatId) return;

      const { error } = await supabase.from('pricing_components').insert({
          category_id: activeCatId,
          name: newName,
          cost_amount: parseFloat(newCost),
          cost_unit: newUnit,
          setup_minutes: parseInt(setupMins) || 0,
          run_speed_per_hour: parseInt(runSpeed) || 0,
          parent_sheet_width: parseFloat(sheetW) || 0,
          parent_sheet_height: parseFloat(sheetH) || 0
      });

      if (error) alert(error.message);
      else {
          setNewName(''); setNewCost(''); setSetupMins(''); setRunSpeed(''); setSheetW(''); setSheetH('');
          fetchData();
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Delete this cost item?")) return;
      await supabase.from('pricing_components').delete().eq('id', id);
      fetchData();
  };

  const activeCategoryName = categories.find(c => c.id === activeCatId)?.name || '';
  const isPaper = activeCategoryName.toLowerCase().includes('paper') || activeCategoryName.toLowerCase().includes('stock');
  const isMachine = activeCategoryName.toLowerCase().includes('press') || activeCategoryName.toLowerCase().includes('finishing');

  if (loading) return <div className="p-12 text-center text-gray-400">Loading Pricing Engine...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* HEADER */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cost Engine</h1>
                    <p className="text-sm text-gray-500">Define raw costs, run speeds, and material specs.</p>
                </div>
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* SIDEBAR */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 h-fit">
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => setActiveCatId(cat.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold mb-1 flex justify-between items-center transition-all ${activeCatId === cat.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT */}
            <div className="md:col-span-3 space-y-6">
                
                {/* ADD NEW ITEM CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">Add {activeCategoryName} Item</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-900 mb-1">Item Name</label>
                            <input type="text" placeholder="e.g. 100lb Gloss Cover" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-black"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-900 mb-1">Cost</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                <input type="number" placeholder="0.00" value={newCost} onChange={(e) => setNewCost(e.target.value)} className="w-full border rounded-lg pl-6 pr-3 py-2 text-sm outline-none focus:border-black"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-900 mb-1">Unit</label>
                            <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="per_sheet">Per Sheet</option>
                                <option value="per_hour">Per Hour</option>
                                <option value="per_job">Per Job (Fixed)</option>
                                <option value="per_1000">Per 1,000</option>
                            </select>
                        </div>
                    </div>

                    {/* DYNAMIC FIELDS BASED ON CATEGORY */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        {isPaper && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Maximize size={10}/> Width (in)</label>
                                    <input type="number" placeholder="12" value={sheetW} onChange={(e) => setSheetW(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Maximize size={10}/> Height (in)</label>
                                    <input type="number" placeholder="18" value={sheetH} onChange={(e) => setSheetH(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/>
                                </div>
                            </>
                        )}

                        {isMachine && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Zap size={10}/> Speed (/hr)</label>
                                    <input type="number" placeholder="5000" value={runSpeed} onChange={(e) => setRunSpeed(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock size={10}/> Setup (min)</label>
                                    <input type="number" placeholder="15" value={setupMins} onChange={(e) => setSetupMins(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/>
                                </div>
                            </>
                        )}
                        
                        <div className={`flex items-end ${!isPaper && !isMachine ? 'col-span-4' : 'col-span-2'}`}>
                             <button onClick={handleAddComponent} className="w-full bg-black text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                                + Add Cost Item
                            </button>
                        </div>
                    </div>
                </div>

                {/* LIST */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Item Name</th>
                                <th className="px-6 py-3">Base Cost</th>
                                <th className="px-6 py-3">Specs</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {components
                                .filter(c => c.category_id === activeCatId)
                                .map(comp => (
                                <tr key={comp.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 font-medium text-gray-900">{comp.name}</td>
                                    <td className="px-6 py-4 text-gray-600 font-mono">
                                        ${comp.cost_amount} / {comp.cost_unit.replace('per_', '')}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {comp.parent_sheet_width > 0 && <span className="mr-3 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">{comp.parent_sheet_width}x{comp.parent_sheet_height}"</span>}
                                        {comp.run_speed_per_hour > 0 && <span className="mr-3 bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">{comp.run_speed_per_hour}/hr</span>}
                                        {comp.setup_minutes > 0 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-100">{comp.setup_minutes}m Setup</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(comp.id)} className="text-gray-300 hover:text-red-600 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {components.filter(c => c.category_id === activeCatId).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">No items yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>
  );
}
