'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, DollarSign, Settings, Save, ArrowLeft } from 'lucide-react';
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
          cost_unit: newUnit
      });

      if (error) alert(error.message);
      else {
          setNewName('');
          setNewCost('');
          fetchData();
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Delete this cost item?")) return;
      await supabase.from('pricing_components').delete().eq('id', id);
      fetchData();
  };

  // Helper to format unit labels
  const formatUnit = (u: string) => {
      switch(u) {
          case 'per_sheet': return '/ Sheet';
          case 'per_job': return 'Fixed (Setup)';
          case 'per_1000': return '/ 1,000';
          case 'per_hour': return '/ Hour';
          default: return u;
      }
  };

  if (loading) return <div className="p-12 text-center text-gray-400">Loading Pricing Engine...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* HEADER */}
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cost Engine</h1>
                    <p className="text-sm text-gray-500">Define your raw costs for materials, labor, and machines.</p>
                </div>
            </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* SIDEBAR: CATEGORIES */}
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

            {/* MAIN: COST ITEMS */}
            <div className="md:col-span-3 space-y-6">
                
                {/* ADD NEW ITEM CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">Add New Cost Item</h3>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-gray-900 mb-1">Item Name</label>
                            <input 
                                type="text" 
                                placeholder="e.g. 100lb Gloss Cover" 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-xs font-bold text-gray-900 mb-1">Internal Cost</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={newCost}
                                    onChange={(e) => setNewCost(e.target.value)}
                                    className="w-full border rounded-lg pl-6 pr-3 py-2 text-sm outline-none focus:border-black"
                                />
                            </div>
                        </div>
                        <div className="w-40">
                            <label className="block text-xs font-bold text-gray-900 mb-1">Cost Unit</label>
                            <select 
                                value={newUnit} 
                                onChange={(e) => setNewUnit(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                            >
                                <option value="per_sheet">Per Sheet</option>
                                <option value="per_job">Per Job (Setup)</option>
                                <option value="per_1000">Per 1,000 (Run)</option>
                                <option value="per_hour">Per Hour</option>
                            </select>
                        </div>
                        <button onClick={handleAddComponent} className="bg-black text-white font-bold px-6 py-2 rounded-lg text-sm hover:bg-gray-800 h-[38px]">
                            Add
                        </button>
                    </div>
                </div>

                {/* LIST OF EXISTING ITEMS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Item Name</th>
                                <th className="px-6 py-3">Cost Basis</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {components
                                .filter(c => c.category_id === activeCatId)
                                .map(comp => (
                                <tr key={comp.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 font-medium text-gray-900">{comp.name}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 font-mono font-bold">
                                            ${comp.cost_amount}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-400 uppercase font-bold tracking-wide">
                                            {formatUnit(comp.cost_unit)}
                                        </span>
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
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">No items in this category yet.</td>
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
