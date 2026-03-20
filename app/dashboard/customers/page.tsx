'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Search, User, Calendar, ArrowRight, Building2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import InternalPageHeader from '@/components/InternalPageHeader';

type Customer = {
  id: string; 
  email: string;
  name?: string;
  company?: string;
  type: 'Registered' | 'Guest' | 'Admin' | 'Staff'; 
  total_jobs: number;
  last_order_date: string;
};

export default function CustomersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    // 1. Fetch Jobs (Log errors if any)
    const { data: jobs, error: jobsError } = await supabase.from('jobs').select('id, created_at, user_id, guest_email');
    if (jobsError) console.error("Jobs fetch error:", jobsError);

    // 2. Fetch Profiles
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');
    if (profilesError) console.error("Profiles fetch error:", profilesError);

    // Ensure we have arrays even if fetch failed
    const safeJobs = jobs || [];
    const safeProfiles = profiles || [];

    // --- AGGREGATION LOGIC ---
    const customerMap = new Map<string, Customer>();

    // A. Add ALL Registered Profiles
    safeProfiles.forEach(p => {
      let userType: any = 'Registered';
      if (p.role === 'admin') userType = 'Admin';
      if (p.role === 'staff') userType = 'Staff';

      customerMap.set(p.email, {
        id: p.id,
        email: p.email,
        name: p.first_name ? `${p.first_name} ${p.last_name || ''}` : '',
        company: p.company || '',
        type: userType,
        total_jobs: 0,
        last_order_date: 'N/A'
      });
    });

    // B. Add Guests from Jobs & Calc Stats
    safeJobs.forEach(j => {
      let email = j.guest_email;
      
      // If not a guest email, check if it belongs to a registered user
      if (!email && j.user_id) {
        const profile = safeProfiles.find(p => p.id === j.user_id);
        if (profile) email = profile.email;
      }

      if (email) {
        if (!customerMap.has(email)) {
          customerMap.set(email, {
            id: email, // Use email as ID for guests
            email: email,
            name: 'Guest User',
            company: 'Guest Account',
            type: 'Guest',
            total_jobs: 0,
            last_order_date: 'N/A'
          });
        }

        const cust = customerMap.get(email)!;
        cust.total_jobs += 1;
        
        // Update Last Active Date
        if (cust.last_order_date === 'N/A' || new Date(j.created_at) > new Date(cust.last_order_date)) {
          cust.last_order_date = new Date(j.created_at).toLocaleDateString();
        }
      }
    });

    // C. Sort by most recent activity
    const sortedCustomers = Array.from(customerMap.values()).sort((a, b) => {
       if (a.last_order_date === 'N/A') return 1;
       if (b.last_order_date === 'N/A') return -1;
       return new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime();
    });

    setCustomers(sortedCustomers);
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <InternalPageHeader
            title="Customer Database"
            description="Track registered accounts, guest history, and account activity without losing the route back to production."
            icon={User}
            breadcrumbs={[{ label: 'Customers' }]}
            className="flex-1"
            sticky
          />
          <div className="relative lg:w-72">
             <input 
               type="text" 
               placeholder="Search company, name, email..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl w-full focus:border-black outline-none shadow-sm bg-white"
             />
             <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total Orders</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-gray-400">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{c.name || 'No Name'}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {c.company ? (
                      <div className="flex items-center text-gray-900 font-medium">
                        <Building2 size={14} className="mr-2 text-gray-400" /> {c.company}
                      </div>
                    ) : (
                      <span className="text-gray-300 italic">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase inline-flex items-center ${
                        c.type === 'Admin' ? 'bg-purple-100 text-purple-700' :
                        c.type === 'Staff' ? 'bg-blue-100 text-blue-700' :
                        c.type === 'Guest' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                      {c.type === 'Admin' && <Shield size={10} className="mr-1" />}
                      {c.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium pl-10">{c.total_jobs}</td>
                  <td className="px-6 py-4 text-gray-500 flex items-center">
                     <Calendar size={14} className="mr-2" /> {c.last_order_date}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/customers/${c.id}`} className="text-gray-400 hover:text-black flex items-center text-xs font-bold uppercase group-hover:underline">
                      View History <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">No customers found matching "{searchTerm}".</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
