'use client';

import { createClient } from '@/utils/supabase/client';
import { 
  LogOut, LayoutDashboard, Loader2, Search, Settings, Scissors
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- TYPES ---
type JobItem = {
  id: string;
  job_id: string;
  description: string;
  quantity: number;
  paper_stock?: string;
  size?: string;
  internal_notes?: string;
  status: string;
  created_at: string;
  jobs?: {
    title: string;
    id: string;
  };
  job_item_steps?: {
    id: string;
    step_name: string;
    status: string;
    notes?: string;
  }[];
};

export default function BinderyDashboard() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JobItem[]>([]);
  const [viewMode, setViewMode] = useState<'queue' | 'all'>('queue');
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Check Role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const userRole = profile?.role || 'customer';
      setRole(userRole);
      
      // Allow admin or bindery to view this
      if (userRole !== 'bindery' && userRole !== 'admin') {
        router.push('/dashboard');
        return;
      }

      // Fetch Job Items and their parent Job + Steps
      const { data: itemsData } = await supabase
        .from('job_items')
        .select(`
          *,
          jobs(id, title),
          job_item_steps(*)
        `)
        .order('created_at', { ascending: false });

      if (itemsData) setItems(itemsData);
      setLoading(false);
    };
    init();

    const channel = supabase.channel('realtime bindery items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_items' }, 
        () => {
          supabase.from('job_items').select('*, jobs(id, title), job_item_steps(*)').order('created_at', { ascending: false }).then(({data}) => {
             if (data) setItems(data);
          });
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_item_steps' }, 
        () => {
          supabase.from('job_items').select('*, jobs(id, title), job_item_steps(*)').order('created_at', { ascending: false }).then(({data}) => {
             if (data) setItems(data);
          });
        })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.jobs?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (viewMode === 'queue') {
       // Check if this item has any steps that are specifically for the Bindery
       // or if the item's global status is bindery-related (fallback)
       const hasBinderyStep = item.job_item_steps?.some(step => 
          step.step_name.toLowerCase().includes('bindery') || 
          step.step_name.toLowerCase().includes('fold') ||
          step.step_name.toLowerCase().includes('cut') ||
          step.step_name.toLowerCase().includes('stitch')
       );
       
       return hasBinderyStep || 
              item.status === 'To Bindery' || 
              item.status === 'In Bindery' || 
              item.status === 'Bindery Complete';
    }
    return true; // "all" mode
  });

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-gray-50 relative">
      
      {/* --- SIDEBAR --- */}
      <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-20 items-center px-8 border-b border-gray-100">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xs">PHQ</span>
          </div>
          <span className="font-bold text-lg tracking-tight">PrintHQ</span>
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded">Bindery</span>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <a href="#" onClick={() => setViewMode('queue')} className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${viewMode === 'queue' ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
            <Scissors size={20} className={`mr-3 ${viewMode === 'queue' ? 'text-black' : 'text-gray-400'}`} />
            Bindery Queue
          </a>
          <a href="#" onClick={() => setViewMode('all')} className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
            <LayoutDashboard size={20} className={`mr-3 ${viewMode === 'all' ? 'text-black' : 'text-gray-400'}`} />
            All Jobs
          </a>
          <a href="#" className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-black transition-colors">
            <Settings size={20} className="mr-3 text-gray-400" />
            Settings
          </a>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleSignOut} className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={20} className="mr-3" /> Sign out
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-12">
          
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bindery Department</h1>
              <p className="mt-1 text-gray-500">Manage jobs waiting for folding, cutting, and binding.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex space-x-4">
                 <button 
                   onClick={() => setViewMode('queue')}
                   className={`font-semibold text-sm pb-1 border-b-2 transition-colors ${viewMode === 'queue' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                 >
                   Active Queue
                 </button>
                 <button 
                   onClick={() => setViewMode('all')}
                   className={`font-semibold text-sm pb-1 border-b-2 transition-colors ${viewMode === 'all' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                 >
                   All Jobs
                 </button>
              </div>
              <div className="relative">
                  <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search jobs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-black" 
                  />
              </div>
            </div>
            {filteredItems.length === 0 ? <div className="p-12 text-center text-gray-400">No items found in this view.</div> : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-3 w-48">Item Description</th>
                    <th className="px-6 py-3 w-48">Parent Job</th>
                    <th className="px-6 py-3">Specs (Size / Notes)</th>
                    <th className="px-6 py-3 w-24">Qty</th>
                    <th className="px-6 py-3 w-40">Item Workflow</th>
                    <th className="px-6 py-3 w-32">Status</th>
                    <th className="px-6 py-3 w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 leading-tight">
                        {item.description}
                        <div className="text-[10px] font-mono text-gray-400 mt-1">#{item.id.substring(0,8).toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-600">
                        {item.jobs?.title || 'Unknown Job'}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                         <span className="block mb-1 font-bold">{item.paper_stock || 'No Stock Info'}</span>
                         {item.size && (
                           <span className="inline-flex items-center px-1.5 py-0.5 mb-1 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                             {item.size}
                           </span>
                         )}
                         {item.internal_notes && (
                            <div className="text-[10px] text-yellow-700 bg-yellow-50 p-1.5 rounded border border-yellow-200 mt-1 max-w-[200px] truncate">
                               {item.internal_notes}
                            </div>
                         )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">{item.quantity}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {item.job_item_steps?.map((step: any) => (
                             <div key={step.id} className="flex flex-col gap-0.5">
                               <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase font-bold tracking-wider inline-block w-max ${
                                 step.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
                                 step.step_name.toLowerCase().includes('bindery') || step.step_name.toLowerCase().includes('fold') || step.step_name.toLowerCase().includes('cut')
                                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                  : 'bg-gray-100 text-gray-400 border-gray-200'
                               }`}>
                                  {step.status === 'Completed' ? '✓ ' : ''}{step.step_name}
                               </span>
                               {step.notes && (
                                 <span className="text-[10px] text-gray-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 leading-snug max-w-[180px] font-medium">
                                   {step.notes}
                                 </span>
                               )}
                             </div>
                          ))}
                          {(!item.job_item_steps || item.job_item_steps.length === 0) && <span className="text-gray-300 italic text-[10px]">No path</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/jobs/${item.job_id}`} className="inline-flex items-center justify-center px-4 py-1.5 bg-black text-white text-[11px] font-bold rounded hover:bg-gray-800 transition-colors uppercase tracking-wider shadow-sm">
                          Open Job
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = { 
    'Pending Review': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'To Bindery': 'bg-blue-100 text-blue-800 border border-blue-200 font-bold',
    'In Bindery': 'bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold',
    'Bindery Complete': 'bg-green-100 text-green-800 border border-green-200 font-bold', 
    'In Production': 'bg-purple-100 text-purple-800 border border-purple-200', 
    'Shipped': 'bg-green-100 text-green-800 border border-green-200' 
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs uppercase tracking-wide ${styles[status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>{status}</span>;
}
