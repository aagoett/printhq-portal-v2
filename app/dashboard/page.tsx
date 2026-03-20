'use client';

import { createBrowserClient } from '@supabase/ssr';
import {
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  Briefcase,
  Filter,
  ArrowRightCircle,
  ArrowUp,
  ArrowDown,
  Clock,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Tag,
  Users,
  Truck,
  CheckCircle,
  MessageSquare,
  ArrowUpRight,
  PlusCircle,
  Wrench,
  TimerReset,
  CalendarClock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ItemDetailDrawer from '@/components/ItemDetailDrawer';

// --- TYPES ---
type Job = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  due_date?: string;
  quantity: number;
  size?: string;
  notes: string;
  user_id: string;
  paper_stock?: string;
  guest_email?: string;
  current_step?: string;
  next_step_id?: string;
  assigned_to?: string;
  csr_name?: string;
  brand?: string;
  orders?: { brands?: { name: string } };
  order_id?: string;
  job_items?: any[];
};

type Profile = {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  department?: string;
};

type StageKey =
  | 'Proof Pending'
  | 'Ready to Print'
  | 'Printing'
  | 'Finishing'
  | 'Mailing'
  | 'Shipping'
  | 'Blocked';

const STAGES: { key: StageKey; color: string; pill: string; description: string }[] = [
  { key: 'Proof Pending', color: 'bg-amber-50 border-amber-200', pill: 'text-amber-800 bg-amber-100', description: 'Awaiting customer proof approval' },
  { key: 'Ready to Print', color: 'bg-blue-50 border-blue-200', pill: 'text-blue-800 bg-blue-100', description: 'Approved and staged for press' },
  { key: 'Printing', color: 'bg-indigo-50 border-indigo-200', pill: 'text-indigo-800 bg-indigo-100', description: 'On press / RIP in progress' },
  { key: 'Finishing', color: 'bg-emerald-50 border-emerald-200', pill: 'text-emerald-800 bg-emerald-100', description: 'Bindery, trim, QC, packing' },
  { key: 'Mailing', color: 'bg-cyan-50 border-cyan-200', pill: 'text-cyan-800 bg-cyan-100', description: 'Addressing, sorting, postage' },
  { key: 'Shipping', color: 'bg-slate-50 border-slate-200', pill: 'text-slate-800 bg-slate-100', description: 'Ready for pickup or carrier' },
  { key: 'Blocked', color: 'bg-red-50 border-red-200', pill: 'text-red-800 bg-red-100', description: 'Waiting on customer, files, or payment' },
];

