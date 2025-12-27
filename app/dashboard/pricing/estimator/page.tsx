'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Calculator, RefreshCw, LayoutGrid, DollarSign, ArrowLeft, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function PricingEstimatorPage() {
  const [products, setProducts] = useState<any[]>([]);
  
  // Comparison State
  const [prodA, setProdA] = useState('');
  const [prodB, setProdB] = useState(''); // Optional second product
  
  const [quantity, setQuantity] = useState(1000);
  const [nUp, setNUp] = useState(1);

  // Results
  const [resultA, setResultA] = useState<any>(null);
  const [resultB, setResultB] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (prodA) calculatePrice(prodA, setResultA);
    if (prodB) calculatePrice(prodB, setResultB);
    else setResultB(null);
  }, [prodA, prodB, quantity, nUp]);

  const fetchInitialData = async () => {
    const { data: p } = await supabase.from('products').select('*').order('name');
    if (p) setProducts(p);
  };

  const calculatePrice = async (productId: string, setFn: any) => {
      const { data: recipe } = await supabase
        .from('product_recipes')
        .select('*, pricing_components(*)')
        .eq('product_id', productId);
      
      if (!recipe) return;

      let totalInternalCost = 0;
      let totalClientPrice = 0;
      const breakdown: any[] = [];

      // 1. Paper Math
      const totalSheets = Math.ceil(quantity / nUp); 
      const sheetsWithWaste = Math.ceil(totalSheets * 1.1); // 10% Waste

      recipe.forEach((item: any) => {
          const comp = item.pricing_components;
          if (!comp) return;

          let costLine = 0;
          let priceLine = 0;
          let detail = '';

          if (comp.cost_unit === 'per_sheet') {
              costLine = sheetsWithWaste * comp.cost_amount;
              priceLine = sheetsWithWaste * (comp.price_amount || comp.cost_amount);
              detail = `${sheetsWithWaste} sheets`;
          } 
          else if (comp.cost_unit === 'per_hour') {
              const runHrs = comp.run_speed_per_hour > 0 ? sheetsWithWaste / comp.run_speed_per_hour : 0;
              const setupHrs = comp.setup_minutes / 60;
              const totalHrs = runHrs + setupHrs;
              
              costLine = totalHrs * comp.cost_amount;
              priceLine = totalHrs * (comp.price_amount || comp.cost_amount);
              detail = `${totalHrs.toFixed(2)} hrs`;
          }
          else if (comp.cost_unit === 'per_job') {
              costLine = comp.cost_amount;
              priceLine = comp.price_amount || comp.cost_amount; // e.g. $350 Setup
              detail = 'Fixed';
          }
          else if (comp.cost_unit === 'per_1000') {
              costLine = (quantity / 1000) * comp.cost_amount;
              priceLine = (quantity / 1000) * (comp.price_amount || comp.cost_amount);
              detail = 'Run Rate';
          }

          totalInternalCost += costLine;
          totalClientPrice += priceLine;
          
          breakdown.push({ name: comp.name, cost: costLine, price: priceLine, detail });
      });

      setFn({ cost: totalInternalCost, price: totalClientPrice, breakdown });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* NAV */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <h1 className="text-xl font-bold text-gray-900">Estimator & Comparison</h1>
            </div>
            <div className="flex gap-2">
                <Link href="/dashboard/pricing" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><DollarSign size={16}/> Costs</Link>
                <Link href="/dashboard/pricing/products" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> Recipes</Link>
                <Link href="/dashboard/pricing/estimator" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold flex items-center gap-2"><Calculator size={16}/> Estimator</Link>
            </div>
        </div>

        {/* CONTROLS */}
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Option A (Primary)</label>
                    <select value={prodA} onChange={(e) => setProdA(e.target.value)} className="w-full border rounded-lg px-3 py-3 text-sm font-bold bg-gray-50">
                        <option value="">-- Select Product --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Option B (Compare)</label>
                    <select value={prodB} onChange={(e) => setProdB(e.target.value)} className="w-full border rounded-lg px-3 py-3 text-sm font-bold bg-gray-50">
                        <option value="">-- None (Single Estimate) --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Quantity</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-3 text-sm font-bold"/>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">N-Up (Per Sheet)</label>
                    <input type="number" value={nUp} onChange={(e) => setNUp(parseInt(e.target.value) || 1)} className="w-full border rounded-lg px-3 py-3 text-sm font-bold"/>
                </div>
            </div>
        </div>

        {/* RESULTS GRID */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* OPTION A */}
            {resultA && (
                <div className={`rounded-xl shadow-sm border p-6 transition-all ${resultB && resultA.price < resultB.price ? 'bg-green-50 border-green-200 ring-2 ring-green-100' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-lg text-gray-900">{products.find(p => p.id === prodA)?.name}</h3>
                        {resultB && resultA.price < resultB.price && <span className="bg-green-200 text-green-800 text-[10px] font-bold px-2 py-1 rounded uppercase">Best Value</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-white/50 rounded border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Client Price</p>
                            <p className="text-2xl font-bold text-gray-900">${resultA.price.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">${(resultA.price/quantity).toFixed(3)} ea</p>
                        </div>
                        <div className="p-4 bg-white/50 rounded border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Est. Profit</p>
                            <p className="text-xl font-bold text-green-600">${(resultA.price - resultA.cost).toFixed(2)}</p>
                            <p className="text-xs text-green-500 font-bold">{((resultA.price - resultA.cost)/resultA.price * 100).toFixed(1)}% Margin</p>
                        </div>
                    </div>

                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {resultA.breakdown.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-black/5">
                                    <td className="py-2 text-gray-600">{row.name} <span className="text-xs text-gray-400 ml-1">({row.detail})</span></td>
                                    <td className="py-2 text-right font-bold">${row.price.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* OPTION B */}
            {resultB && (
                <div className={`rounded-xl shadow-sm border p-6 transition-all ${resultB.price < resultA.price ? 'bg-green-50 border-green-200 ring-2 ring-green-100' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-lg text-gray-900">{products.find(p => p.id === prodB)?.name}</h3>
                        {resultB.price < resultA.price && <span className="bg-green-200 text-green-800 text-[10px] font-bold px-2 py-1 rounded uppercase">Best Value</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-white/50 rounded border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Client Price</p>
                            <p className="text-2xl font-bold text-gray-900">${resultB.price.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">${(resultB.price/quantity).toFixed(3)} ea</p>
                        </div>
                        <div className="p-4 bg-white/50 rounded border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Est. Profit</p>
                            <p className="text-xl font-bold text-green-600">${(resultB.price - resultB.cost).toFixed(2)}</p>
                            <p className="text-xs text-green-500 font-bold">{((resultB.price - resultB.cost)/resultB.price * 100).toFixed(1)}% Margin</p>
                        </div>
                    </div>

                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {resultB.breakdown.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-black/5">
                                    <td className="py-2 text-gray-600">{row.name} <span className="text-xs text-gray-400 ml-1">({row.detail})</span></td>
                                    <td className="py-2 text-right font-bold">${row.price.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    </div>
  );
}
