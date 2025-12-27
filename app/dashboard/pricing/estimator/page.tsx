'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Calculator, DollarSign, ArrowRight, RefreshCw, Layers, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PricingEstimatorPage() {
  // --- DATA STATE ---
  const [products, setProducts] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [recipe, setRecipe] = useState<any[]>([]);
  
  // --- INPUT STATE ---
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTierId, setSelectedTierId] = useState(''); // E.g. Standard vs Wholesale
  const [quantity, setQuantity] = useState(1000);
  const [itemsPerSheet, setItemsPerSheet] = useState(1); // Crucial "N-Up" variable

  // --- CALCULATION STATE ---
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Whenever inputs change, Re-Calculate
  useEffect(() => {
    if (selectedProductId && recipe.length > 0) {
        calculatePrice();
    }
  }, [selectedProductId, quantity, itemsPerSheet, recipe, selectedTierId]);

  const fetchInitialData = async () => {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: t } = await supabase.from('pricing_tiers').select('*').order('name');
    if (p) setProducts(p);
    if (t) {
        setTiers(t);
        // Default to first tier if exists
        if (t.length > 0) setSelectedTierId(t[0].id);
    }
  };

  const handleProductChange = async (prodId: string) => {
      setSelectedProductId(prodId);
      // Fetch the recipe for this product
      const { data } = await supabase
        .from('product_recipes')
        .select('*, pricing_components(*)')
        .eq('product_id', prodId);
      
      if (data) {
          setRecipe(data);
          // Try to guess reasonable defaults based on the recipe
          // (e.g. if it's 12x18 paper, maybe default N-up is 24 for biz cards?)
          setItemsPerSheet(1); 
      }
  };

  // --- THE MATH ENGINE ---
  const calculatePrice = () => {
      let runningCost = 0;
      const detailedBreakdown: any[] = [];

      // 1. Calculate Substrate Requirements
      // Round UP because you can't run half a sheet
      const totalSheets = Math.ceil(quantity / itemsPerSheet); 
      // Add standard 10% waste (Hardcoded for now, can be a setting later)
      const totalSheetsWithWaste = Math.ceil(totalSheets * 1.1); 

      recipe.forEach((item) => {
          const comp = item.pricing_components;
          if (!comp) return;

          let lineCost = 0;
          let explanation = '';

          // LOGIC BRANCHING
          if (comp.cost_unit === 'per_sheet') {
              // Material Cost
              lineCost = totalSheetsWithWaste * comp.cost_amount;
              explanation = `${totalSheetsWithWaste} sheets @ $${comp.cost_amount} (incl. 10% waste)`;
          } 
          else if (comp.cost_unit === 'per_hour') {
              // Machine Time
              const runHours = comp.run_speed_per_hour > 0 
                ? totalSheetsWithWaste / comp.run_speed_per_hour 
                : 0;
              const setupHours = comp.setup_minutes / 60;
              const totalHours = runHours + setupHours;
              
              lineCost = totalHours * comp.cost_amount;
              explanation = `${totalHours.toFixed(2)} hrs @ $${comp.cost_amount}/hr (${comp.run_speed_per_hour}/hr speed)`;
          }
          else if (comp.cost_unit === 'per_job') {
              // Fixed Setup
              lineCost = comp.cost_amount;
              explanation = 'Fixed Setup Fee';
          }
          else if (comp.cost_unit === 'per_1000') {
              // Finishing Run Rate
              lineCost = (quantity / 1000) * comp.cost_amount;
              explanation = `${(quantity/1000).toFixed(1)}k units @ $${comp.cost_amount}/k`;
          }

          runningCost += lineCost;
          detailedBreakdown.push({
              name: comp.name,
              role: item.component_role,
              cost: lineCost,
              detail: explanation
          });
      });

      setTotalCost(runningCost);
      setBreakdown(detailedBreakdown);

      // Apply Markup (Simple 2x for now, or fetch from DB tier logic later)
      // Realistically, you'd pull a markup percentage from the `pricing_tiers` table
      const markup = selectedTierId ? 2.5 : 1.5; // Placeholder logic
      setFinalPrice(runningCost * markup);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* HEADER */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/pricing" className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Price Estimator</h1>
                    <p className="text-sm text-gray-500">Test your recipes and check profit margins.</p>
                </div>
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* INPUT PANEL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 h-fit">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">1. Select Product</label>
                    <select 
                        value={selectedProductId} 
                        onChange={(e) => handleProductChange(e.target.value)}
                        className="w-full border rounded-lg px-3 py-3 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:outline-none"
                    >
                        <option value="">-- Choose Product --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">2. Quantity</label>
                        <input 
                            type="number" 
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            className="w-full border rounded-lg px-3 py-3 text-sm font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">3. Outs (N-Up)</label>
                        <input 
                            type="number" 
                            value={itemsPerSheet}
                            onChange={(e) => setItemsPerSheet(parseInt(e.target.value) || 1)}
                            className="w-full border rounded-lg px-3 py-3 text-sm font-bold"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Items per parent sheet</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">4. Customer Tier</label>
                    <select 
                        value={selectedTierId} 
                        onChange={(e) => setSelectedTierId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-3 text-sm bg-white"
                    >
                        {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <button onClick={calculatePrice} className="w-full bg-black text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all">
                    <RefreshCw size={18}/> Re-Calculate
                </button>
            </div>

            {/* RESULTS PANEL */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* BIG NUMBERS CARD */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Raw Cost</p>
                        <p className="text-2xl font-bold text-red-600">${totalCost.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">Production Only</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Client Price</p>
                        <p className="text-2xl font-bold text-black">${finalPrice.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">
                            ${(finalPrice / quantity).toFixed(3)} / unit
                        </p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-xl border border-green-200 shadow-sm">
                        <p className="text-xs font-bold text-green-700 uppercase mb-1">Est. Profit</p>
                        <p className="text-2xl font-bold text-green-800">${(finalPrice - totalCost).toFixed(2)}</p>
                        <p className="text-[10px] text-green-600 font-bold">
                            {((finalPrice - totalCost) / finalPrice * 100).toFixed(1)}% Margin
                        </p>
                    </div>
                </div>

                {/* THE RECEIPT (Cost Breakdown) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Calculator size={16}/> Cost Breakdown</h3>
                    </div>
                    {breakdown.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic">Select a product to view estimate.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-50">
                                {breakdown.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-3">
                                            <p className="font-bold text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">{item.role}</p>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <p className="font-mono font-medium text-gray-700">${item.cost.toFixed(2)}</p>
                                            <p className="text-[10px] text-gray-400">{item.detail}</p>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 border-t-2 border-gray-100">
                                    <td className="px-6 py-4 font-bold text-gray-900 uppercase text-xs">Total Cost of Goods</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 font-mono">${totalCost.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    </div>
  );
}
