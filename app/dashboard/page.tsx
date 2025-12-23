'use client';

import { createBrowserClient } from '@supabase/ssr';
import { 
  UploadCloud, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-20 items-center px-8 border-b border-gray-100">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xs">PHQ</span>
          </div>
          <span className="font-bold text-lg tracking-tight">PrintHQ</span>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active />
          <NavItem icon={<FileText size={20} />} label="My Jobs" />
          <NavItem icon={<Clock size={20} />} label="Quote History" />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Sign out
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-12">
          
          {/* Header */}
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-gray-500">Welcome back. Ready to print?</p>
            </div>
            <button className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              + New Request
            </button>
          </div>

          {/* 3. THE "HERO" UPLOAD TARGET */}
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex h-80 w-full flex-col items-center justify-center rounded-2xl bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 transition-all duration-300 shadow-sm">
              
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="h-10 w-10 text-blue-600" />
              </div>
              
              <h3 className="mt-6 text-2xl font-bold text-gray-900">Upload a new job</h3>
              <p className="mt-2 text-gray-500 max-w-sm text-center">
                Drag and drop your print files here, or click to browse. <br/>
                <span className="text-xs text-gray-400 mt-2 block">Supports PDF, AI, PSD, INDD</span>
              </p>

              <button className="mt-8 rounded-full bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/40 transition-all">
                Select Files
              </button>
            </div>
          </div>

          {/* 4. RECENT ACTIVITY CARDS */}
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatusCard 
                status="In Production" 
                title="Q4 Marketing Flyers" 
                id="#JOB-2024" 
                date="Updated 2h ago"
                color="green"
              />
              <StatusCard 
                status="Pending Quote" 
                title="Business Cards (Matte)" 
                id="#JOB-2023" 
                date="Sent yesterday"
                color="yellow"
              />
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm mb-3">
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-600">Start Quote</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <a href="#" className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
      <span className={`${active ? 'text-black' : 'text-gray-400'} mr-3`}>{icon}</span>
      {label}
    </a>
  );
}

function StatusCard({ status, title, id, date, color }: any) {
  const colors: any = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color] || colors.blue}`}>
          {status}
        </div>
        <span className="text-xs text-gray-400">{id}</span>
      </div>
      <h4 className="mt-4 text-base font-semibold text-gray-900">{title}</h4>
      <div className="mt-4 flex items-center text-xs text-gray-500">
        <Clock size={14} className="mr-1.5" />
        {date}
      </div>
    </div>
  );
}
