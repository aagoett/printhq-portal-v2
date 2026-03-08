'use client';

import { createBrowserClient } from '@supabase/ssr';
import {
  ArrowLeft, Mail, Building2, Calendar, Phone, CreditCard,
  MapPin, FileText, Edit2, X, Save, Loader2, MessageSquare,
  Plus, Trash2, Receipt, ChevronRight
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

type CRMNote = {
  id: string;
  customer_id: string;
  content: string;
  created_by: string;
  author_name?: string;
  created_at: string;
};

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Notes State
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices' | 'notes'>('orders');

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setCurrentUser(user);

    const id = decodeURIComponent(params.id as string);
    const isEmail = id.includes('@');

    let userProfile: any = null;

    if (!isEmail) {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      userProfile = data;
    } else {
      const { data } = await supabase.from('profiles').select('*').eq('email', id).single();
      userProfile = data || {
        email: id,
        first_name: 'Guest',
        last_name: 'User',
        role: 'guest',
        company: 'Guest Account',
        payment_terms: 'COD',
        tax_status: 'Taxable',
      };
    }

    // Fetch jobs
    let jobQuery = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    jobQuery = isEmail ? jobQuery.eq('guest_email', id) : jobQuery.eq('user_id', id);
    const { data: jobData } = await jobQuery;

    // Fetch invoices
    let invQuery = supabase.from('invoices').select('*, brands(name)').order('created_at', { ascending: false });
    invQuery = isEmail ? invQuery.eq('customer_email', id) : invQuery.eq('customer_id', id);
    const { data: invData } = await invQuery;

    // Fetch CRM notes (only if profile has an ID)
    let notesData: CRMNote[] = [];
    if (userProfile?.id) {
      const { data: nData } = await supabase
        .from('customer_notes')
        .select('*, profiles:created_by(first_name, email)')
        .eq('customer_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (nData) {
        notesData = nData.map((n: any) => ({
          ...n,
          author_name: n.profiles?.first_name || n.profiles?.email?.split('@')[0] || 'Staff',
        }));
      }
    }

    setProfile(userProfile);
    setJobs(jobData || []);
    setInvoices(invData || []);
    setNotes(notesData);
    setFormData(userProfile);
    setLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!profile.id) {
        alert('This guest has not signed up yet. Profile details cannot be saved until they register.');
        setIsSaving(false);
        return;
      }
      const { error } = await supabase.from('profiles').update({
        first_name:      formData.first_name,
        last_name:       formData.last_name,
        company:         formData.company,
        phone:           formData.phone,
        payment_terms:   formData.payment_terms,
        tax_status:      formData.tax_status,
        tax_id:          formData.tax_id,
        billing_address: formData.billing_address,
      }).eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
    } catch (err) {
      console.error('Profile save error:', err);
      alert('Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !profile?.id || !currentUser) return;
    setSavingNote(true);
    const { data, error } = await supabase.from('customer_notes').insert({
      customer_id: profile.id,
      content:     newNote.trim(),
      created_by:  currentUser.id,
    }).select('*, profiles:created_by(first_name, email)').single();

    if (error) {
      alert('Failed to save note: ' + error.message);
    } else {
      const newNoteObj: CRMNote = {
        ...data,
        author_name: data.profiles?.first_name || data.profiles?.email?.split('@')[0] || 'Staff',
      };
      setNotes([newNoteObj, ...notes]);
      setNewNote('');
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await supabase.from('customer_notes').delete().eq('id', id);
    setNotes(notes.filter(n => n.id !== id));
  };

  const totalSpend = invoices.filter(i => i.status === 'Paid').reduce((s: number, i: any) => s + (i.total || 0), 0);
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!profile) return <div className="p-12 text-center">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 relative">
      <div className="max-w-6xl mx-auto">

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg">Edit Customer Profile</h3>
                <button onClick={() => setIsEditing(false)}><X className="text-gray-400 hover:text-black" /></button>
              </div>
              <form onSubmit={handleSaveProfile} className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">First Name</label>
                  <input className="w-full border rounded-lg p-2 text-sm outline-none focus:border-black" value={formData.first_name || ''} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Last Name</label>
                  <input className="w-full border rounded-lg p-2 text-sm outline-none focus:border-black" value={formData.last_name || ''} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Company</label>
                  <input className="w-full border rounded-lg p-2 text-sm outline-none focus:border-black" value={formData.company || ''} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label>
                  <input className="w-full border rounded-lg p-2 text-sm outline-none focus:border-black" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Terms</label>
                  <select className="w-full border rounded-lg p-2 bg-white text-sm outline-none focus:border-black" value={formData.payment_terms || 'COD'} onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}>
                    {['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tax Status</label>
                  <select className="w-full border rounded-lg p-2 bg-white text-sm outline-none focus:border-black" value={formData.tax_status || 'Taxable'} onChange={e => setFormData({ ...formData, tax_status: e.target.value })}>
                    {['Taxable', 'Resale / Wholesale', 'Non-Profit Exempt'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tax ID / Resale #</label>
                  <input className="w-full border rounded-lg p-2 text-sm outline-none focus:border-black" value={formData.tax_id || ''} onChange={e => setFormData({ ...formData, tax_id: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Billing / Shipping Address</label>
                  <textarea className="w-full border rounded-lg p-2 text-sm outline-none focus:border-black resize-none" rows={2} value={formData.billing_address || ''} onChange={e => setFormData({ ...formData, billing_address: e.target.value })} />
                </div>
                <div className="col-span-2 pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:text-black font-bold text-sm">Cancel</button>
                  <button type="submit" disabled={isSaving} className="px-6 py-2 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 flex items-center">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save className="mr-2" size={14} />} Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Link href="/dashboard/customers" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Customer Database
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'No Name'}
                </h1>
                <div className="flex items-center gap-3 text-gray-500 mb-4 text-sm">
                  {profile.company && (
                    <span className="flex items-center gap-1"><Building2 size={13} /> {profile.company}</span>
                  )}
                  <span className="flex items-center gap-1"><Mail size={13} /> {profile.email}</span>
                  {profile.phone && (
                    <span className="flex items-center gap-1"><Phone size={13} /> {profile.phone}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${profile.role === 'guest' ? 'bg-yellow-100 text-yellow-700' : profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {profile.role || 'customer'}
                  </span>
                  {profile.tax_status === 'Resale / Wholesale' && (
                    <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-green-100 text-green-700">Resale</span>
                  )}
                </div>
              </div>
              {profile.id && (
                <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:text-black hover:border-black transition-all">
                  <Edit2 size={14} className="mr-2" /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* CRM Stats Card */}
          <div className="w-full md:w-80 space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black text-gray-900">{jobs.length}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400">Jobs</p>
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{invoices.length}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400">Invoices</p>
              </div>
              <div>
                <p className="text-lg font-black text-green-600">{fmt(totalSpend)}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400">Collected</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><CreditCard size={11} /> Payment Terms</p>
              <p className="text-sm font-bold text-gray-900">{profile.payment_terms || 'COD'}</p>
              {profile.billing_address && (
                <>
                  <p className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1 mt-2"><MapPin size={11} /> Address</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{profile.billing_address}</p>
                </>
              )}
            </div>
            {profile.id && (
              <Link
                href={`/dashboard/invoices/new?customer_id=${profile.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Plus size={14} /> Create Invoice
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['orders', 'invoices', 'notes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-colors capitalize ${activeTab === tab ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-black hover:text-black'}`}
            >
              {tab}
              <span className="ml-2 text-[10px] font-mono">
                ({tab === 'orders' ? jobs.length : tab === 'invoices' ? invoices.length : notes.length})
              </span>
            </button>
          ))}
        </div>

        {/* Order History Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Order History</h3>
              <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded">{jobs.length} jobs</span>
            </div>
            {jobs.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No orders found for this customer.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
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
                      <td className="px-6 py-4 font-mono text-gray-500 text-xs">#{job.id.substring(0, 6).toUpperCase()}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(job.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${job.status === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/jobs/${job.id}`} className="inline-flex items-center gap-1 text-gray-400 hover:text-black text-xs font-bold uppercase transition-colors group-hover:text-black">
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Invoices</h3>
              {profile.id && (
                <Link href={`/dashboard/invoices/new`} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <Plus size={12} /> New Invoice
                </Link>
              )}
            </div>
            {invoices.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Receipt size={40} className="mx-auto mb-3 text-gray-200" />
                <p>No invoices yet for this customer.</p>
                {profile.id && (
                  <Link href="/dashboard/invoices/new" className="mt-3 inline-block text-blue-600 font-bold text-sm hover:underline">Create first invoice →</Link>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3">Invoice #</th>
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Due</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 font-mono text-gray-900 font-bold text-xs">#{inv.invoice_number || inv.id.substring(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs">{inv.brands?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : inv.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(inv.total || 0)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="inline-flex items-center gap-1 text-gray-400 hover:text-black text-xs font-bold uppercase group-hover:text-black">
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CRM Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Add Note */}
            {profile.id && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <MessageSquare size={15} className="text-gray-400" /> Add CRM Note
                </h3>
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add an internal note about this customer (only visible to staff)..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-black resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddNote}
                    disabled={savingNote || !newNote.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 disabled:opacity-40"
                  >
                    {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Note
                  </button>
                </div>
              </div>
            )}

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 text-gray-200" />
                <p>No CRM notes yet. Add your first note above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 leading-relaxed">{note.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {note.author_name} · {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="ml-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
