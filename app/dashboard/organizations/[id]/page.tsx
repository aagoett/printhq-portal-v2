"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import InternalPageHeader from "@/components/InternalPageHeader";
import { useInternalGuard } from "@/app/hooks/useInternalGuard";
import {
  Activity,
  Building2,
  CheckCircle,
  Globe,
  Mail,
  Phone,
  Trash2,
  Users,
  User,
  FileBox,
} from "lucide-react";

const STATUS_OPTIONS = ["prospect", "active", "inactive", "partner", "vendor"];
const PRIORITY_OPTIONS = ["high", "medium", "low"];
const RELATIONSHIP_STRENGTH = ["strong", "warm", "cold"];
const BUYER_ROLES = [
  "decision_maker",
  "influencer",
  "end_user",
  "procurement",
  "finance",
  "operations",
  "marketing",
  "unknown",
];

const STATUS_STYLES: Record<string, string> = {
  prospect: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  active: "bg-green-50 text-green-700 border border-green-200",
  inactive: "bg-gray-100 text-gray-700 border border-gray-200",
  partner: "bg-purple-50 text-purple-700 border border-purple-200",
  vendor: "bg-blue-50 text-blue-700 border border-blue-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-700 border border-red-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  low: "bg-gray-100 text-gray-600 border border-gray-200",
};

type Organization = {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  employee_count?: number | null;
  revenue_band?: string | null;
  hq_city?: string | null;
  hq_state?: string | null;
  status: string;
  account_owner_id?: string | null;
  strategic_priority?: string | null;
  print_profile?: string | null;
  pain_points?: string | null;
  notes?: string | null;
};

type Owner = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
};

type Contact = {
  id: string;
  organization_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  buyer_role: string;
  relationship_strength: string;
  status: string;
  source?: string | null;
  notes?: string | null;
  last_contact_at?: string | null;
  next_follow_up_at?: string | null;
};

type Plan = {
  id?: string;
  organization_id?: string;
  target_products?: string | null;
  likely_needs?: string | null;
  seasonality?: string | null;
  competitor_notes?: string | null;
  current_strategy?: string | null;
  next_best_action?: string | null;
  warm_intro_paths?: string | null;
};

type ActivityRow = {
  id: string;
  organization_id: string;
  contact_id?: string | null;
  type: string;
  subject?: string | null;
  detail?: string | null;
  occurred_at: string;
  owner_id?: string | null;
};

