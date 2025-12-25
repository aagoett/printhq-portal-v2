'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Plus, Trash2, GripVertical, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Department = {
  id: string;
  name: string;
  sort_order: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    // Fetch Departments sorted by 'sort_order'
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('sort_order', { ascending: true });
      
    if (data) setDepartments(data);
    setLoading(false);
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setIsSaving(true);

    const nextOrder = departments.length > 0 ? Math.max(...departments.map(d => d.sort_order)) + 1 : 1;

    const { data } = await supabase
      .from('departments')
      .insert({ name: newDeptName, sort_order: nextOrder })
      .select()
      .single();

    if (data) {
      setDepartments([...departments, data]);
      setNewDeptName('');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will remove this station from future dropdowns.')) return;
    
    // Optimistic UI update
    setDepartments(departments.filter(d => d.id !== id));

    await supabase.from('departments').delete().eq('id', id);
  };

  if (loading) return <div className="p-12 text-center">Loading Settings...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* BACK BUTTON */}
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-8 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="mr-3" /> Shop Settings
          </h1>
          <p className="text-gray-500 mt-1">Configure your production workflow and stations.</p>
        </div>

        {/* WORKFLOW STATIONS CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <div>
               <h3 className="font-bold text-gray-900">Production Stations</h3>
               <p className="text-xs text-gray-500 mt-1">These appear in your "My Queue" filters and Job Steps.</p>
             </div>
          </div>

          <div className="p-6">
            {/* LIST OF DEPARTMENTS */}
            <ul className="space-y-3 mb-6">
              {departments.map((dept) => (
                <li key={dept.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg group hover:border-black transition-colors">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded mr-3 text-gray-400 cursor-grab">
                      <GripVertical size={16} />
                    </div>
                    <span className="font-medium text-gray-900">{dept.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(dept.id)}
                    className="text-gray-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Station"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>

            {/* ADD NEW FORM */}
            <form onSubmit={handleAddDepartment} className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <input 
                type="text" 
                placeholder="New Station Name (e.g. 'Large Format')" 
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-black outline-none"
              />
              <button 
                type="submit" 
                disabled={isSaving || !newDeptName}
                className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center"
              >
                <Plus size={16} className="mr-2" /> Add Station
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
