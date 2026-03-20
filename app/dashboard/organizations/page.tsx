"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  FileBox,
  Plus,
  RefreshCcw,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import InternalPageHeader from "@/components/InternalPageHeader";
import { useInternalGuard } from "@/app/hooks/useInternalGuard";

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

type OrganizationRow = {
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
  updated_at?: string;
  contacts?: { count: number }[];
  organization_activities?: { count: number }[];
};

type Owner = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  role?: string | null;
};

type CardImport = {
  id: string;
  source_filename?: string | null;
  review_status: string;
  created_at: string;
  organization_id?: string | null;
  organizations?: { name?: string | null } | { name?: string | null }[];
};

export default function OrganizationsPage() {
  const { supabase, status } = useInternalGuard();

  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [creating, setCreating] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [cardQueue, setCardQueue] = useState<CardImport[]>([]);

  const [newOrg, setNewOrg] = useState({
    name: "",
    website: "",
    status: "prospect",
    strategic_priority: "medium",
    account_owner_id: "",
    hq_city: "",
    hq_state: "",
    industry: "",
  });

  useEffect(() => {
    if (status === "authorized") {
      fetchOrganizations();
      fetchCardQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const [{ data: orgData, error: orgError }, { data: ownerData }] = await Promise.all([
        supabase
          .from("organizations")
          .select("*, contacts(count), organization_activities(count)")
          .order("updated_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role")
          .in("role", ["admin", "staff"]),
      ]);

      if (orgError) throw orgError;

      setOrgs(orgData || []);
      setOwners(ownerData || []);
    } catch (err) {
      console.error("Failed to load organizations", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCardQueue = async () => {
    try {
      setQueueLoading(true);
      const { data, error } = await supabase
        .from("organization_card_imports")
        .select("id, source_filename, review_status, created_at, organization_id, organizations(name)")
        .eq("review_status", "pending")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      setCardQueue(data || []);
    } catch (err) {
      console.error("Failed to load card import queue", err);
    } finally {
      setQueueLoading(false);
    }
  };

  const contactTotal = useMemo(
    () =>
      orgs.reduce(
        (sum, o) => sum + ((Array.isArray(o.contacts) && o.contacts[0]?.count) || 0),
        0
      ),
    [orgs]
  );

  const filteredOrgs = useMemo(() => {
    if (!searchTerm) return orgs;
    return orgs.filter((o) => {
      const term = searchTerm.toLowerCase();
      return (
        o.name?.toLowerCase().includes(term) ||
        (o.website || "").toLowerCase().includes(term) ||
        (o.industry || "").toLowerCase().includes(term) ||
        `${o.hq_city || ""} ${o.hq_state || ""}`.toLowerCase().includes(term)
      );
    });
  }, [orgs, searchTerm]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.name.trim()) return alert("Organization name is required");
    try {
      setCreating(true);
      const payload: any = {
        name: newOrg.name.trim(),
        website: newOrg.website || null,
        status: newOrg.status,
        strategic_priority: newOrg.strategic_priority,
        account_owner_id: newOrg.account_owner_id || null,
        hq_city: newOrg.hq_city || null,
        hq_state: newOrg.hq_state || null,
        industry: newOrg.industry || null,
      };
      const { error } = await supabase.from("organizations").insert(payload);
      if (error) throw error;
      setNewOrg({
        name: "",
        website: "",
        status: "prospect",
        strategic_priority: "medium",
        account_owner_id: "",
        hq_city: "",
        hq_state: "",
        industry: "",
      });
      fetchOrganizations();
    } catch (err: any) {
      alert(err?.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  const handleCardDecision = async (id: string, status: "approved" | "rejected") => {
    try {
      await supabase
        .from("organization_card_imports")
        .update({ review_status: status })
        .eq("id", id);
      fetchCardQueue();
    } catch (err) {
      console.error("Failed to update card import", err);
    }
  };

  const organizationCount = orgs.length;
  const activeCount = orgs.filter((o) => o.status === "active").length;
  const withOwner = orgs.filter((o) => !!o.account_owner_id).length;

  if (status === "checking" || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <InternalPageHeader
        title="Organizations & Contacts"
        description="Account-level view of PrintHQ relationships with ownership, contact health, and activity cues."
        icon={Building2}
        breadcrumbs={[{ label: "Organizations" }]}
        actions={
          <button
            onClick={fetchOrganizations}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-black"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            label="Organizations"
            value={organizationCount}
            icon={<Building2 size={18} />}
          />
          <StatCard
            label="Active Accounts"
            value={activeCount}
            icon={<Shield size={18} />}
            accent="bg-green-50 text-green-700"
          />
          <StatCard
            label="Contacts"
            value={contactTotal}
            icon={<Users size={18} />}
          />
          <StatCard
            label="Owned Accounts"
            value={withOwner}
            icon={<User size={18} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="flex flex-col gap-3 p-5 border-b border-gray-100 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Accounts</p>
                <h3 className="text-lg font-bold text-gray-900">Organizations</h3>
                <p className="text-sm text-gray-500">Search accounts and jump into contacts + activity.</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, industry, location"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm focus:border-black focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[12px] font-bold">
                  <tr>
                    <th className="px-5 py-3 text-left">Organization</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Priority</th>
                    <th className="px-5 py-3 text-left">Contacts</th>
                    <th className="px-5 py-3 text-left">Owner</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrgs.map((org) => {
                    const contactCount = (Array.isArray(org.contacts) && org.contacts[0]?.count) || 0;
                    const activityCount = (Array.isArray(org.organization_activities) && org.organization_activities[0]?.count) || 0;
                    const owner = owners.find((o) => o.id === org.account_owner_id);
                    return (
                      <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                              {org.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-tight">{org.name}</p>
                              <p className="text-[12px] text-gray-500 flex items-center gap-2">
                                {org.industry || "Industry TBD"}
                                {org.hq_city && (
                                  <span className="text-gray-400">• {org.hq_city}{org.hq_state ? `, ${org.hq_state}` : ""}</span>
                                )}
                              </p>
                              {org.website && (
                                <a
                                  href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline"
                                >
                                  {org.website}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                              STATUS_STYLES[org.status] || "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                              PRIORITY_STYLES[org.strategic_priority || "medium"] || PRIORITY_STYLES["medium"]
                            }`}
                          >
                            {org.strategic_priority || "medium"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-900 font-semibold">
                          <div className="flex items-center gap-2 text-sm">
                            <Users size={14} className="text-gray-400" /> {contactCount}
                            <span className="text-[11px] text-gray-400">{activityCount} activities</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {owner ? (
                            <div className="text-sm font-semibold text-gray-800">
                              {owner.first_name || owner.email}
                              <div className="text-[11px] text-gray-500">{owner.email}</div>
                            </div>
                          ) : (
                            <span className="text-[12px] text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/organizations/${org.id}`}
                            className="inline-flex items-center gap-1 text-sm font-bold text-gray-700 hover:text-black"
                          >
                            Open <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                        No organizations match "{searchTerm}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">New</p>
                  <h4 className="text-lg font-bold text-gray-900">Quick Create Organization</h4>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <Plus size={18} />
                </div>
              </div>

              <form className="space-y-3" onSubmit={handleCreateOrg}>
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-500">Name</label>
                  <input
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-500">Website</label>
                  <input
                    value={newOrg.website}
                    onChange={(e) => setNewOrg({ ...newOrg, website: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black"
                    placeholder="example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-500">Status</label>
                    <select
                      value={newOrg.status}
                      onChange={(e) => setNewOrg({ ...newOrg, status: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      {Object.keys(STATUS_STYLES).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-500">Priority</label>
                    <select
                      value={newOrg.strategic_priority}
                      onChange={(e) => setNewOrg({ ...newOrg, strategic_priority: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      {Object.keys(PRIORITY_STYLES).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-500">City</label>
                    <input
                      value={newOrg.hq_city}
                      onChange={(e) => setNewOrg({ ...newOrg, hq_city: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-500">State</label>
                    <input
                      value={newOrg.hq_state}
                      onChange={(e) => setNewOrg({ ...newOrg, hq_state: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-500">Industry</label>
                  <input
                    value={newOrg.industry}
                    onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="(optional)"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-500">Account Owner</label>
                  <select
                    value={newOrg.account_owner_id}
                    onChange={(e) => setNewOrg({ ...newOrg, account_owner_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Unassigned</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {(o.first_name && `${o.first_name} ${o.last_name || ""}`.trim()) || o.email}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white py-2.5 font-bold text-sm hover:bg-gray-900 disabled:opacity-50"
                >
                  {creating ? "Saving…" : "Create Organization"}
                </button>
              </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Queue</p>
                  <h4 className="text-lg font-bold text-gray-900">Business Card Imports</h4>
                  <p className="text-sm text-gray-500">Pending OCR / card uploads waiting for review.</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <FileBox size={18} />
                </div>
              </div>

              {queueLoading ? (
                <div className="py-6 text-center text-gray-500">Loading…</div>
              ) : cardQueue.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-sm">No pending card imports.</div>
              ) : (
                <div className="space-y-3">
                  {cardQueue.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-100 rounded-xl p-3 flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-gray-900">
                          {item.source_filename || "Card Upload"}
                        </div>
                        <div className="text-[12px] text-gray-500">
                          {(Array.isArray(item.organizations) ? item.organizations[0]?.name : item.organizations?.name) || "Unmatched"}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCardDecision(item.id, "rejected")}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleCardDecision(item.id, "approved")}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-2">
                <Activity size={12} /> Routing approved cards into Contacts will be wired next.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center justify-between ${accent || ""}`}>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</p>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
      <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">{icon}</div>
    </div>
  );
}
