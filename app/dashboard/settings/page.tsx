'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Trash2, Plus, Save, Layers, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [newStock, setNewStock] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // 1. Check Role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin' || profile?.role === 'staff') setIsAdmin(true);
    }

    // 2. Fetch Stocks
    const { data } = await supabase.from('paper_stocks').select('*').order('name');
    if (data) setStocks(data);
    setLoading(false);
  };

  const handleAddStock = async () => {
    if (!newStock.trim()) return;
    const { data, error } = await supabase.from('paper_stocks').insert({ name: newStock }).select().single();
    if (data) setStocks([...stocks, data]);
    setNewStock('');
  };

  const handleDeleteStock = async (id: string) => {
    await supabase.from('paper_stocks').delete().eq('id', id);
    setStocks(stocks.filter(s => s.id !== id));
  };

  if (loading) return <div className="p-12">Loading settings...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="p-2 bg-white rounded-full text-gray-500 hover:text-black shadow-sm">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        </div>

        {/* PAPER LIBRARY CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Layers size={18} className="text-blue-500"/> Paper Stock Library
                    </h3>
                    <p className="text-xs text-gray-500">Manage the dropdown options for new orders.</p>
                </div>
                {!isAdmin && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Admin Only</span>}
            </div>

            <div className="p-6">
                {/* ADD NEW */}
                {isAdmin && (
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value)}
                            placeholder="Add new stock (e.g. 16pt Soft Touch)..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                        />
                        <button 
                            onClick={handleAddStock}
                            disabled={!newStock.trim()}
                            className="bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
                        >
                            <Plus size={18} /> Add
                        </button>
                    </div>
                )}

                {/* LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stocks.map((stock) => (
                        <div key={stock.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
                            <span className="font-medium text-gray-700">{stock.name}</span>
                            {isAdmin && (
                                <button onClick={() => handleDeleteStock(stock.id)} className="text-gray-300 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    {stocks.length === 0 && <div className="text-gray-400 text-sm italic">No stocks found.</div>}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