export default function ShopFloorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([]);
  const [departmentTabs, setDepartmentTabs] = useState<string[]>(['My Queue', 'All']);
  const [activeTab, setActiveTab] = useState('All');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [jobAssets, setJobAssets] = useState<any[]>([]);
  const [jobLogs, setJobLogs] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUser(user);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'customer';
    setRole(userRole);

    if (userRole === 'bindery') {
      router.push('/bindery');
      return;
    }

    const isInternal = userRole === 'admin' || userRole === 'staff';

    let jobQuery = supabase
      .from('jobs')
      .select('*, orders(brands(name)), job_items(*, job_item_steps(*))')
      .order('created_at', { ascending: false });

    if (!isInternal) {
      if (user.email) {
        jobQuery = jobQuery.or(`user_id.eq.${user.id},guest_email.eq.${user.email}`);
      } else {
        jobQuery = jobQuery.eq('user_id', user.id);
      }
    }

    const { data: jobsData } = await jobQuery;
    if (jobsData) setJobs(jobsData);

    if (isInternal) {
      const { data: dbDepts } = await supabase.from('departments').select('name').order('sort_order');
      const dynamicTabs = dbDepts ? dbDepts.map((d) => d.name) : [];
      setDepartmentTabs(['My Queue', 'All', ...dynamicTabs]);

      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles) {
        setCustomers(allProfiles);
        setStaff(allProfiles.filter((p) => p.role === 'admin' || p.role === 'staff'));
      }
      setActiveTab(profile?.department && dynamicTabs.includes(profile.department) ? profile.department : 'My Queue');

      const { data: qData } = await supabase.from('workflow_queues').select('*').order('rank');
      if (qData) setWorkflowOptions(qData);
    } else {
      setCustomers([]);
      setStaff([]);
    }

    setLoading(false);
  };

  const handleAssignJob = async (jobId: string, staffId: string) => {
    if (!staffId) return;
    const staffMember = staff.find((s) => s.id === staffId);
    const staffName = staffMember ? (staffMember.first_name || staffMember.email) : 'Staff';
    setJobs(jobs.map((j) => j.id === jobId ? { ...j, assigned_to: staffId, csr_name: staffName } : j));
    await supabase.from('jobs').update({ assigned_to: staffId, csr_name: staffName }).eq('id', jobId);
  };

  const handleOpenItemDrawer = async (itemId: string) => {
    setEditingItemId(itemId);
    const item = jobs.flatMap((j) => j.job_items || []).find((i) => i.id === itemId);
    if (!item) return;

    const { data: assets } = await supabase.from('job_assets').select('*, profiles(email)').eq('job_id', item.job_id).order('created_at', { ascending: false });
    if (assets) setJobAssets(assets);

    const { data: logs } = await supabase.from('job_logs').select('*, profiles(email)').eq('job_id', item.job_id).order('created_at', { ascending: false });
    if (logs) setJobLogs(logs);
  };

  const handleCompleteItemStep = async (item: any, currentStepName: string) => {
    if (!confirm(`Mark "${currentStepName}" as DONE for ${item.description}?`)) return;

    const step = item.job_item_steps?.find((s: any) => s.step_name === currentStepName && s.status !== 'Completed');
    if (!step) return alert('Step not found or already completed.');

    const { error: stepErr } = await supabase.from('job_item_steps').update({ status: 'Completed' }).eq('id', step.id);
    if (stepErr) return alert(stepErr.message);

    const allSteps = item.job_item_steps || [];
    const sortedSteps = [...allSteps].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const currentIndex = sortedSteps.findIndex((s) => s.id === step.id);
    const nextStep = sortedSteps[currentIndex + 1];
    const newStatus = nextStep ? nextStep.step_name : 'Completed';

    const { error: itemErr } = await supabase.from('job_items').update({ status: newStatus }).eq('id', item.id);
    if (itemErr) return alert(itemErr.message);

    await supabase.from('job_logs').insert({
      job_id: item.job_id,
      user_id: user.id,
      action: 'Step Completed',
      details: `Completed ${currentStepName}. Next: ${newStatus}`,
      job_item_id: item.id,
    });

    fetchDashboardData();
  };

  const handleUpdateItem = async (itemId: string, updates: any) => {
    const { error } = await supabase.from('job_items').update(updates).eq('id', itemId);
    if (error) alert(error.message);
    fetchDashboardData();
  };

  const handleAddStep = async (itemId: string, stepName: string, isInternal: boolean) => {
    const { error } = await supabase.from('job_item_steps').insert({ job_item_id: itemId, step_name: stepName, status: 'Pending', is_internal: isInternal });
    if (error) alert(error.message);
    fetchDashboardData();
  };

  const handleToggleStep = async (stepId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    await supabase.from('job_item_steps').update({ status: newStatus }).eq('id', stepId);
    fetchDashboardData();
  };

  const handleDeleteStep = async (stepId: string) => {
    await supabase.from('job_item_steps').delete().eq('id', stepId);
    fetchDashboardData();
  };

  const onItemUpload = async (file: File, itemId: string) => {
    const item = jobs.flatMap((j) => j.job_items || []).find((i) => i.id === itemId);
    if (!item) return;
    const storageName = `${item.job_id}-item-${itemId.substring(0, 4)}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('uploads').upload(storageName, file);
    if (uploadError) throw uploadError;

    await supabase.from('job_assets').insert({
      job_id: item.job_id,
      job_item_id: itemId,
      uploader_id: user.id,
      file_url: uploadData.path,
      file_name: file.name,
      asset_type: 'source',
      status: 'pending',
    });
    fetchDashboardData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDueStatus = (dueString?: string) => {
    if (!dueString) return { color: 'text-gray-400', label: '--', bucket: 'none' } as const;
    const due = new Date(dueString);
    const now = new Date();
    due.setHours(23, 59, 59);
    now.setHours(0, 0, 0);

    const diff = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diff < 0) return { color: 'text-red-600 font-bold', label: 'Overdue', bucket: 'overdue' } as const;
    if (diff < 1) return { color: 'text-orange-600 font-bold', label: 'Today', bucket: 'today' } as const;
    if (diff <= 3) return { color: 'text-orange-600 font-bold', label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), bucket: 'week' } as const;

    return { color: 'text-gray-700 font-medium', label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), bucket: 'later' } as const;
  };

  const determineStage = (job: Job): StageKey => {
    const text = (job.current_step || job.status || '').toLowerCase();
    const itemStatuses = (job.job_items || []).map((i) => (i.status || '').toLowerCase());
    const all = [text, ...itemStatuses];

    if (all.some((s) => s.includes('proof'))) return 'Proof Pending';
    if (all.some((s) => s.includes('ready'))) return 'Ready to Print';
    if (all.some((s) => s.includes('print') || s.includes('press'))) return 'Printing';
    if (all.some((s) => s.includes('finish') || s.includes('bind') || s.includes('cut') || s.includes('trim'))) return 'Finishing';
    if (all.some((s) => s.includes('mail'))) return 'Mailing';
    if (all.some((s) => s.includes('ship'))) return 'Shipping';
    if (all.some((s) => s.includes('block') || s.includes('hold') || s.includes('wait'))) return 'Blocked';
    return 'Ready to Print';
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isInternal = role === 'admin' || role === 'staff';

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'My Queue') return job.assigned_to === user?.id;
    const hasMatchingItem = job.job_items?.some((item: any) => item.status === activeTab);
    return job.current_step === activeTab || hasMatchingItem;
  });

  const stageBuckets = useMemo(() => {
    const buckets: Record<StageKey, Job[]> = {
      'Proof Pending': [],
      'Ready to Print': [],
      Printing: [],
      Finishing: [],
      Mailing: [],
      Shipping: [],
      Blocked: [],
    };
    filteredJobs.forEach((job) => {
      const stage = determineStage(job);
      buckets[stage].push(job);
    });
    return buckets;
  }, [filteredJobs]);

  const dueToday = filteredJobs.filter((j) => getDueStatus(j.due_date).bucket === 'today');
  const overdue = filteredJobs.filter((j) => getDueStatus(j.due_date).bucket === 'overdue');

  const kpiCards = [
    { label: 'Active Jobs', value: filteredJobs.length, icon: <LayoutDashboard size={16} />, color: 'bg-gray-900 text-white' },
    { label: 'Due Today', value: dueToday.length, icon: <CalendarClock size={16} />, color: 'bg-orange-50 text-orange-800 border border-orange-200' },
    { label: 'Overdue', value: overdue.length, icon: <AlertCircle size={16} />, color: 'bg-red-50 text-red-800 border border-red-200' },
    { label: 'Blocked', value: stageBuckets['Blocked'].length, icon: <ShieldAlert size={16} />, color: 'bg-yellow-50 text-yellow-800 border border-yellow-200' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-20 items-center px-8 border-b border-gray-100">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center mr-3"><span className="text-white font-bold text-xs">PHQ</span></div>
          <span className="font-bold text-lg tracking-tight">PrintHQ</span>
          {isInternal && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">{role}</span>}
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem icon={<LayoutDashboard size={20} />} label={isInternal ? 'Shop Floor' : 'My Jobs'} href="/dashboard" active />
          {isInternal && <NavItem icon={<MessageSquare size={20} />} label="Intake" href="/intake" />}
          <NavItem icon={<Briefcase size={20} />} label="Quotes" href="/dashboard/quotes" />
          {isInternal && <NavItem icon={<Users size={20} />} label="Customers" href="/dashboard/customers" />}
          <NavItem icon={<Settings size={20} />} label="Settings" href="/dashboard/settings" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"><LogOut size={20} className="mr-3" /> Sign out</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-12 space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><ArrowRightCircle size={14}/> Shop Floor</p>
              <h1 className="text-3xl font-bold text-gray-900">Production at a glance</h1>
              <p className="text-gray-500">KPI tiles + queue columns for proof → ship. Visibility for due today & overdue.</p>
            </div>
            {isInternal && (
              <div className="flex flex-wrap gap-2">
                <Link href="/intake#bot-intake" className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-bold hover:border-black">+ New Quote</Link>
                <Link href="/intake#quick-order" className="px-4 py-2 rounded-full bg-black text-white text-sm font-bold hover:bg-gray-800">+ Quick Order</Link>
                <Link href="/intake#bot-intake" className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-bold hover:border-black">+ Internal Job</Link>
                <Link href="/intake" className="px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-sm font-bold">Intake Hub</Link>
              </div>
            )}
          </div>

          {isInternal && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {departmentTabs.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setActiveTab(dept)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center
                    ${activeTab === dept ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-black hover:text-black'}`}
                >
                  {dept === 'My Queue' && <Briefcase size={14} className="mr-2" />}
                  {dept}
                </button>
              ))}
            </div>
          )}

          {/* KPI TILES */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((kpi) => (
              <div key={kpi.label} className={`rounded-xl px-4 py-4 shadow-sm ${kpi.color}`}>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                  <span>{kpi.label}</span>
                  {kpi.icon}
                </div>
                <div className="mt-2 text-3xl font-black">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* DUE TODAY + OVERDUE */}
          {isInternal && (
            <div className="grid gap-4 lg:grid-cols-2">
              <DueList title="Due Today" jobs={dueToday} getDueStatus={getDueStatus} formatDate={formatDate} />
              <DueList title="Overdue" jobs={overdue} getDueStatus={getDueStatus} formatDate={formatDate} />
            </div>
          )}

          {editingItemId && (() => {
            const item = jobs.flatMap((j) => j.job_items || []).find((i) => i.id === editingItemId);
            if (!item) return null;
            return (
              <ItemDetailDrawer
                item={item}
                assets={jobAssets}
                workflowOptions={workflowOptions}
                onClose={() => setEditingItemId(null)}
                onUpdate={handleUpdateItem}
                onUpload={onItemUpload}
                onAddStep={handleAddStep}
                onToggleStep={handleToggleStep}
                onDeleteStep={handleDeleteStep}
                onMoveStep={async () => {}}
                onReorderSteps={async () => {}}
                onLogActivity={async (action, details, itemId) => {
                  await supabase.from('job_logs').insert({ job_id: item.job_id, user_id: user.id, action, details, job_item_id: itemId });
                  handleOpenItemDrawer(item.id);
                }}
                logs={jobLogs}
                userRole={role}
              />
            );
          })()}

          {/* BOARD */}
          {isInternal ? (
            <div className="grid gap-4 xl:grid-cols-7 lg:grid-cols-3 md:grid-cols-2">
              {STAGES.map((stage) => (
                <div key={stage.key} className={`rounded-2xl border ${stage.color} p-4 flex flex-col min-h-[260px]`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`text-[11px] font-bold uppercase ${stage.pill}`}>{stage.key}</p>
                      <p className="text-xs text-gray-500">{stage.description}</p>
                    </div>
                    <span className="text-xs font-black text-gray-500">{stageBuckets[stage.key].length}</span>
                  </div>

                  {stageBuckets[stage.key].length === 0 ? (
                    <div className="flex-1 text-xs text-gray-400 flex items-center justify-center">No jobs here.</div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto">
                      {stageBuckets[stage.key].map((job) => {
                        const dueStatus = getDueStatus(job.due_date);
                        const customerProfile = customers.find((c) => c.id === job.user_id);
                        const customerName = customerProfile ? (customerProfile.first_name || customerProfile.email) : (job.guest_email || 'Guest');
                        const brandName = job.orders?.brands?.name || 'PrintHQ';

                        return (
                          <div key={job.id} className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="overflow-hidden">
                                <Link href={`/dashboard/jobs/${job.id}`} className="font-bold text-gray-900 hover:text-blue-700 flex items-center gap-2">
                                  {job.title}
                                  <ChevronRight size={14} className="text-gray-400" />
                                </Link>
                                <p className="text-[11px] uppercase text-gray-400 font-bold truncate">{brandName}</p>
                              </div>
                              <span className={`text-xs ${dueStatus.color}`}>{dueStatus.label}</span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-600">{typeof customerName === 'string' ? customerName.charAt(0).toUpperCase() : '?'}</div>
                                <div>
                                  <div className="font-semibold text-gray-800 text-sm">{customerName}</div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold">#{job.id.substring(0, 6).toUpperCase()}</div>
                                </div>
                              </div>
                              <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={12} /> {formatDate(job.created_at)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Qty {job.quantity?.toLocaleString()}</span>
                              {job.size && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{job.size}</span>}
                              {job.paper_stock && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 truncate">{job.paper_stock}</span>}
                            </div>

                            {job.job_items && job.job_items.length > 0 && (
                              <div className="space-y-1 border-t border-gray-100 pt-2">
                                {job.job_items.map((item: any) => (
                                  <div key={item.id} className="flex items-center justify-between text-[11px]">
                                    <button
                                      onClick={() => handleOpenItemDrawer(item.id)}
                                      className="text-gray-700 font-semibold hover:text-blue-700 truncate text-left"
                                      title={item.description}
                                    >
                                      {item.description}
                                    </button>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                        {item.status || 'Pending'}
                                      </span>
                                      {stage.key === item.status && (
                                        <button
                                          onClick={() => handleCompleteItemStep(item, stage.key)}
                                          className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm hover:bg-green-700"
                                        >
                                          Done
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isInternal && (
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                <select
                                  value={job.assigned_to || ''}
                                  onChange={(e) => handleAssignJob(job.id, e.target.value)}
                                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-600 focus:outline-none"
                                >
                                  <option value="">Unassigned</option>
                                  {staff.map((s) => (
                                    <option key={s.id} value={s.id}>{s.first_name || s.email?.split('@')[0]}</option>
                                  ))}
                                </select>
                                <Link href={`/dashboard/jobs/${job.id}`} className="text-gray-400 hover:text-black flex items-center gap-1 text-xs">
                                  Open <ExternalLink size={14} />
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => {
                const dueStatus = getDueStatus(job.due_date);
                return (
                  <StatusCard key={job.id} job={job} formatDate={formatDate} dueStatus={dueStatus} />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, href = '#' }: { icon: any; label: string; active?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}
    >
      <span className={`${active ? 'text-black' : 'text-gray-400'} mr-3`}>{icon}</span>
      {label}
    </Link>
  );
}

function StatusCard({ job, formatDate, dueStatus }: { job: Job; formatDate: (d: string) => string; dueStatus: any }) {
  const styles: any = { 'Pending Review': 'bg-amber-100 text-amber-700', 'In Production': 'bg-emerald-100 text-emerald-700' };
  const brandName = job.orders?.brands?.name || 'PrintHQ';
  return (
    <Link href={`/dashboard/jobs/${job.id}`}>
      <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-black hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[job.status] || 'bg-blue-100 text-blue-700'}`}>{job.status}</div>
          <span className="text-xs font-mono text-gray-400">#{job.id.substring(0, 6).toUpperCase()}</span>
        </div>
        <h4 className="mt-4 text-lg font-bold text-gray-900 truncate">{job.title}</h4>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-gray-500">{job.quantity} units</span>
          <span className="text-xs text-gray-400 flex items-center"><Clock size={12} className="mr-1" /> {formatDate(job.created_at)}</span>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase text-gray-400">{brandName}</span>
          <span className={`text-xs ${dueStatus.color}`}>{dueStatus.label}</span>
        </div>
      </div>
    </Link>
  );
}

function DueList({ title, jobs, getDueStatus, formatDate }: { title: string; jobs: Job[]; getDueStatus: (d?: string) => any; formatDate: (d: string) => string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
          {title === 'Due Today' ? <TimerReset size={14} className="text-orange-500" /> : <AlertCircle size={14} className="text-red-500" />}
          {title}
        </div>
        <span className="text-xs text-gray-500">{jobs.length}</span>
      </div>
      {jobs.length === 0 ? (
        <div className="px-4 py-6 text-sm text-gray-400">Nothing here.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {jobs.map((job) => {
            const dueStatus = getDueStatus(job.due_date);
            const brandName = job.orders?.brands?.name || 'PrintHQ';
            return (
              <div key={job.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <Link href={`/dashboard/jobs/${job.id}`} className="font-semibold text-gray-900 hover:text-blue-700 text-sm">{job.title}</Link>
                  <p className="text-[11px] text-gray-400 uppercase font-bold">{brandName} • {formatDate(job.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${dueStatus.color}`}>{dueStatus.label}</p>
                  <p className="text-[10px] text-gray-400">#{job.id.substring(0, 6).toUpperCase()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
