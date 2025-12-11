"use client";

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
      {/* HEADER */}
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
          subt
