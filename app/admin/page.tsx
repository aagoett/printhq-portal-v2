"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DynamicAdminDashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserRole();
  }, []);

  async function checkUserRole() {
    // 1. Get the current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/auth/login"); // No user? Go to login
      return;
    }

    // 2. Fetch their Profile to see their Role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      setRole(profile.role); // e.g., 'admin', 'prepress', 'bindery'
    } else {
      // If they have no profile, assume they are a customer and kick them out
      router.push("/dashboard");
    }
    
    setLoading(false);
  }

  if (loading) {
    return <div style={{ padding: "2rem", color: "#94a3b8" }}>Identifying user...</div>;
  }

  // --- TRAFFIC CONTROLLER LOGIC ---
  
  // If PREPRESS -> Show the Prepress Queue
  if (role === "prepress") {
    return <PrepressView />;
  }

  // If ADMIN -> Show everything (The Command Center)
  if (role === "admin") {
    return <AdminCommandCenter />;
  }

  // If BINDERY (Placeholder for now)
  if (role === "bindery") {
    return <div style={{ padding: "2rem" }}>Bindery Queue coming soon...</div>;
  }

  // If they somehow got here but aren't staff
  return (
    <div style={{ padding: "2rem" }}>
      Access Denied. <Link href="/dashboard">Return to Customer Dashboard</Link>
    </div>
  );
}

// ==========================================
// 1. THE ADMIN VIEW (Command Center)
// ==========================================
function AdminCommandCenter() {
  const [jobs, setJobs] = useState<any[]>([]);
  
  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      setJobs(data || []);
    }
    fetchAll();
  }, []);

  const total = jobs.length;
  const newOrders = jobs.filter(j => j.status === "Submitted").length;
  const inProd = jobs.filter(j => j.status === "In Production").length;

  return (
    <div>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Command Center</h1>
      <p style={{ opacity: 0.6, marginBottom: "2rem" }}>Welcome back, Admin. Here is the full shop overview.</p>
      
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
        <StatBox label="Total Active Jobs" value={total} color="#3b82f6" />
        <StatBox label="New / Submitted" value={newOrders} color="#f59e0b" />
        <StatBox label="In Production" value={inProd} color="#10b981" />
      </div>

      {/* Admin Master List */}
      <JobTable jobs={jobs} title="Master Job List" />
    </div>
  );
}

// ==========================================
// 2. THE PREPRESS VIEW (Focused Queue)
// ==========================================
function PrepressView() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchQueue() {
      // FILTER: Only show jobs that need Prepress attention
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .in('status', ['Submitted', 'Proofing', 'Waiting for Files']) 
        .order("created_at", { ascending: true }); // Oldest first!
      setJobs(data || []);
    }
    fetchQueue();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "#38bdf8" }}>Prepress Queue</h1>
      <p style={{ opacity: 0.6, marginBottom: "2rem" }}>
        Focus on these jobs. Check files and generate proofs.
      </p>
      
      <JobTable jobs={jobs} title="Priority Queue" />
    </div>
  );
}

// ==========================================
// SHARED COMPONENTS
// ==========================================

function JobTable({ jobs, title }: { jobs: any[], title: string }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #334155", fontWeight: 700, color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase" }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead style={{ background: "#0f172a", color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase" }}>
          <tr>
            <th style={{ padding: "1rem" }}>Job #</th>
            <th style={{ padding: "1rem" }}>Project</th>
            <th style={{ padding: "1rem" }}>Status</th>
            <th style={{ padding: "1rem" }}>Action</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: "0.95rem" }}>
          {jobs.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: "3rem", textAlign: "center", opacity: 0.5 }}>No jobs found.</td></tr>
          ) : (
            jobs.map(job => (
              <tr key={job.id} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ padding: "1rem", fontWeight: 700, fontFamily: "monospace" }}>{job.job_code || "---"}</td>
                <td style={{ padding: "1rem" }}>{job.project_name}</td>
                <td style={{ padding: "1rem" }}>
                  <StatusPill status={job.status} />
                </td>
                <td style={{ padding: "1rem" }}>
                  <Link 
                    href={`/admin/jobs/${job.id}`}
                    style={{ 
                      display: "inline-block", padding: "0.4rem 0.8rem", background: "#3b82f6", color: "#fff", 
                      borderRadius: "6px", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 
                    }}
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div style={{ background: "#1e293b", padding: "1.5rem", borderRadius: "12px", borderTop: `4px solid ${color}` }}>
      <div style={{ opacity: 0.7, marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  let color = "#94a3b8";
  let bg = "rgba(148, 163, 184, 0.1)";

  if (status === "Submitted") { color = "#fbbf24"; bg = "rgba(245, 158, 11, 0.15)"; } 
  if (status === "In Production") { color = "#34d399"; bg = "rgba(16, 185, 129, 0.15)"; }
  if (status === "Waiting for Files") { color = "#f472b6"; bg = "rgba(244, 114, 182, 0.15)"; }
  
  return (
    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "99px", background: bg, color: color, fontWeight: 600, fontSize: "0.75rem", border: `1px solid ${color}30` }}>
      {status}
    </span>
  );
}
