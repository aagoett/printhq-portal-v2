"use client";

import Link from "next/link";

export default function DashboardPage() {
  // If you already fetch jobs from Supabase elsewhere, you can plug that back in.
  // For now, keep it simple so the buttons work 100%.
  const jobs = []; // <- replace later with real data

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

          {/* ✅ THIS is the fix: Link (always works) */}
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

          <div style={{ opacity: 0.85 }}>
            {jobs.length === 0 ? (
              <div style={{ padding: "1rem 0" }}>
                No jobs yet. Click <b>“New Job / Quote”</b> to get started.
              </div>
            ) : (
              <div>(Render your jobs here)</div>
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
            <ul style={{ opacity: 0.85 }}>
              <li>0 proof(s) waiting on your approval</li>
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
            <ul style={{ opacity: 0.85, marginTop: "0.75rem" }}>
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

function StatCard({ title, value, subtitle }) {
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
