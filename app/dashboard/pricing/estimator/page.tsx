'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Calculator, Trophy, DollarSign, LayoutGrid, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AutoEstimatorPage() {
  const [finishW, setFinishW] = useState(8.5);
  const [finishH, setFinishH] = useState(11);
  const [quantity, setQuantity] = useState(5000);
  const [selectedPaperId, setSelectedPaperId] = useState(''); // Specific Paper

  const [papers, setPapers] = useState<any[]>([]);
  const [presses, setPresses] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [winner, setWinner] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (selectedPaperId && finishW > 0 && finishH > 0 && quantity > 0) {
        calculateBestRoute();
    }
  }, [finishW, finishH, quantity, selectedPaperId]);

  const fetchInventory = async () => {
    // Fetch all papers and presses
    const { data: pData } = await supabase.from('pricing_components').select('*').eq('type', 'paper').order('name');
    const { data: mData } = await supabase.from('pricing_components').select('*').in('type', ['press_digital', 'press_offset']);

    if (pData) {
        setPapers(pData);
        if (pData.length > 0) setSelectedPaperId(pData[0].id);
    }
    if (mData) setPresses(mData);
  };

  const calculateNUp = (parentW: number, parentH: number, itemW: number, itemH: number) => {
      const fitNormal = Math.floor(parentW / itemW) * Math.floor(parentH / itemH);
      const fitRotated = Math.floor(parentW / itemH) * Math.floor(parentH / itemW);
      return Math.max(fitNormal, fitRotated);
  };

  const calculateBestRoute = () => {
      const results: any[] = [];
      
      // Get the SPECIFIC paper selected
      const paper = papers.find(p => p.id === selectedPaperId);
      if (!paper) return;

      // 1. Calculate N-Up
      const nUp = calculateNUp(paper.parent_sheet_width, paper.parent_sheet_height, finishW, finishH);
      if (nUp === 0) return;

      const sheetsNeeded = Math.ceil(quantity / nUp);
      const sheetsWithWaste = Math.ceil(sheetsNeeded * 1.1);
      
      // Cost vs Price for Paper
      const paperCost = sheetsWithWaste * paper.cost_amount;
      const paperPrice = sheetsWithWaste * paper.price_amount;

      // 2. Test every Press
      presses.forEach(press => {
          // Filter: Does this press fit the sheet?
          if (paper.parent_sheet_width > press.max_sheet_width && press.max_sheet_width > 0) return;

          let pressCost = 0;
          let pressPrice = 0;
          let detail = '';

          if (press.type === 'press_digital') {
              pressCost = sheetsWithWaste * press.cost_amount;
              pressPrice = sheetsWithWaste * press.price_amount;
              detail = `Click: $${press.price_amount}/sheet`;
          } else {
              // Offset: Setup (Plate) + Run
              // Using setup_minutes as placeholder for plate cost if field missing, ideally use price_amount for run
              const platePrice = 50; // Hardcoded fixed setup if not in DB, usually setup_cost
              const runPrice = (sheetsWithWaste / 1000) * press.price_amount; // per 1k
              pressPrice = platePrice + runPrice;
              
              const plateCost = 15;
              const runCost = (sheetsWithWaste / 1000) * press.cost_amount;
              pressCost = plateCost + runCost;
              detail = `Offset Run`;
          }

          const totalCost = paperCost + pressCost;
          const totalPrice = paperPrice + pressPrice;

          results.push({
              method: press.name,
              sheet: `${paper.parent_sheet_width}x${paper.parent_sheet_height}"`,
              nUp,
              totalSheets: sheetsWithWaste,
              paperPrice,
              pressPrice,
              totalPrice,
              totalCost,
              detail
          });
      });

      results.sort((a, b) => a.totalPrice - b.totalPrice);
      setEstimates(results);
      if (results.length > 0) setWinner(results[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
        {/* NAV */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={20}/></Link>
                <h1 className="text-xl font-bold text-gray-900">Auto-Estimator</h1>
            </div>
            <div className="flex gap-2">
                <Link href="/dashboard/pricing" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><DollarSign size={16}/> Costs</Link>
                <Link href="/dashboard/pricing/products" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> Recipes</Link>
                <Link href="/dashboard/pricing/estimator" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold flex items-center gap-2"><Calculator size={16}/> Estimator</Link>
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* INPUTS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit space-y-6">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">1. Finished Size</label>
                    <div className="flex gap-2 items-center">
                        <input type="number" value={finishW} onChange={(e) => setFinishW(parseFloat(e.target.value))} className="w-20 border rounded p-2 text-sm font-bold text-center"/>
                        <span className="text-gray-400">x</span>
                        <input type="number" value={finishH} onChange={(e) => setFinishH(parseFloat(e.target.value))} className="w-20 border rounded p-2 text-sm font-bold text-center"/>
                        <span className="text-xs text-gray-400 ml-2">in</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">2. Quantity</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} className="w-full border rounded p-3 text-lg font-bold"/>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">3. Select Paper Stock</label>
                    <select value={selectedPaperId} onChange={(e) => setSelectedPaperId(e.target.value)} className="w-full border rounded p-3 text-sm bg-white">
                        {papers.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price_amount}/sht)</option>)}
                    </select>
                </div>
            </div>

            {/* RESULTS */}
            <div className="lg:col-span-2 space-y-6">
                {winner ? (
                    <div className="bg-green-50 rounded-xl border-2 border-green-500 p-6 relative shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Trophy size={16} className="text-green-600"/>
                                    <span className="text-xs font-bold uppercase text-green-600 tracking-wider">Best Production Route</span>
                                </div>
                                <h2 className="text-3xl font-black text-green-900 uppercase">{winner.method}</h2>
                                <p className="text-sm font-bold text-green-700 mt-1">
                                    Running {winner.nUp}-up on {winner.sheet} sheet
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-green-600 uppercase mb-1">Client Price</p>
                                <p className="text-4xl font-black text-green-900">${winner.totalPrice.toFixed(2)}</p>
                                <p className="text-xs text-green-700 font-mono mt-1">${(winner.totalPrice/quantity).toFixed(3)} / unit</p>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex gap-1 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-400 h-full" style={{ width: `${(winner.paperPrice / winner.totalPrice) * 100}%` }}></div>
                            <div className="bg-orange-400 h-full" style={{ width: `${(winner.pressPrice / winner.totalPrice) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] uppercase font-bold mt-2 text-gray-500">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-400 rounded-full"></div> Paper: ${winner.paperPrice.toFixed(2)}</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-400 rounded-full"></div> Press: ${winner.pressPrice.toFixed(2)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
                        Enter specs to see the best route.
                    </div>
                )}

                {/* COMPARISON TABLE */}
                {estimates.length > 1 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xs font-bold uppercase text-gray-500">Comparison Logic</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-gray-400 font-bold border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-2">Method</th>
                                    <th className="px-6 py-2">Layout</th>
                                    <th className="px-6 py-2">Details</th>
                                    <th className="px-6 py-2 text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {estimates.map((est, i) => (
                                    <tr key={i} className={`hover:bg-gray-50 ${i === 0 ? 'bg-green-50/50' : ''}`}>
                                        <td className="px-6 py-3 font-bold text-gray-900">
                                            {est.method}
                                            {i === 0 && <span className="ml-2 bg-green-200 text-green-800 text-[9px] px-1.5 py-0.5 rounded">WINNER</span>}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 text-xs">
                                            {est.nUp}-up on {est.sheet}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">{est.detail}</td>
                                        <td className="px-6 py-3 text-right font-mono font-bold text-gray-900">
                                            ${est.totalPrice.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
