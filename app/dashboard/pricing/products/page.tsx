'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowLeft, Package, Layers, Settings, Zap, ScrollText } from 'lucide-react';
import Link from 'next/link';

export default function ProductRecipeBuilder() {
  const [products, setProducts] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  
  // Creation State
  const [newProductName, setNewProductName] = useState('');
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [selectedRole, setSelectedRole] = useState('substrate');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeProductId) fetchRecipe(activeProductId);
  }, [activeProductId]);

  const fetchData = async () => {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: c } = await supabase.from('pricing_components').select('*').order('name');
    if (p) {
        setProducts(p);
        if (!activeProductId && p.length > 0) setActiveProductId(p[0].id);
    }
    if (c) setComponents(c);
  };

  const fetchRecipe = async (prodId: string) => {
      const { data } = await supabase
        .from('product_recipes')
        .select('*, pricing_components(*)')
        .eq('product_id', prodId)
        .order('sort_order');
      if (data) setRecipeItems(data);
  };

  // --- ACTIONS ---
  const handleAddProduct = async () => {
      if (!newProductName.trim()) return;
      const { data, error } = await supabase.from('products').insert({ name: newProductName }).select().single();
      if (data) {
          setProducts([...products, data]);
          setActiveProductId(data.id);
          setNewProductName('');
      }
  };

  const handleAddToRecipe = async () => {
      if (!activeProductId || !selectedComponentId) return;
      await supabase.from('product_recipes').insert({
          product_id: activeProductId,
          component_id: selectedComponentId,
          component_role: selectedRole
      });
      fetchRecipe(activeProductId);
  };

  const handleRemoveFromRecipe = async (id: string) => {
      await supabase.from('product_recipes').delete().eq('id', id);
      fetchRecipe(activeProductId!);
  };

  const handleDeleteProduct = async (id: string) => {
      if (!confirm("Delete this product and its recipe?")) return;
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
      if (activeProductId === id) setActiveProductId(null);
  };

  // Helper for Icon based on Role
  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'substrate': return <ScrollText size={14} className="text-blue-500"/>;
          case 'press': return <Zap size={14} className="text-orange-500"/>;
          case 'finishing': return <Layers size={14} className="text-purple-500"/>;
          default: return <Settings size={14}/>;
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* HEADER */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Product Recipes</h1>
                    <p className="text-sm text-gray-500">Combine raw costs to build sellable products.</p>
                </div>
            </div>
            <Link href="/dashboard/pricing" className="text-xs font-bold text-blue-600 hover:underline">Manage Raw Costs &rarr;</Link>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* LEFT: PRODUCT LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">My Products</h3>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="New Product..." 
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                        />
                        <button onClick={handleAddProduct} className="bg-black text-white p-1 rounded"><Plus size={16}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {products.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => setActiveProductId(p.id)}
                            className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer text-sm ${activeProductId === p.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <span className="font-bold truncate">{p.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} className="text-gray-300 hover:text-red-500"><Trash2 size={12}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: RECIPE EDITOR */}
            <div className="md:col-span-3 space-y-6">
                {activeProductId ? (
                    <>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Package size={20}/> 
                                {products.find(p => p.id === activeProductId)?.name} Recipe
                            </h2>

                            {/* ADD INGREDIENT BAR */}
                            <div className="flex gap-2 items-end mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Add Ingredient</label>
                                    <select 
                                        value={selectedComponentId} 
                                        onChange={(e) => setSelectedComponentId(e.target.value)}
                                        className="w-full border rounded px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="">Select a cost component...</option>
                                        {components.map(c => <option key={c.id} value={c.id}>{c.name} (${c.cost_amount})</option>)}
                                    </select>
                                </div>
                                <div className="w-40">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Function</label>
                                    <select 
                                        value={selectedRole} 
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="w-full border rounded px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="substrate">Substrate (Paper)</option>
                                        <option value="press">Press (Machine)</option>
                                        <option value="finishing">Finishing (Labor)</option>
                                    </select>
                                </div>
                                <button onClick={handleAddToRecipe} className="bg-black text-white font-bold px-4 py-2 rounded text-sm h-[38px] flex items-center gap-2">
                                    <Plus size={16}/> Add
                                </button>
                            </div>

                            {/* RECIPE LIST */}
                            <div className="space-y-2">
                                {recipeItems.length === 0 && <div className="text-center py-8 text-gray-400 italic">No ingredients added yet.</div>}
                                {recipeItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-300 transition-all bg-white group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-gray-100 rounded-full text-gray-500">
                                                {getRoleIcon(item.component_role)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{item.pricing_components?.name}</p>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{item.component_role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-mono text-sm font-bold text-gray-700">${item.pricing_components?.cost_amount}</p>
                                                <p className="text-[10px] text-gray-400">{item.pricing_components?.cost_unit}</p>
                                            </div>
                                            <button onClick={() => handleRemoveFromRecipe(item.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">Select a product to edit recipe.</div>
                )}
            </div>
        </div>
    </div>
  );
}
