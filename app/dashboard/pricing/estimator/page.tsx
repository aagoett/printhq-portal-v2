'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Calculator, Trophy, AlertTriangle, ArrowRight, Layout, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SmartEstimatorPage() {
  // --- STATE ---
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1000);
  
  // The "Race Results"
  const [estimates, setEstimates] = useState<any[]>([]);
  const [winner, setWinner] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) runTheRace();
  }, [selectedProductId, quantity]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  };

  // --- THE BRAIN: AUTO-IMPOSITION ENGINE ---
  const calculateNUp = (parentW: number, parentH: number, finishW: number, finishH: number) => {
      if (!parentW || !parentH || !finishW || !finishH) return 1; // Fallback

      // Try orientation A
      const colsA = Math.floor(parentW / finishW);
      const rowsA = Math.floor(parentH / finishH);
      const totalA = colsA * rowsA;

      // Try orientation B (Rotated)
      const colsB = Math.floor(parentW / finishH);
      const rowsB = Math.floor(parentH / finishW);
      const totalB = colsB * rowsB;

      return Math.max(totalA, totalB); // Return the best fit
  };

  // --- THE RACE ENGINE ---
  const runTheRace = async () => {
      const product = products.find(p => p.id === selectedProductId);
      if (!product) return;

      // 1. Get ALL recipes for this product (Digital, Offset, etc.)
      const { data: recipes } = await supabase
        .from('product_recipes')
        .select('*, pricing_components(*)')
        .eq('product_id', selectedProductId);

      if (!recipes || recipes.length === 0) {
          setEstimates([]); setWinner(null); return;
      }

      // 2. Group items by Variant Name (e.g. "Digital" vs "Offset")
      const variants: Record<string, any[]> = {};
      recipes.forEach(r => {
          const name = r.variant_name || 'Standard';
          if (!variants[name]) variants[name] = [];
          variants[name].push(r);
      });

      // 3. Calculate Cost for EACH Variant
      const results: any[] = [];

      Object.keys(variants).forEach(variantName => {
          const items = variants[variantName];
          let totalCost = 0;
          let totalPrice = 0;
          let impositionDetails = '';

          items.forEach(item => {
              const comp = item.pricing_components;
              if (!comp) return;

              // AUTO-IMPOSITION LOGIC
              let nUp = 1;
              if (item.component_role === 'substrate' && comp.parent_sheet_width > 0) {
                  nUp = calculateNUp(comp.parent_sheet_width, comp.parent_sheet_height, product.width, product.height);
                  impositionDetails = `${nUp}-up on ${comp.parent_sheet_width}x${comp.parent_sheet_height}`;
              }

              // MATH
              const totalSheets = Math.ceil(quantity / nUp);
              const sheetsWithWaste = Math.ceil(totalSheets * 1.1); // 10% Waste

              let lineCost = 0;
              let linePrice = 0;

              if (comp.cost_unit === 'per_sheet') {
                  lineCost = sheetsWithWaste * comp.cost_amount;
                  linePrice = sheetsWithWaste * (comp.price_amount || comp.cost_amount);
              } 
              else if (comp.cost_unit === 'per_hour') {
                  const runHrs = comp.run_speed_per_hour > 0 ? sheetsWithWaste / comp.run_speed_per_hour : 0;
                  const setupHrs = (comp.setup_minutes || 0) / 60;
                  lineCost = (runHrs + setupHrs) * comp.cost_amount;
                  linePrice = (runHrs + setupHrs) * (comp.price_amount || comp.cost_amount);
              }
              else if (comp.cost_unit === 'per_job') {
                  lineCost = comp.cost_amount;
                  linePrice = comp.price_amount || comp.cost_amount;
              }
              else if (comp.cost_unit === 'per_1000') {
                  lineCost = (quantity / 1000) * comp.cost_amount;
                  linePrice = (quantity / 1000) * (comp.price_amount || comp.cost_amount);
              }

              totalCost += lineCost;
              totalPrice += linePrice;
          });

          results.push({
              method: variantName,
              cost: totalCost,
              price: totalPrice,
              margin: ((totalPrice - totalCost) / totalPrice * 100),
              imposition: impositionDetails
          });
      });

      // 4. Sort by Lowest Cost (The Winner)
      results.sort((a, b) => a.cost - b.cost);
      setEstimates(results);
      setWinner(results[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        {/* NAV */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <h1 className="text-xl font-bold text-gray-900">Smart Estimator</h1>
            </div>
            <div className="flex gap-2">
                <Link href="/dashboard/pricing" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><DollarSign size={16}/> Costs</Link>
                <Link href="/dashboard/pricing/products" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><Layout size={16}/> Recipes</Link>
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* CONTROLS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 h-fit">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">1. What are we making?</label>
                    <select 
                        value={selectedProductId} 
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-3 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none"
                    >
                        <option value="">-- Select Product --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">2. How many?</label>
                    <input 
                        type="number" 
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        className="w-full border rounded-lg px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-black outline-none"
                    />
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-2"><Calculator size={12}/> Auto-Calculations</h4>
                    <p className="text-[10px] text-blue-600">
                        The system automatically calculates <strong>N-Up imposition</strong> based on paper size and run speeds based on quantity.
                    </p>
                </div>
            </div>

            {/* RESULTS */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* THE WINNER CARD */}
                {winner && (
                    <div className="bg-green-50 rounded-xl border-2 border-green-500 p-6 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                            <Trophy size={12}/> Best Value
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-black text-green-900 uppercase tracking-tight">{winner.method} Route</h2>
                                <p className="text-xs font-bold text-green-700 mt-1">{winner.imposition}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-green-700 uppercase">Total Cost</p>
                                <p className="text-3xl font-black text-green-900">${winner.cost.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-green-200 pt-4 mt-4">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-green-600">Client Price</p>
                                <p className="text-lg font-bold text-green-900">${winner.price.toFixed(2)}</p>
                                <p className="text-[10px] text-green-700">${(winner.price/quantity).toFixed(3)} ea</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-green-600">Profit Margin</p>
                                <p className="text-lg font-bold text-green-900">{winner.margin.toFixed(1)}%</p>
                                <p className="text-[10px] text-green-700">${(winner.price - winner.cost).toFixed(2)} Profit</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* THE LOSERS TABLE */}
                {estimates.length > 1 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-xs text-gray-500 uppercase">Alternative Methods</h3>
                        </div>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-50">
                                {estimates.slice(1).map((est, i) => (
                                    <tr key={i} className="hover:bg-gray-50 group">
                                        <td className="px-6 py-3 font-bold text-gray-400">{est.method}</td>
                                        <td className="px-6 py-3 text-gray-400 text-xs">{est.imposition}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="font-mono font-bold text-gray-400 decoration-gray-300 line-through mr-2">${est.cost.toFixed(2)}</span>
                                            <span className="text-[10px] text-red-400 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                                                +${(est.cost - winner.cost).toFixed(2)} More
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!winner && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <TrendingDown size={32} className="mb-2 opacity-20"/>
                        <p>Select a product to run the analysis.</p>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
}
