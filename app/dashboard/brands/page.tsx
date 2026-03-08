'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, Plus, Trash2, Edit2, Save, X, Building2, Palette,
  Globe, Phone, Mail, Loader2, Check
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Brand = {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
};

const DEFAULT_COLORS = [
  '#000000', '#1d4ed8', '#16a34a', '#dc2626', '#9333ea',
  '#ea580c', '#0891b2', '#be185d', '#854d0e', '#374151',
];

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: '', primary_color: '#000000', website: '', phone: '', email: '', address: '' };
  const [editForm, setEditForm] = useState<typeof emptyForm>(emptyForm);
  const [newForm, setNewForm] = useState<typeof emptyForm>(emptyForm);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') { router.push('/dashboard'); return; }

    fetchBrands();
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from('brands').select('*').order('name');
    if (data) setBrands(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newForm.name.trim()) { alert('Brand name is required.'); return; }
    setSaving(true);
    const { error } = await supabase.from('brands').insert({
      name:          newForm.name.trim(),
      primary_color: newForm.primary_color || '#000000',
      website:       newForm.website || null,
      phone:         newForm.phone || null,
      email:         newForm.email || null,
      address:       newForm.address || null,
    });
    if (error) { alert('Failed to create brand: ' + error.message); setSaving(false); return; }
    setNewForm(emptyForm);
    setShowNewForm(false);
    await fetchBrands();
    setSaving(false);
  };

  const startEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setEditForm({
      name:          brand.name,
      primary_color: brand.primary_color || '#000000',
      website:       brand.website || '',
      phone:         brand.phone || '',
      email:         brand.email || '',
      address:       brand.address || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('brands').update({
      name:          editForm.name.trim(),
      primary_color: editForm.primary_color,
      website:       editForm.website || null,
      phone:         editForm.phone || null,
      email:         editForm.email || null,
      address:       editForm.address || null,
    }).eq('id', editingId);
    if (error) { alert('Update failed: ' + error.message); setSaving(false); return; }
    setEditingId(null);
    await fetchBrands();
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete brand "${name}"? Jobs linked to this brand will lose their brand association.`)) return;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    await fetchBrands();
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-500">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 size={28} className="text-gray-400" /> Company Brands
              </h1>
              <p className="text-gray-500 mt-1">Manage your {brands.length} print company brands.</p>
            </div>
          </div>
          <button
            onClick={() => { setShowNewForm(true); setEditingId(null); }}
            className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-800 shadow-lg transition-colors"
          >
            <Plus size={16} /> Add Brand
          </button>
        </div>

        {/* New Brand Form */}
        {showNewForm && (
          <div className="bg-white rounded-xl border-2 border-black shadow-lg p-6 mb-6 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Plus size={16} /> New Brand</h3>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-black"><X size={20} /></button>
            </div>
            <BrandForm form={newForm} onChange={setNewForm} />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create Brand
              </button>
              <button onClick={() => setShowNewForm(false)} className="px-4 py-2.5 text-sm font-bold border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}

        {/* Brand Cards */}
        <div className="space-y-4">
          {brands.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Building2 size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No brands yet. Add your first company brand.</p>
            </div>
          )}
          {brands.map(brand => (
            <div key={brand.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {editingId === brand.id ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Edit: {brand.name}</h3>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-black"><X size={18} /></button>
                  </div>
                  <BrandForm form={editForm} onChange={setEditForm} />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-bold border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="p-6 flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Color Swatch */}
                    <div
                      className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm"
                      style={{ backgroundColor: brand.primary_color || '#000000' }}
                    >
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{brand.name}</h3>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {brand.email && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail size={11} /> {brand.email}
                          </span>
                        )}
                        {brand.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone size={11} /> {brand.phone}
                          </span>
                        )}
                        {brand.website && (
                          <a href={brand.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Globe size={11} /> {brand.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        {brand.address && (
                          <span className="text-xs text-gray-500">{brand.address}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: brand.primary_color || '#000' }} />
                        <span className="text-xs text-gray-400 font-mono">{brand.primary_color || '#000000'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(brand)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:border-black hover:text-black transition-colors">
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(brand.id, brand.name)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandForm({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Brand Name *</label>
        <input
          value={form.name}
          onChange={e => onChange((f: any) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. PrintHQ West"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Palette size={11} /> Brand Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={form.primary_color}
            onChange={e => onChange((f: any) => ({ ...f, primary_color: e.target.value }))}
            className="h-9 w-12 rounded cursor-pointer border border-gray-300"
          />
          <div className="flex gap-1 flex-wrap">
            {DEFAULT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onChange((f: any) => ({ ...f, primary_color: c }))}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${form.primary_color === c ? 'border-black scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Mail size={11} /> Email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => onChange((f: any) => ({ ...f, email: e.target.value }))}
          placeholder="orders@brand.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Phone size={11} /> Phone</label>
        <input
          value={form.phone}
          onChange={e => onChange((f: any) => ({ ...f, phone: e.target.value }))}
          placeholder="(555) 000-0000"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Globe size={11} /> Website</label>
        <input
          value={form.website}
          onChange={e => onChange((f: any) => ({ ...f, website: e.target.value }))}
          placeholder="https://brand.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Address</label>
        <input
          value={form.address}
          onChange={e => onChange((f: any) => ({ ...f, address: e.target.value }))}
          placeholder="123 Main St, City, ST 00000"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
        />
      </div>
    </div>
  );
}
