"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // Check this path matches your project structure

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllJobs() {
      // Fetch ALL jobs without user filtering
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching shop data:", error);
      else setJobs(data || []);
      
      setLoading(false);
    }
    fetchAllJobs();
  }, []);

  // Calculate live stats
  const total = jobs.length;
  const newOrders = jobs.filter(j => j.status === "Submitted").length;
  const inProd = jobs.filter(j => j.status === "In Production").length;
  const waiting = jobs.filter(j => j.status === "Waiting for Files").length;

  return (
    <div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>Shop Overview</h1>
      
      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
        <StatBox label="Total Active Jobs" value={total} color="#3b82f6" />
        <StatBox label="New / Submitted" value={newOrders} color="#f59e0b" />
        <StatBox label="Waiting for Files" value={waiting} color="#fbbf24" />
        <StatBox label="In Production" value={inProd} color="#10b981" />
      </div>

      {/* Master Job List */}
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Master Job List</h3>
          <input placeholder="Search jobs..." style={{ background: "#0f172a", border: "1px solid #334155", padding: "0.5rem 1rem", borderRadius: "6px", color: "#fff" }} />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "#0f172a", color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase" }}>
            <tr>
              <th style={{ padding: "1rem" }}>Job #</th>
              <th style={{ padding: "1rem" }}>Project Name</th>
              <th style={{ padding: "1rem" }}>Status</th>
              <th style={{ padding: "1rem" }}>Proof</th>
              <th style={{ padding: "1rem" }}>Date In</th>
              <th style={{ padding: "1rem" }}>Action</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: "0.95rem" }}>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", opacity: 0.5 }}>Loading shop data...</td></tr>
            ) : jobs.length === 0 ? (
               <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", opacity: 0.5 }}>No jobs found in database.</td></tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} style={{ borderBottom: "1px solid #334155" }}>
                  <td style={{ padding: "1rem", fontWeight: 700, fontFamily: "monospace" }}>{job.job_code || "---"}</td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ fontWeight: 600 }}>{job.project_name}</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>ID: {job.id.slice(0, 6)}...</div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <StatusPill status={job.status} />
                  </td>
                  <td style={{ padding: "1rem" }}>
                     <span style={{ opacity: 0.7 }}>{job.proof_status || "Not Created"}</span>
                  </td>
                  <td style={{ padding: "1rem", opacity: 0.7 }}>
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <button style={{ padding: "0.4rem 0.8rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatBox({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div style={{ background: "#1e293b", padding: "1.5rem", borderRadius: "12px", borderTop: `4px solid ${color}`, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
      <div style={{ opacity: 0.7, marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  let color = "#94a3b8";
  let bg = "rgba(148, 163, 184, 0.1)";

  if (status === "Submitted") { color = "#fbbf24"; bg = "rgba(245, 158, 11, 0.15)"; } // Orange
  if (status === "In Production") { color = "#34d399"; bg = "rgba(16, 185, 129, 0.15)"; } // Green
  if (status === "Waiting for Files") { color = "#f472b6"; bg = "rgba(244, 114, 182, 0.15)"; } // Pink
  
  return (
    <span style={{ 
      padding: "0.25rem 0.75rem", 
      borderRadius: "99px", 
      background: bg,
      color: color,
      fontWeight: 600,
      fontSize: "0.75rem",
      border: `1px solid ${color}30`
    }}>
      {status}
    </span>
  );
}
