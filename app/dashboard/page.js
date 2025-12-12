"use client";

import BrandHeader from "../components/BrandHeader";
import UploadFilesButton from "@/components/UploadFilesButton";


const mockJobs = [
  {
    id: "PH-4GBUS1U2",
    name: "INS CARD – FRONT",
    status: "In Production",
    proofStatus: "Approved",
    dueDate: "Dec 14, 2025",
  },
  {
    id: "PH-3K92LS8A",
    name: "Postcard Mailing – Q1 Promo",
    status: "Waiting for Files",
    proofStatus: "Not Created",
    dueDate: "Dec 20, 2025",
  },
  {
    id: "PH-9XZQ1M3C",
    name: "Brochure – New Product Line",
    status: "Proof Ready",
    proofStatus: "Needs Your Approval",
    dueDate: "Dec 18, 2025",
  },
];

export default function DashboardPage() {
  const activeJobs = mockJobs.length;
  const needingProof = mockJobs.filter(
    (job) => job.proofStatus === "Needs Your Approval"
  ).length;
  const waitingForFiles = mockJobs.filter(
    (job) => job.status === "Waiting for Files"
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 3rem",
        color: "#f9fafb",
        background:
          "radial-gradient(circle at top, #111827 0, #020617 45%, #000 100%)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Brand-aware header (customer logo, etc.) */}
      <BrandHeader />

      {/* DASHBOARD HEADER */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            PrintHQ Dashboard
          </h1>
          <p style={{ opacity: 0.7 }}>
            Welcome back. Here&apos;s what&apos;s happening with your jobs.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "999px",
              border: "1px solid rgba(148, 163, 184, 0.5)",
              background: "transparent",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            Reorder a Past Job
          </button>
          <button
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              border: "none",
              background:
                "linear-gradient(to right, #4f46e5 0%, #22c55e 100%)",
              color: "#f9fafb",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(79, 70, 229, 0.4)",
            }}
          >
            + New Job / Quote
          </button>
        </div>
      </header>

      {/* TOP STATS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          label="Active Jobs"
          value={activeJobs}
          subtitle="Jobs currently in your pipeline"
        />
        <StatCard
          label="Needs Approval"
          value={needingProof}
          subtitle="Proofs waiting on you"
          accent="yellow"
        />
        <StatCard
          label="Waiting for Files"
          value={waitingForFiles}
          subtitle="Jobs created but not ready"
          accent="red"
        />
      </section>

      {/* MAIN GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
          gap: "1.5rem",
        }}
      >
        {/* ACTIVE JOBS TABLE */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            borderRadius: "1rem",
            padding: "1.25rem 1.5rem",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              Your Active Jobs
            </h2>
            <button
              style={{
                fontSize: "0.85rem",
                opacity: 0.7,
                background: "transparent",
                border: "none",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              View all ▸
            </button>
          </div>

          <div
              style={{
                fontSize: "0.85rem",
                opacity: 0.7,
                borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
                paddingBottom: "0.5rem",
                marginBottom: "0.75rem",
                display: "grid",
                gridTemplateColumns: "1.1fr 1.4fr 1.1fr 0.9fr 0.7fr 0.9fr",
                gap: "0.5rem",
  }}
>
  <span>Job</span>
  <span>Project</span>
  <span>Status</span>
  <span>Proof</span>
  <span>Due</span>
  <span style={{ textAlign: "right" }}>Files</span>
</div>


          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {mockJobs.map((job) => (
  <div
    key={job.id}
    style={{
      display: "grid",
      gridTemplateColumns: "1.1fr 1.4fr 1.1fr 0.9fr 0.7fr 0.9fr",
      gap: "0.5rem",
      alignItems: "center",
      fontSize: "0.9rem",
      padding: "0.45rem 0.35rem",
      borderRadius: "0.6rem",
      background: "rgba(15, 23, 42, 0.8)",
      border: "1px solid rgba(31, 41, 55, 0.8)",
    }}
  >
    <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
      {job.id}
    </span>

    <span>{job.name}</span>

    <Badge tone={statusTone(job.status)}>{job.status}</Badge>

    <Badge tone={proofTone(job.proofStatus)}>{job.proofStatus}</Badge>

    <span style={{ opacity: 0.8 }}>{job.dueDate}</span>

    {/* New: Upload button for this job */}
    <UploadFilesButton jobId={job.id} />
  </div>
))}

          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* PROOF STATUS */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              borderRadius: "1rem",
              padding: "1.25rem 1.5rem",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              Proofs & Approvals
            </h2>
            <p style={{ fontSize: "0.9rem", opacity: 0.75, marginBottom: "0.75rem" }}>
              Quickly approve or review proofs so we can move your jobs into
              production.
            </p>
            <ul style={{ fontSize: "0.9rem", opacity: 0.85, paddingLeft: "1.1rem" }}>
              <li>• {needingProof} proof(s) waiting on your approval</li>
              <li>• You&apos;ll receive an email each time a new proof is ready</li>
            </ul>
          </div>

          {/* QUICK HELP / NEXT STEPS */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              borderRadius: "1rem",
              padding: "1.1rem 1.3rem",
              border: "1px dashed rgba(59, 130, 246, 0.7)",
            }}
          >
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              What would you like to do next?
            </h3>
            <ul
              style={{
                fontSize: "0.9rem",
                opacity: 0.9,
                paddingLeft: "1.1rem",
                lineHeight: 1.5,
              }}
            >
              <li>• Start a new job or quote</li>
              <li>• Upload updated art files for an existing job</li>
              <li>• Review and approve pending proofs</li>
              <li>• Reorder a job you&apos;ve printed before</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

/** Small reusable components */

function StatCard({ label, value, subtitle, accent = "blue" }) {
  const borderColor =
    accent === "yellow"
      ? "rgba(250, 204, 21, 0.5)"
      : accent === "red"
      ? "rgba(248, 113, 113, 0.6)"
      : "rgba(59, 130, 246, 0.6)";

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.9)",
        borderRadius: "1rem",
        padding: "1rem 1.25rem",
        border: `1px solid ${borderColor}`,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.6)",
      }}
    >
      <div style={{ fontSize: "0.8rem", opacity: 0.7, marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.2rem" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{subtitle}</div>
    </div>
  );
}

function Badge({ children, tone }) {
  const bg =
    tone === "green"
      ? "rgba(34, 197, 94, 0.18)"
      : tone === "yellow"
      ? "rgba(250, 204, 21, 0.18)"
      : tone === "red"
      ? "rgba(248, 113, 113, 0.18)"
      : "rgba(148, 163, 184, 0.18)";

  const border =
    tone === "green"
      ? "rgba(34, 197, 94, 0.6)"
      : tone === "yellow"
      ? "rgba(250, 204, 21, 0.7)"
      : tone === "red"
      ? "rgba(248, 113, 113, 0.7)"
      : "rgba(148, 163, 184, 0.7)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.15rem 0.6rem",
        borderRadius: "999px",
        fontSize: "0.75rem",
        border: `1px solid ${border}`,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function statusTone(status) {
  if (status === "In Production") return "green";
  if (status === "Waiting for Files") return "red";
  if (status === "Proof Ready") return "yellow";
  return "gray";
}

function proofTone(status) {
  if (status === "Needs Your Approval") return "yellow";
  if (status === "Approved") return "green";
  if (status === "Not Created") return "gray";
  return "gray";
}
