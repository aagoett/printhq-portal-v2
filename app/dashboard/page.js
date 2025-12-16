"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // keep using your existing client

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

export default function DashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingJobId, setUploadingJobId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [error, setError] = useState("");

  // --- LOAD JOBS FROM SUPABASE ---
  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Error loading jobs", error);
        setError("Couldn't load jobs. Please try again.");
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    };

    loadJobs();
  }, []);

  const activeJobs = jobs.length;
  const needingApproval = jobs.filter(
    (job) => job.proof_status === "Needs Your Approval"
  ).length;
  const waitingForFiles = jobs.filter(
    (job) => job.status === "Waiting for Files"
  ).length;

  // --- FILE UPLOAD HANDLER (fixed) ---
  const handleUploadClick = (job) => {
    setUploadMessage("");
    setError("");

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.ai,.indd,.psd,.eps,.jpg,.jpeg,.png";

    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setUploadingJobId(job.id);
        setUploadMessage("");

        const ext = file.name.split(".").pop();
        const fileName = `${job.job_code || job.id}-${Date.now()}.${ext}`;
        const filePath = `${job.id}/${fileName}`;

        // 1) Upload to Supabase Storage (bucket: art-files)
        const { error: storageError } = await supabase.storage
          .from("art-files")
          .upload(filePath, file);

        if (storageError) {
          console.error("Storage upload error:", storageError);
          setError("Upload failed. Please try again.");
          return;
        }

        // 2) Record in job_files table for operators
        const { error: dbError } = await supabase.from("job_files").insert({
          job_id: job.id,
          file_path: filePath,
          original_name: file.name,
        });

        if (dbError) {
          console.error("job_files insert error:", dbError);
          setError("File stored, but database row failed. Tell dev.");
          return;
        }

        setUploadMessage("Upload successful.");
      } finally {
        setUploadingJobId(null);
        // Slight delay so the message is visible
        setTimeout(() => setUploadMessage(""), 3000);
      }
    };

    input.click();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 3rem",
        color: "#f9fafb",
        background:
          "radial-gradient(circle at top, #111827 0, #020617 45%, #000 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
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
          subtitle="Jobs currently in your pipeline"
        />
        <StatCard
          label="Needs Approval"
          value={needingApproval}
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

      {/* ERROR / STATUS MESSAGES */}
      {(error || uploadMessage) && (
        <div style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error && (
            <div
              style={{
                marginBottom: "0.5rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                background: "rgba(248, 113, 113, 0.15)",
                border: "1px solid rgba(248, 113, 113, 0.5)",
              }}
            >
              {error}
            </div>
          )}
          {uploadMessage && !error && (
            <div
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.5)",
              }}
            >
              {uploadMessage}
            </div>
          )}
        </div>
      )}

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

          {/* Header row */}
          <div
            style={{
              fontSize: "0.85rem",
              opacity: 0.7,
              borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
              paddingBottom: "0.5rem",
              marginBottom: "0.75rem",
              display: "grid",
              gridTemplateColumns: "0.9fr 1.4fr 1.1fr 1.1fr 0.9fr 0.9fr",
              gap: "0.5rem",
            }}
          >
            <span>Job</span>
            <span>Project</span>
            <span>Status</span>
            <span>Proof</span>
            <span>Due</span>
            <span>Files</span>
          </div>

          {/* Job rows */}
          {loading ? (
            <div style={{ opacity: 0.7, fontSize: "0.9rem" }}>Loading jobs…</div>
          ) : jobs.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: "0.9rem" }}>
              No jobs yet. Click &ldquo;New Job / Quote&rdquo; to get started.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
            >
              {jobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "0.9fr 1.4fr 1.1fr 1.1fr 0.9fr 0.9fr",
                    gap: "0.5rem",
                    alignItems: "center",
                    fontSize: "0.9rem",
                    padding: "0.45rem 0.35rem",
                    borderRadius: "0.6rem",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(31, 41, 55, 0.8)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      opacity: 0.9,
                    }}
                  >
                    {job.job_code || "—"}
                  </span>
                  <span>{job.project_name}</span>
                  <Badge tone={statusTone(job.status)}>{job.status}</Badge>
                  <Badge tone={proofTone(job.proof_status)}>
                    {job.proof_status}
                  </Badge>
                  <span style={{ opacity: 0.8 }}>
                    {job.due_date || "Not set"}
                  </span>
                  <button
                    onClick={() => handleUploadClick(job)}
                    disabled={uploadingJobId === job.id}
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: "999px",
                      border: "1px solid rgba(148, 163, 184, 0.6)",
                      background:
                        uploadingJobId === job.id
                          ? "rgba(148, 163, 184, 0.2)"
                          : "transparent",
                      color: "#e5e7eb",
                      fontSize: "0.8rem",
                      cursor:
                        uploadingJobId === job.id ? "wait" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {uploadingJobId === job.id ? "Uploading…" : "Upload Files"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (unchanged copy text) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
              <li>• {needingApproval} proof(s) waiting on your approval</li>
              <li>• You&apos;ll receive an email each time a new proof is ready</li>
            </ul>
          </div>

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
