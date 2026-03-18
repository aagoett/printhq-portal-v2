'use client';

import { createBrowserClient } from '@supabase/ssr';
import { ArrowLeft, Mail, Building2, Calendar, Phone, CreditCard, MapPin, FileText, Edit2, X, Save, Loader2, Tag, DollarSign, Trash2, Plus } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/utils/pricing';

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Pricing overrides
  const [pricingOverrides, setPricingOverrides] = useState<any[]>([]);
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    template: '',
    sku: '',
    component_type: 'paper',
    price_override: '',
    cost_override: '',
    notes: ''
  });

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

    // A. FETCH PROFILE INFO
    if (!isEmail) {
      // It's a UUID, fetch real profile
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      userProfile = data;
    } else {
      // It's a Guest Email, try to find a real profile first
      const { data } = await supabase.from('profiles').select('*').eq('email', id).single();
      
      if (data) {
         userProfile = data; // Found a real profile for this email!
      } else {
         // Still just a guest
         userProfile = { 
           email: id, 
           first_name: 'Guest', 
           last_name: 'User', 
           role: 'guest',
           company: 'Guest Account',
           payment_terms: 'COD',
           tax_status: 'Taxable'
         };
      }
    }

    // B. FETCH JOBS
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    
    if (isEmail) {
      query = query.eq('guest_email', id);
    } else {
      query = query.eq('user_id', id);
    }

    const { data: jobData } = await query;
    
    setProfile(userProfile);
    setJobs(jobData || []);
    setFormData(userProfile); // Init form
    if (userProfile?.id) {
      await loadOverrides(userProfile.id);
    } else {
      setPricingOverrides([]);
    }
    setLoading(false);
  };

  const loadOverrides = async (customerId: string) => {
    const { data, error } = await supabase.from('customer_pricing').select('*').eq('customer_id', customerId);
    if (error) {
      console.error('customer_pricing', error.message);
      setPricingOverrides([]);
      return;
    }
    setPricingOverrides(data || []);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
        let updateId = profile.id;

        if (!profile.id) {
            alert("Note: This guest hasn't signed up yet. We can't save permanent details until they register.");
            setIsSaving(false);
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: formData.first_name,
                last_name: formData.last_name,
                company: formData.company,
                phone: formData.phone,
                payment_terms: formData.payment_terms,
                tax_status: formData.tax_status,
                tax_id: formData.tax_id,
                billing_address: formData.billing_address
            })
            .eq('id', profile.id);

        if (error) throw error;

        setProfile({ ...profile, ...formData });
        setIsEditing(false);

    } catch (error) {
        console.error('Error updating:', error);
        alert('Failed to save profile.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddOverride = async () => {
    if (!profile?.id) {
      alert('Cannot add overrides for guests without an account.');
      return;
    }
    if (!overrideForm.sku && !overrideForm.template) {
      alert('Provide at least a SKU or Template to scope this override.');
      return;
    }
    setSavingOverride(true);
    try {
      const payload: any = {
        customer_id: profile.id,
        template: overrideForm.template || null,
        sku: overrideForm.sku || null,
        component_type: overrideForm.component_type || null,
        price_override: overrideForm.price_override ? parseFloat(overrideForm.price_override) : null,
        cost_override: overrideForm.cost_override ? parseFloat(overrideForm.cost_override) : null,
        notes: overrideForm.notes || null,
      };
      const { error } = await supabase.from('customer_pricing').insert(payload);
      if (error) throw error;
      setOverrideForm({ template: '', sku: '', component_type: overrideForm.component_type, price_override: '', cost_override: '', notes: '' });
      await loadOverrides(profile.id);
    } catch (err: any) {
      console.error('override insert failed', err.message || err);
      alert('Failed to save override.');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Delete this override?')) return;
    await supabase.from('customer_pricing').delete().eq('id', id);
    if (profile?.id) loadOverrides(profile.id);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!profile) return <div className="p-12 text-center">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* EDIT MODAL */}
        {isEditing && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg">Edit Customer Profile</h3>
                        <button onClick={() => setIsEditing(false)}><X className="text-gray-400 hover:text-black"/></button>
                    </div>
                    <form onSubmit={handleSaveProfile} className="p-6 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">First Name</label>
                            <input className="w-full border rounded p-2" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Last Name</label>
                            <input className="w-full border rounded p-2" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Company</label>
                            <input className="w-full border rounded p-2" value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label>
                            <input className="w-full border rounded p-2" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Terms</label>
                            <select className="w-full border rounded p-2 bg-white" value={formData.payment_terms || 'COD'} onChange={e => setFormData({...formData, payment_terms: e.target.value})}>
                                <option>COD</option>
                                <option>Net 15</option>
                                <option>Net 30</option>
                                <option>Due on Receipt</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tax Status</label>
                            <select className="w-full border rounded p-2 bg-white" value={formData.tax_status || 'Taxable'} onChange={e => setFormData({...formData, tax_status: e.target.value})}>
                                <option>Taxable</option>
                                <option>Resale / Wholesale</option>
                                <option>Non-Profit Exempt</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tax ID / Resale #</label>
                            <input className="w-full border rounded p-2" value={formData.tax_id || ''} onChange={e => setFormData({...formData, tax_id: e.target.value})} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Billing / Shipping Address</label>
                            <textarea className="w-full border rounded p-2" rows={2} value={formData.billing_address || ''} onChange={e => setFormData({...formData, billing_address: e.target.value})} />
                        </div>

                        <div className="col-span-2 pt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:text-black font-bold">Cancel</button>
                            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 flex items-center">
                                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={16} />} Save Changes
                            </button>
                        </div>
                    </form>
                </div>
             </div>
        )}

        <Link href="/dashboard/customers" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Database
        </Link>

        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
            
            {/* MAIN CARD */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                        {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'No Name'}
                        </h1>
                        <div className="flex items-center text-gray-500 mb-4">
                           {profile.company && <><Building2 size={14} className="mr-1" /> {profile.company} <span className="mx-2">•</span></>}
                           <Mail size={14} className="mr-1" /> {profile.email}
                        </div>
                        <div className="flex gap-2">
                             <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${profile.role === 'guest' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                {profile.role}
                             </span>
                             {profile.tax_status === 'Resale / Wholesale' && <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-green-100 text-green-700">Resale</span>}
                        </div>
                    </div>
                    {/* EDIT BUTTON */}
                    {profile.id && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:text-black hover:border-black transition-all">
                            <Edit2 size={14} className="mr-2" /> Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* CRM DETAILS CARD */}
            <div className="w-full md:w-80 bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-4">
                 <div>
                    <p className="text-xs font-bold uppercase text-gray-400 mb-1 flex items-center"><Phone size={12} className="mr-1"/> Phone</p>
                    <p className="text-sm font-medium text-gray-900">{profile.phone || '—'}</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold uppercase text-gray-400 mb-1 flex items-center"><CreditCard size={12} className="mr-1"/> Payment Terms</p>
                    <p className="text-sm font-medium text-gray-900">{profile.payment_terms || 'COD'}</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold uppercase text-gray-400 mb-1 flex items-center"><FileText size={12} className="mr-1"/> Tax ID</p>
                    <p className="text-sm font-medium text-gray-900">{profile.tax_id || '—'}</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold uppercase text-gray-400 mb-1 flex items-center"><MapPin size={12} className="mr-1"/> Billing Address</p>
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{profile.billing_address || '—'}</p>
                 </div>
            </div>
        </div>

        {/* PRICING OVERRIDES */}
        {profile.id ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Tag size={16}/> Pricing Overrides</h3>
                <p className="text-sm text-gray-500">customer_pricing overrides flow into the estimator automatically.</p>
              </div>
              <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded">{pricingOverrides.length} entries</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border-b border-gray-100">
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Template (optional)</label>
                <input value={overrideForm.template} onChange={(e) => setOverrideForm({...overrideForm, template: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. bc-template" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">SKU / Component</label>
                <input value={overrideForm.sku} onChange={(e) => setOverrideForm({...overrideForm, sku: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="Component name or ID" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Type</label>
                <select value={overrideForm.component_type} onChange={(e) => setOverrideForm({...overrideForm, component_type: e.target.value})} className="w-full border rounded px-3 py-2 text-sm bg-white">
                  <option value="paper">Paper</option>
                  <option value="press">Press</option>
                  <option value="finishing">Finishing</option>
                  <option value="mailing">Mailing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Cost Override</label>
                <input value={overrideForm.cost_override} onChange={(e) => setOverrideForm({...overrideForm, cost_override: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Price Override</label>
                <input value={overrideForm.price_override} onChange={(e) => setOverrideForm({...overrideForm, price_override: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="Optional" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Notes</label>
                <input value={overrideForm.notes} onChange={(e) => setOverrideForm({...overrideForm, notes: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="Internal note" />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button onClick={handleAddOverride} disabled={savingOverride} className="px-4 py-2 bg-black text-white rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800">
                  {savingOverride ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Save Override
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {pricingOverrides.map((ovr) => (
                <div key={ovr.id} className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Tag size={14}/> {ovr.template || 'Any Template'}
                      {ovr.sku && <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-mono text-gray-700">{ovr.sku}</span>}
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                      <span className="flex items-center gap-1"><DollarSign size={12}/> {formatCurrency(ovr.price_override ?? ovr.price_amount)}</span>
                      <span className="flex items-center gap-1 text-gray-500">Cost: {formatCurrency(ovr.cost_override ?? ovr.cost_amount)}</span>
                      {ovr.component_type && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase">{ovr.component_type}</span>}
                      {ovr.notes && <span className="text-gray-500">{ovr.notes}</span>}
                    </div>
                  </div>
                  <div className="mt-2 md:mt-0 flex gap-2">
                    <button onClick={() => handleDeleteOverride(ovr.id)} className="text-gray-400 hover:text-red-600 flex items-center gap-1 text-sm font-bold"><Trash2 size={14}/> Delete</button>
                  </div>
                </div>
              ))}
              {pricingOverrides.length === 0 && (
                <div className="p-6 text-sm text-gray-400">No overrides for this customer yet.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 text-sm text-gray-500">
            Add this guest as a registered user to enable customer-specific pricing.
          </div>
        )}

        {/* ORDER HISTORY */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Order History</h3>
            <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded">{jobs.length} Orders</span>
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
