'use client';

import { createBrowserClient } from '@supabase/ssr';
import { ArrowLeft, Mail, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CustomerHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const id = decodeURIComponent(params.id as string);
    const isEmail = id.includes('@'); // Check if looking up by Guest Email or User ID

    let userProfile = null;
    let userJobs = [];

    // A. FETCH PROFILE INFO
    if (!isEmail) {
      // It's a UUID, fetch real profile
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      userProfile = data;
    } else {
      // It's a Guest, mock the profile
      userProfile = { 
        email: id, 
        first_name: 'Guest', 
        last_name: 'User', 
        role: 'guest',
        company: 'Guest Account' 
      };
    }

    // B. FETCH JOBS
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    
    if (isEmail) {
      // Fetch by Guest Email
      query = query.eq('guest_email', id);
    } else {
      // Fetch by User ID
      query = query.eq('user_id', id);
    }

    const { data: jobData } = await query;
    
    setProfile(userProfile);
    setJobs(jobData || []);
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div></div>;

  if (!profile) return <div className="p-12 text-center">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        <Link href="/dashboard/customers" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Database
        </Link>

        {/* HEADER CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="flex flex-col gap-1 text-sm text-gray-500">
               <div className="flex items-center"><Mail size={14} className="mr-2" /> {profile.email}</div>
               {profile.company && <div className="flex items-center"><Building2 size={14} className="mr-2" /> {profile.company}</div>}
               <div className="flex items-center uppercase text-xs font-bold tracking-wide mt-2">
                 <span className={`px-2 py-1 rounded ${profile.role === 'guest' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                   {profile.role}
                 </span>
               </div>
            </div>
          </div>
          <div className="text-right bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Spend</p>
            {/* Simple sum of prices if you have them, otherwise just job count */}
            <p className="text-2xl font-black text-gray-900">{jobs.length} Orders</p>
          </div>
        </div>

        {/* JOB HISTORY TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900">Order History</h3>
          </div>
          {jobs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No orders found for this customer.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 uppercase font-bold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">Job ID</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 font-mono text-gray-500">#{job.id.substring(0,6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-gray-500 flex items-center">
                      <Calendar size={14} className="mr-2" /> {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${job.status === 'Shipped' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                         {job.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/jobs/${job.id}`} className="text-black font-bold hover:underline text-xs uppercase">
                        View Ticket
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
