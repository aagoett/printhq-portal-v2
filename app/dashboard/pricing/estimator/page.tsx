'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Trophy, DollarSign, LayoutGrid, ArrowLeft, Save, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { applyOverridesToList, CustomerPricingOverride, formatCurrency } from '@/utils/pricing';

type ProfileLite = {
  id: string;
  email: string;
  first_name?: string;
  company?: string;
  role?: string;
};

type PricingComponent = {
  id: string;
  name: string;
  type: string;
  price_amount: number;
  cost_amount: number;
  parent_sheet_width?: number;
  parent_sheet_height?: number;
  max_sheet_width?: number;
  cost_unit?: string;
  setup_minutes?: number;
  run_speed_per_hour?: number;
};

export default function AutoEstimatorPage() {
  const router = useRouter();
  
  // --- INPUTS ---
  const [finishW, setFinishW] = useState(8.5);
  const [finishH, setFinishH] = useState(11);
  const [quantity, setQuantity] = useState(5000);
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [quoteTitle, setQuoteTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Customer context for overrides
  const [currentProfile, setCurrentProfile] = useState<ProfileLite | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [customers, setCustomers] = useState<ProfileLite[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerOverrides, setCustomerOverrides] = useState<CustomerPricingOverride[]>([]);

  // --- DATA ---
  const [papers, setPapers] = useState<PricingComponent[]>([]);
  const [presses, setPresses] = useState<PricingComponent[]>([]);
  const [finishing, setFinishing] = useState<PricingComponent[]>([]);
  const [mailing, setMailing] = useState<PricingComponent[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [winner, setWinner] = useState<any>(null);
  
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [selectedMailingId, setSelectedMailingId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedPaperId && finishW > 0 && finishH > 0 && quantity > 0) {
        calculateBestRoute();
    }
  }, [finishW, finishH, quantity, selectedPaperId, selectedFinishingIds, selectedMailingId, customerOverrides, selectedTemplate, papers, presses, finishing, mailing]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadOverrides(selectedCustomerId);
    } else {
      setCustomerOverrides([]);
    }
  }, [selectedCustomerId]);

  const bootstrap = async () => {
    // Fetch auth + profile
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
      if (profileData) {
        const internal = profileData.role === 'admin' || profileData.role === 'staff';
        setCurrentProfile(profileData);
        setIsInternal(internal);
        setSelectedCustomerId(auth.user.id);

        if (internal) {
          const { data: people } = await supabase
            .from('profiles')
            .select('id, email, first_name, company, role')
            .order('email');
          if (people) setCustomers(people);
        } else {
          setCustomers([profileData]);
        }
      }
    }

    await fetchInventory();
    setLoadingBootstrap(false);
  };

  const fetchInventory = async () => {
    const { data: pData } = await supabase.from('pricing_components').select('*').eq('type', 'paper').order('name');
    const { data: mData } = await supabase.from('pricing_components').select('*').in('type', ['press_digital', 'press_offset']);
    const { data: fData } = await supabase.from('pricing_components').select('*').eq('type', 'finishing').order('name');
    const { data: mailData } = await supabase.from('pricing_components').select('*').eq('type', 'mailing').order('name');

    if (pData) {
        setPapers(pData as any);
        if (pData.length > 0 && !selectedPaperId) setSelectedPaperId(pData[0].id);
    }
    if (mData) setPresses(mData as any);
    if (fData) setFinishing(fData as any);
    if (mailData) setMailing(mailData as any);
  };

  const loadOverrides = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('customer_id', customerId);
      if (error) {
        console.error('customer_pricing error', error.message);
        setCustomerOverrides([]);
        return;
      }
      setCustomerOverrides(data || []);
    } catch (err) {
      console.error('customer_pricing unexpected error', err);
      setCustomerOverrides([]);
    }
  };

  const paperOptions = useMemo(
    () => applyOverridesToList(papers, customerOverrides, { templateKey: selectedTemplate, componentType: 'paper' }),
    [papers, customerOverrides, selectedTemplate]
  );
  const pressOptions = useMemo(
    () => applyOverridesToList(presses, customerOverrides, { templateKey: selectedTemplate, componentType: 'press' }),
    [presses, customerOverrides, selectedTemplate]
  );
  const finishingOptions = useMemo(
    () => applyOverridesToList(finishing, customerOverrides, { templateKey: selectedTemplate, componentType: 'finishing' }),
    [finishing, customerOverrides, selectedTemplate]
  );
  const mailingOptions = useMemo(
    () => applyOverridesToList(mailing, customerOverrides, { templateKey: selectedTemplate, componentType: 'mailing' }),
    [mailing, customerOverrides, selectedTemplate]
  );

  const calculateNUp = (parentW: number, parentH: number, itemW: number, itemH: number) => {
      const fitNormal = Math.floor(parentW / itemW) * Math.floor(parentH / itemH);
      const fitRotated = Math.floor(parentW / itemH) * Math.floor(parentH / itemW);
      return Math.max(fitNormal, fitRotated);
  };

  const calculateBestRoute = () => {
      const results: any[] = [];
      const paper = paperOptions.find(p => p.id === selectedPaperId) || paperOptions[0];
      if (!paper) return;

      const nUp = calculateNUp(paper.parent_sheet_width, paper.parent_sheet_height, finishW, finishH);
      if (nUp === 0) return;

      const sheetsNeeded = Math.ceil(quantity / nUp);
      const sheetsWithWaste = Math.ceil(sheetsNeeded * 1.1);
      const paperCost = sheetsWithWaste * paper.cost_amount;
      const paperPrice = sheetsWithWaste * paper.price_amount;

      // Calculate Finishing
      let totalFinishingCost = 0;
      let totalFinishingPrice = 0;
      const selectedFinishes = finishingOptions.filter(f => selectedFinishingIds.includes(f.id));
      selectedFinishes.forEach(f => {
          if (f.cost_unit === 'per_sheet') {
              totalFinishingCost += sheetsWithWaste * f.cost_amount;
              totalFinishingPrice += sheetsWithWaste * f.price_amount;
          } else {
              totalFinishingCost += f.cost_amount;
              totalFinishingPrice += f.price_amount;
          }
      });

      // Calculate Mailing
      let totalMailingCost = 0;
      let totalMailingPrice = 0;
      let mailDetail = '';
      if (selectedMailingId) {
          const mail = mailingOptions.find(m => m.id === selectedMailingId);
          if (mail) {
              if (mail.cost_unit === 'per_piece' || mail.cost_unit === 'per_item') {
                  totalMailingCost = quantity * mail.cost_amount;
                  totalMailingPrice = quantity * mail.price_amount;
              } else {
                  totalMailingCost = mail.cost_amount;
                  totalMailingPrice = mail.price_amount;
              }
              mailDetail = mail.name;
          }
      }

      pressOptions.forEach(press => {
          if (paper.parent_sheet_width > (press as any).max_sheet_width && (press as any).max_sheet_width > 0) return;

          let pressCost = 0;
          let pressPrice = 0;
          let detail = '';

          if (press.type === 'press_digital') {
              pressCost = sheetsWithWaste * press.cost_amount;
              pressPrice = sheetsWithWaste * press.price_amount;
              detail = `Click: $${press.price_amount}/sheet`;
          } else {
              const setupHr = (press.setup_minutes || 0) / 60;
              const runHr = sheetsWithWaste / (press.run_speed_per_hour || 5000);
              const totalHr = setupHr + runHr;
              if (press.price_amount < 50) {
                  const platePrice = 50; 
                  const runPrice = (sheetsWithWaste / 1000) * press.price_amount; 
                  pressPrice = platePrice + runPrice;
                  
                  const plateCost = 15;
                  const runCost = (sheetsWithWaste / 1000) * press.cost_amount;
                  pressCost = plateCost + runCost;
                  detail = `Offset (Run: ${sheetsWithWaste} sheets)`;
              } else {
                  const platePrice = 50;
                  const plateCost = 15;
                  pressPrice = platePrice + (totalHr * press.price_amount);
                  pressCost = plateCost + (totalHr * press.cost_amount);
                  detail = `Presstime: ${totalHr.toFixed(2)} hrs @ $${press.price_amount}/hr`;
              }
          }

          const totalCost = paperCost + pressCost + totalFinishingCost + totalMailingCost;
          const totalPrice = paperPrice + pressPrice + totalFinishingPrice + totalMailingPrice;

          results.push({
              method: press.name,
              sheet: `${paper.parent_sheet_width}x${paper.parent_sheet_height}"`,
              nUp,
              totalSheets: sheetsWithWaste,
              paperPrice,
              pressPrice,
              finishingPrice: totalFinishingPrice,
              mailingPrice: totalMailingPrice,
              totalPrice,
              totalCost,
              unitCost: totalPrice / quantity,
              detail,
              paperName: paper.name,
              breakdown: [
                  { name: 'Paper', cost: paperCost, detail: `${sheetsWithWaste} sheets of ${paper.name}` },
                  { name: 'Press', cost: pressCost, detail },
                  { name: 'Finishing', cost: totalFinishingCost, detail: selectedFinishes.map(f => f.name).join(', ') || 'None' },
                  { name: 'Mailing', cost: totalMailingCost, detail: mailDetail || 'None' }
              ]
          });
      });

      results.sort((a, b) => a.totalPrice - b.totalPrice);
      setEstimates(results);
      if (results.length > 0) setWinner(results[0]);
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSaveQuote = async () => {
      if (!winner) return;
      const title = quoteTitle || `Estimate for ${quantity}x ${finishW}x${finishH}`;
      setIsSaving(true);

      const { error } = await supabase.from('quotes').insert({
          title: title,
          quantity: quantity,
          width: finishW,
          height: finishH,
          paper_stock: winner.paperName,
          production_method: winner.method,
          total_cost: winner.totalCost,
          total_price: winner.totalPrice,
          cost_breakdown: winner, // Store the full math object
          status: 'Draft',
          user_id: selectedCustomerId || null,
          customer_email: selectedCustomer?.email || currentProfile?.email || null
      });

      if (error) {
          alert('Error saving quote: ' + error.message);
          setIsSaving(false);
      } else {
          router.push('/dashboard/quotes'); // Redirect to list
      }
  };

  if (loadingBootstrap) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

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
                <Link href="/dashboard/quotes" className="px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-lg text-sm font-bold flex items-center gap-2"><LayoutGrid size={16}/> My Quotes</Link>
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* INPUTS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit space-y-6">
                {isInternal && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2"><Users size={14}/> Customer (for overrides)</label>
                    <select 
                      value={selectedCustomerId} 
                      onChange={(e) => setSelectedCustomerId(e.target.value)} 
                      className="w-full border rounded p-2 text-sm bg-white"
                    >
                      <option value="">-- None / Guest --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name || c.company ? `${c.first_name || c.company} (${c.email})` : c.email}
                        </option>
                      ))}
                    </select>
                    {customerOverrides.length > 0 && (
                      <p className="text-[11px] text-green-700 mt-1">{customerOverrides.length} override(s) will be applied.</p>
                    )}
                  </div>
                )}
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Quote Reference</label>
                    <input type="text" placeholder="e.g. Haleigh's Flyers" value={quoteTitle} onChange={(e) => setQuoteTitle(e.target.value)} className="w-full border rounded p-2 text-sm focus:border-black outline-none"/>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Template / SKU (optional)</label>
                    <input type="text" placeholder="e.g. bc-template-16pt" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full border rounded p-2 text-sm focus:border-black outline-none"/>
                </div>
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
                        {paperOptions.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price_amount)}/sht{p.__override ? ' • override' : ''})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">4. Finishing Options</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded bg-gray-50">
                        {finishingOptions.map(f => (
                            <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selectedFinishingIds.includes(f.id)} 
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedFinishingIds([...selectedFinishingIds, f.id]);
                                        else setSelectedFinishingIds(selectedFinishingIds.filter(id => id !== f.id));
                                    }}
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                />
                                <span className="flex-1">{f.name}</span>
                                <span className="text-xs font-mono text-gray-400">{formatCurrency(f.price_amount)}</span>
                                {f.__override && <span className="text-[10px] text-green-700 font-bold">override</span>}
                            </label>
                        ))}
                        {finishingOptions.length === 0 && <p className="text-xs text-gray-400 italic">No finishing options found.</p>}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">5. Mailing</label>
                    <select 
                        value={selectedMailingId || ''} 
                        onChange={(e) => setSelectedMailingId(e.target.value || null)} 
                        className="w-full border rounded p-3 text-sm bg-white"
                    >
                        <option value="">No Mailing</option>
                        {mailingOptions.map(m => <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.price_amount)}/{m.cost_unit?.replace('per_', '')}{m.__override ? ' • override' : ''})</option>)}
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
                                {selectedTemplate && <p className="text-xs text-green-700 mt-1">Template: {selectedTemplate}</p>}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-green-600 uppercase mb-1">Client Price</p>
                                <p className="text-4xl font-black text-green-900">${winner.totalPrice.toFixed(2)}</p>
                                <p className="text-xs text-green-700 font-mono mt-1">${winner.unitCost.toFixed(3)} / unit</p>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex gap-1 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-400 h-full" style={{ width: `${(winner.paperPrice / winner.totalPrice) * 100}%` }}></div>
                            <div className="bg-orange-400 h-full" style={{ width: `${(winner.pressPrice / winner.totalPrice) * 100}%` }}></div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-green-200 flex justify-end">
                            <button onClick={handleSaveQuote} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-lg transition-all">
                                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                Save as Quote
                            </button>
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