type CardImport = {
  id: string;
  source_filename?: string | null;
  raw_text?: string | null;
  parsed_json?: any;
  review_status: string;
  created_at: string;
  organization_id?: string | null;
  contact_id?: string | null;
};

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { supabase, status } = useInternalGuard();

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [orgForm, setOrgForm] = useState<Partial<Organization>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [cardImports, setCardImports] = useState<CardImport[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState<Partial<Contact>>({
    buyer_role: "unknown",
    relationship_strength: "cold",
    status: "active",
  });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({
    type: "note",
    subject: "",
    detail: "",
    occurred_at: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    if (!organizationId || status !== "authorized") return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, status]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await supabase.auth.getUser();
      setCurrentUserId(userRes.data.user?.id || null);

      const [orgRes, contactsRes, planRes, activityRes, cardImportRes, ownerRes] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", organizationId).single(),
        supabase
          .from("contacts")
          .select("*")
          .eq("organization_id", organizationId)
          .order("first_name", { ascending: true }),
        supabase
          .from("organization_plans")
          .select("*")
          .eq("organization_id", organizationId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("organization_activities")
          .select("*")
          .eq("organization_id", organizationId)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("organization_card_imports")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role")
          .in("role", ["admin", "staff"]),
      ]);

      if (orgRes.error) throw orgRes.error;

      setOrganization(orgRes.data);
      setOrgForm(orgRes.data || {});
      setPlan(planRes.data || null);
      setContacts(contactsRes.data || []);
      setActivities(activityRes.data || []);
      setCardImports(cardImportRes.data || []);
      setOwners(ownerRes.data || []);
    } catch (err) {
      console.error("Failed to load organization", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    try {
      const payload = {
        name: orgForm.name,
        website: orgForm.website || null,
        industry: orgForm.industry || null,
        employee_count: orgForm.employee_count || null,
        revenue_band: orgForm.revenue_band || null,
        hq_city: orgForm.hq_city || null,
        hq_state: orgForm.hq_state || null,
        status: orgForm.status || "prospect",
        account_owner_id: orgForm.account_owner_id || null,
        strategic_priority: orgForm.strategic_priority || "medium",
        print_profile: orgForm.print_profile || null,
        pain_points: orgForm.pain_points || null,
        notes: orgForm.notes || null,
      };
      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", organizationId);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to save organization");
    }
  };

  const handlePlanSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    try {
      if (plan?.id) {
        const { error } = await supabase
          .from("organization_plans")
          .update(plan)
          .eq("id", plan.id);
        if (error) throw error;
      } else {
        const payload = { ...(plan || {}), organization_id: organizationId } as Plan;
        const { error } = await supabase.from("organization_plans").insert(payload);
        if (error) throw error;
      }
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to save plan");
    }
  };

  const resetContactForm = () => {
    setEditingContactId(null);
    setContactForm({ buyer_role: "unknown", relationship_strength: "cold", status: "active" });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    try {
      const payload: any = {
        ...contactForm,
        organization_id: organizationId,
        first_name: contactForm.first_name || null,
        last_name: contactForm.last_name || null,
        title: contactForm.title || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        linkedin_url: contactForm.linkedin_url || null,
        buyer_role: contactForm.buyer_role || "unknown",
        relationship_strength: contactForm.relationship_strength || "cold",
        status: contactForm.status || "active",
        notes: contactForm.notes || null,
        full_name: `${contactForm.first_name || ""} ${contactForm.last_name || ""}`.trim() || null,
      };

      if (editingContactId) {
        const { error } = await supabase
          .from("contacts")
          .update(payload)
          .eq("id", editingContactId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
      }
      resetContactForm();
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to save contact");
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    loadData();
  };

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    try {
      const { error } = await supabase.from("organization_activities").insert({
        organization_id: organizationId,
        type: activityForm.type,
        subject: activityForm.subject || null,
        detail: activityForm.detail || null,
        occurred_at: activityForm.occurred_at ? new Date(activityForm.occurred_at).toISOString() : new Date().toISOString(),
        owner_id: currentUserId,
      });
      if (error) throw error;
      setActivityForm({ type: "note", subject: "", detail: "", occurred_at: new Date().toISOString().slice(0, 16) });
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to log activity");
    }
  };

  const handleCardDecision = async (id: string, status: "approved" | "rejected") => {
    await supabase
      .from("organization_card_imports")
      .update({ review_status: status })
      .eq("id", id);
    loadData();
  };

  const contactCount = contacts.length;

  if (status === "checking" || loading || !organization) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  const owner = owners.find((o) => o.id === organization.account_owner_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <InternalPageHeader
        title={organization.name}
        description="Account summary, contacts, owner, and activity."
        icon={Building2}
        breadcrumbs={[
          { label: "Organizations", href: "/dashboard/organizations" },
          { label: organization.name },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <MiniStat
            label="Status"
            value={organization.status}
            pillClass={STATUS_STYLES[organization.status]}
            icon={<CheckCircle size={16} />}
          />
          <MiniStat
            label="Priority"
            value={organization.strategic_priority || "medium"}
            pillClass={PRIORITY_STYLES[organization.strategic_priority || "medium"]}
            icon={<Users size={16} />}
          />
          <MiniStat
            label="Contacts"
            value={`${contactCount} contacts`}
            icon={<Users size={16} />}
          />
          <MiniStat
            label="Owner"
            value={owner ? owner.first_name || owner.email : "Unassigned"}
            icon={<User size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Overview</p>
                  <h3 className="text-lg font-bold text-gray-900">Organization Profile</h3>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleOrgSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Name">
                    <input
                      value={orgForm.name || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black"
                      required
                    />
                  </Field>
                  <Field label="Website" icon={<Globe size={14} className="text-gray-400" />}>
                    <input
                      value={orgForm.website || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="example.com"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Status">
                    <select
                      value={orgForm.status || "prospect"}
                      onChange={(e) => setOrgForm({ ...orgForm, status: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select
                      value={orgForm.strategic_priority || "medium"}
                      onChange={(e) => setOrgForm({ ...orgForm, strategic_priority: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Account Owner">
                    <select
                      value={orgForm.account_owner_id || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, account_owner_id: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Unassigned</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {(o.first_name && `${o.first_name} ${o.last_name || ""}`.trim()) || o.email}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Industry">
                    <input
                      value={orgForm.industry || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Employees">
                    <input
                      type="number"
                      value={orgForm.employee_count || ""}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, employee_count: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Revenue Band">
                    <input
                      value={orgForm.revenue_band || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, revenue_band: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="$1-5M"
                    />
                  </Field>
                  <Field label="HQ">
                    <div className="flex gap-2">
                      <input
                        value={orgForm.hq_city || ""}
                        onChange={(e) => setOrgForm({ ...orgForm, hq_city: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="City"
                      />
                      <input
                        value={orgForm.hq_state || ""}
                        onChange={(e) => setOrgForm({ ...orgForm, hq_state: e.target.value })}
                        className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="ST"
                        maxLength={10}
                      />
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Print Profile">
                    <textarea
                      value={orgForm.print_profile || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, print_profile: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      rows={2}
                    />
                  </Field>
                  <Field label="Pain Points / Notes">
                    <textarea
                      value={orgForm.pain_points || orgForm.notes || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, pain_points: e.target.value, notes: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      rows={2}
                    />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2 font-bold text-sm hover:bg-gray-900"
                  >
                    Save Organization
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Account Plan</p>
                  <h3 className="text-lg font-bold text-gray-900">Targets, needs, and next play</h3>
                </div>
              </div>

              <form className="space-y-3" onSubmit={handlePlanSave}>
                <TextareaField
                  label="Target Products"
                  value={plan?.target_products || ""}
                  onChange={(v) => setPlan({ ...(plan || {}), target_products: v })}
                />
                <TextareaField
                  label="Likely Needs"
                  value={plan?.likely_needs || ""}
                  onChange={(v) => setPlan({ ...(plan || {}), likely_needs: v })}
                />
                <TextareaField
                  label="Seasonality"
                  value={plan?.seasonality || ""}
                  onChange={(v) => setPlan({ ...(plan || {}), seasonality: v })}
                />
                <TextareaField
                  label="Competitor Notes"
                  value={plan?.competitor_notes || ""}
                  onChange={(v) => setPlan({ ...(plan || {}), competitor_notes: v })}
                />
                <TextareaField
                  label="Current Strategy"
                  value={plan?.current_strategy || ""}
                  onChange={(v) => setPlan({ ...(plan || {}), current_strategy: v })}
                />
                <TextareaField
                  label="Next Best Action"
                  value={plan?.next_best_action || ""}
                  onChange={(v) => setPlan({ ...(plan || {}), next_best_action: v })}
                />
                <TextareaField
                  label="Warm Intro Paths"
                  value={plan?.warm_intro_paths || ""}
                  onChange={(v) => setPlan({ ...(plan || {}), warm_intro_paths: v })}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2 font-bold text-sm hover:bg-gray-900"
                  >
                    Save Plan
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Activity</p>
                  <h3 className="text-lg font-bold text-gray-900">Timeline</h3>
                </div>
              </div>

              <form className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4" onSubmit={handleActivitySubmit}>
                <div className="md:col-span-1">
                  <label className="text-[11px] font-bold uppercase text-gray-500">Type</label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                  >
                    {["call", "email", "meeting", "quote", "sample", "note", "task"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[11px] font-bold uppercase text-gray-500">When</label>
                  <input
                    type="datetime-local"
                    value={activityForm.occurred_at}
                    onChange={(e) => setActivityForm({ ...activityForm, occurred_at: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-gray-500">Subject</label>
                  <input
                    value={activityForm.subject}
                    onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Call notes, sample drop, etc"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[11px] font-bold uppercase text-gray-500">Detail</label>
                  <textarea
                    value={activityForm.detail}
                    onChange={(e) => setActivityForm({ ...activityForm, detail: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2 font-bold text-sm hover:bg-gray-900"
                  >
                    Log Activity
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {activities.length === 0 && (
                  <div className="text-sm text-gray-400">No activity yet.</div>
                )}
                {activities.map((a) => (
                  <div key={a.id} className="border border-gray-100 rounded-xl p-3 flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                      <Activity size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-gray-900 capitalize">{a.type}</div>
                        <div className="text-[11px] text-gray-500">
                          {new Date(a.occurred_at).toLocaleString()}
                        </div>
                      </div>
                      {a.subject && <div className="text-sm text-gray-800">{a.subject}</div>}
                      {a.detail && <div className="text-[12px] text-gray-600 whitespace-pre-line">{a.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Contacts</p>
                  <h3 className="text-lg font-bold text-gray-900">Add / Edit Contact</h3>
                </div>
              </div>

              <form className="space-y-3" onSubmit={handleContactSubmit}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="First Name">
                    <input
                      value={contactForm.first_name || ""}
                      onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      value={contactForm.last_name || ""}
                      onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </Field>
                </div>

                <Field label="Title">
                  <input
                    value={contactForm.title || ""}
                    onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email" icon={<Mail size={14} className="text-gray-400" />}>
                    <input
                      value={contactForm.email || ""}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      type="email"
                    />
                  </Field>
                  <Field label="Phone" icon={<Phone size={14} className="text-gray-400" />}>
                    <input
                      value={contactForm.phone || ""}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </Field>
                </div>

                <Field label="LinkedIn">
                  <input
                    value={contactForm.linkedin_url || ""}
                    onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="https://linkedin.com/in/.."
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Buyer Role">
                    <select
                      value={contactForm.buyer_role || "unknown"}
                      onChange={(e) => setContactForm({ ...contactForm, buyer_role: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      {BUYER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Relationship">
                    <select
                      value={contactForm.relationship_strength || "cold"}
                      onChange={(e) => setContactForm({ ...contactForm, relationship_strength: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      {RELATIONSHIP_STRENGTH.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Notes">
                  <textarea
                    value={contactForm.notes || ""}
                    onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={2}
                  />
                </Field>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={resetContactForm}
                    className="text-sm text-gray-500 hover:text-black"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2 font-bold text-sm hover:bg-gray-900"
                  >
                    {editingContactId ? "Update Contact" : "Add Contact"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Card Imports</p>
                  <h3 className="text-lg font-bold text-gray-900">Business Card Review</h3>
                  <p className="text-sm text-gray-500">Approve/reject OCR intakes for this account.</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <FileBox size={18} />
                </div>
              </div>

              {cardImports.length === 0 ? (
                <div className="text-sm text-gray-400">No imports yet.</div>
              ) : (
                <div className="space-y-3">
                  {cardImports.map((c) => (
                    <div key={c.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{c.source_filename || "Card Upload"}</div>
                          <div className="text-[11px] text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          {c.review_status}
                        </div>
                      </div>
                      {c.raw_text && (
                        <div className="mt-2 text-[12px] text-gray-600 line-clamp-3">{c.raw_text}</div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleCardDecision(c.id, "rejected")}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleCardDecision(c.id, "approved")}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Contacts</p>
              <h3 className="text-lg font-bold text-gray-900">Contact Roster</h3>
              <p className="text-sm text-gray-500">Buyer roles, relationship strength, and status.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[12px] font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Relationship</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Last Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                          {c.first_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed"}</div>
                          <div className="text-[12px] text-gray-500">{c.title || c.email || ""}</div>
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-[11px] text-blue-600 hover:underline">
                              {c.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{c.buyer_role}</td>
                    <td className="px-4 py-3 capitalize">{c.relationship_strength}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700 border border-gray-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      {c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString() : "--"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingContactId(c.id);
                            setContactForm({ ...c });
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:border-black"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      No contacts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <label className="block text-sm text-gray-700 space-y-1">
      <span className="text-[11px] font-bold uppercase text-gray-500">{label}</span>
      <div className="relative">
        {icon && <span className="absolute left-3 top-2.5">{icon}</span>}
        {icon ? <div className="pl-8">{children}</div> : children}
      </div>
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase text-gray-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        rows={2}
      />
    </div>
  );
}

function MiniStat({ label, value, pillClass, icon }: { label: string; value: string | number; pillClass?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</p>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
      {pillClass ? (
        <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${pillClass}`}>
          {icon ? <span className="inline-flex items-center gap-1">{icon} {value}</span> : value}
        </div>
      ) : (
        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">{icon}</div>
      )}
    </div>
  );
}
