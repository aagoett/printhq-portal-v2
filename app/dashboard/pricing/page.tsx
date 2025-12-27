'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Trash2, DollarSign, Settings, ArrowLeft, Clock, Zap, Maximize, LayoutGrid, Calculator } from 'lucide-react';
import Link from 'next/link';

export default function PricingBuilderPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('per_sheet');
  const [selectedType, setSelectedType] = useState('other'); // NEW: Explicit Type
  
  // Specs
  const [setupMins, setSetupMins] = useState('');
  const [runSpeed, setRunSpeed] = useState('');
  const [sheetW, setSheetW] = useState('');
  const [sheetH, setSheetH] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { fetchData(); }, []);

  // Auto-set Type based on Category
  useEffect(() => {
      const catName = categories.find(c => c.id === activeCatId)?.name.toLowerCase() || '';
      if (catName.includes('paper')) setSelectedType('paper');
      else if (catName.includes('press')) setSelectedType('press_digital');
      else if (catName.includes('finish')) setSelectedType('finishing');
      else setSelectedType('other');
  }, [activeCatId, categories]);

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
          type: selectedType, // CRITICAL FIX: SAVING THE TYPE
          cost_amount: parseFloat(newCost),
          price_amount: parseFloat(newPrice) || parseFloat(newCost),
          cost_unit: newUnit,
          setup_minutes: parseInt(setupMins) || 0,
          run_speed_per_hour: parseInt(runSpeed) || 0,
          parent_sheet_width: parseFloat(sheetW) || 0,
          parent_sheet_height: parseFloat(sheetH) || 0
      });

      if (error) alert(error.message);
      else {
          setNewName(''); setNewCost(''); setNewPrice('');
          setSetupMins(''); setRunSpeed(''); setSheetW(''); setSheetH('');
          fetchData();
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Delete this cost item?")) return;
      await supabase.from('pricing_components').delete().eq('id', id);
      fetchData();
  };

  const activeCategoryName = categories.find(c => c.id === activeCatId)?.name || '';
  const isPaper = activeCategoryName.toLowerCase().includes('paper');
  const isPress = activeCategoryName.toLowerCase().includes('press');

  if (loading) return <div className="p-12 text-center text-gray-400">Loading Pricing Engine...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* NAV */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <h1 className="text-xl font-bold text-gray-900">Cost Engine</h1>
            </div>
            <div className="flex gap-2">
                <Link href="/dashboard/pricing" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold flex items-center gap-2"><DollarSign size={16}/> Costs</Link>
                <Link href="/dashboard/pricing/products" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> Recipes</Link>
                <Link href="/dashboard/pricing/estimator" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><Calculator size={16}/> Estimator</Link>
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* SIDEBAR */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 h-fit">
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCatId(cat.id)} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold mb-1 transition-all ${activeCatId === cat.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT */}
            <div className="md:col-span-3 space-y-6">
                
                {/* ADD ITEM CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">Add {activeCategoryName} Item</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-bold text-gray-900 mb-1">Item Name</label>
                            <input type="text" placeholder="e.g. 100lb Gloss" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-black"/>
                        </div>
                        
                        {/* COST vs PRICE */}
                        <div>
                            <label className="block text-xs font-bold text-red-600 mb-1">Internal Cost</label>
                            <div className="relative"><span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                <input type="number" placeholder="0.04" value={newCost} onChange={(e) => setNewCost(e.target.value)} className="w-full border border-red-100 bg-red-50 rounded-lg pl-6 pr-3 py-2 text-sm outline-none focus:border-red-500"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-green-700 mb-1">Client Price</label>
                            <div className="relative"><span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                <input type="number" placeholder="0.10" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full border border-green-100 bg-green-50 rounded-lg pl-6 pr-3 py-2 text-sm outline-none focus:border-green-500"/>
                            </div>
                        </div>

                        {/* TYPE SELECTOR (Crucial Fix) */}
                        {isPress && (
                            <div>
                                <label className="block text-xs font-bold text-blue-600 mb-1">Machine Type</label>
                                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-800">
                                    <option value="press_digital">Digital (Click)</option>
                                    <option value="press_offset">Offset (Plates)</option>
                                </select>
                            </div>
                        )}
                        {!isPress && <div className="hidden"></div>} 
                    </div>

                    {/* DYNAMIC SPECS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        {isPaper && (
                            <>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Width (in)</label><input type="number" placeholder="12" value={sheetW} onChange={(e) => setSheetW(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Height (in)</label><input type="number" placeholder="18" value={sheetH} onChange={(e) => setSheetH(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/></div>
                            </>
                        )}
                        {isPress && (
                            <>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Speed (/hr)</label><input type="number" placeholder="5000" value={runSpeed} onChange={(e) => setRunSpeed(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Setup (min)</label><input type="number" placeholder="15" value={setupMins} onChange={(e) => setSetupMins(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"/></div>
                            </>
                        )}
                        <div className="col-span-2 flex items-end">
                             <button onClick={handleAddComponent} className="w-full bg-black text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-gray-800">+ Add Item</button>
                        </div>
                    </div>
                </div>

                {/* LIST */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr><th className="px-6 py-3">Item Name</th><th className="px-6 py-3">Internal Cost</th><th className="px-6 py-3">Client Price</th><th className="px-6 py-3">Specs</th><th className="px-6 py-3 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {components.filter(c => c.category_id === activeCatId).map(comp => (
                                <tr key={comp.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {comp.name}
                                        {comp.type !== 'other' && <span className="ml-2 text-[10px] uppercase bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold">{comp.type.replace('press_', '')}</span>}
                                    </td>
                                    <td className="px-6 py-4 text-red-600 font-mono text-xs">${comp.cost_amount}</td>
                                    <td className="px-6 py-4"><span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 font-mono font-bold">${comp.price_amount}</span></td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {comp.parent_sheet_width > 0 && <span>{comp.parent_sheet_width}x{comp.parent_sheet_height}"</span>}
                                        {comp.run_speed_per_hour > 0 && <span>{comp.run_speed_per_hour}/hr</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(comp.id)} className="text-gray-300 hover:text-red-600"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
}
