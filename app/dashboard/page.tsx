"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase"; // Adjust path if needed (likely ../../lib/supabase)

export default function DashboardPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Fetch jobs matching this user
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("user_id", user.id) // <--- THIS is what connects the job to you
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching jobs:", error);
        } else {
          setJobs(data || []);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate stats dynamically
  const activeJobs = jobs.length;
  const needsApproval = jobs.filter((j) => j.proof_status === "Needs Approval").length;
  const waitingForFiles = jobs.filter((j) => j.status === "Waiting for Files").length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 3rem",
        color: "#f9fafb",
        background:
          "radial-gradient(circle at top, #111827 0%, #020617 45%, #000 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2.2rem", margin: 0 }}>PrintHQ Dashboard</h1>
          <p style={{ marginTop: "0.35rem", opacity: 0.8 }}>
            Welcome back. Here’s what’s happening with your jobs.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "999px",
              border: "1px solid rgba(148, 163, 184, 0.5)",
              background: "transparent",
              color: "#f9fafb",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => alert("Reorder flow coming next.")}
          >
            Reorder a Past Job
          </button>

          <Link
            href="/jobs/new"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(to right, #4f46e5 0%, #22c55e 100%)",
              color: "#f9fafb",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(79, 70, 229, 0.4)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
            }}
          >
            + New Job / Quote
          </Link>
        </div>
      </header>

      {/* Top stats */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard title="Active Jobs" value={activeJobs} subtitle="Jobs currently in your pipeline" />
        <StatCard title="Needs Approval" value={needsApproval} subtitle="Proofs waiting on you" />
        <StatCard title="Waiting for Files" value={waitingForFiles} subtitle="Jobs created but not ready" />
      </section>

      {/* Main grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
          gap: "1.5rem",
        }}
      >
        {/* Jobs table */}
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Your Active Jobs</h2>
            <span style={{ opacity: 0.8, cursor: "pointer" }}>View all →</span>
          </div>

          <div style={{ opacity: 0.9 }}>
            {loading ? (
              <div style={{ padding: "1rem 0", opacity: 0.6 }}>Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: "1rem 0" }}>
                No jobs yet. Click <b>“New Job / Quote”</b> to get started.
              </div>
            ) : (
              // ✅ ACTUAL DATA TABLE
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 0", fontWeight: 600, opacity: 0.7 }}>Job</th>
                    <th style={{ padding: "0.75rem 0", fontWeight: 600, opacity: 0.7 }}>Project</th>
                    <th style={{ padding: "0.75rem 0", fontWeight: 600, opacity: 0.7 }}>Status</th>
                    <th style={{ padding: "0.75rem 0", fontWeight: 600, opacity: 0.7 }}>Proof</th>
                    <th style={{ padding: "0.75rem 0", fontWeight: 600, opacity: 0.7 }}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "1rem 0" }}>
                        <div style={{ fontWeight: 700 }}>{job.job_code || "---"}</div>
                      </td>
                      <td style={{ padding: "1rem 0" }}>
                        {job.project_name}
                      </td>
                      <td style={{ padding: "1rem 0" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: 99,
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "#4ade80",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 0" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: 99,
                            background: "rgba(255, 255, 255, 0.1)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {job.proof_status || "Not Created"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 0", opacity: 0.7 }}>
                        {job.due_date ? new Date(job.due_date).toLocaleDateString() : "TBD"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div style={panelStyle}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Proofs & Approvals</h2>
            <p style={{ opacity: 0.85, marginTop: "0.5rem" }}>
              Quickly approve or review proofs so we can move your jobs into production.
            </p>
            <ul style={{ opacity: 0.85, paddingLeft: "1.2rem", marginTop: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>{needsApproval} proof(s) waiting on your approval</li>
              <li>You’ll receive an email each time a new proof is ready</li>
            </ul>
          </div>

          <div
            style={{
              ...panelStyle,
              border: "1px dashed rgba(59, 130, 246, 0.5)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>What would you like to do next?</h2>
            <ul style={{ opacity: 0.85, marginTop: "0.75rem", paddingLeft: "1.2rem", lineHeight: "1.6" }}>
              <li>Start a new job or quote</li>
              <li>Upload updated art files for an existing job</li>
              <li>Review and approve pending proofs</li>
              <li>Reorder a job you’ve printed before</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, subtitle }: { title: string, value: number, subtitle: string }) {
  return (
    <div style={panelStyle}>
      <div style={{ opacity: 0.85, fontSize: "0.9rem" }}>{title}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.5rem" }}>{value}</div>
      <div style={{ opacity: 0.7, marginTop: "0.25rem" }}>{subtitle}</div>
    </div>
  );
}

const panelStyle = {
  background: "rgba(2, 6, 23, 0.65)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "18px",
  padding: "1.25rem",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};
