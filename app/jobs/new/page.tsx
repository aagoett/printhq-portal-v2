"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewJobPage() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("Waiting for Files");
  const [proofStatus, setProofStatus] = useState("Not Created");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from("jobs")
        .insert([
          {
            project_name: projectName,
            status,
            proof_status: proofStatus,
            due_date: dueDate || null,
          },
        ]);

      if (insertError) throw insertError;

      // back to dashboard to see the job
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong creating the job.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #111827 0, #020617 45%, #000 100%)",
        padding: "2rem",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "rgba(15, 23, 42, 0.95)",
          borderRadius: "1.5rem",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.9)",
          padding: "1.75rem 2rem 2rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.25rem",
          }}
        >
          New Job / Quote
        </h1>
        <p style={{ opacity: 0.7, marginBottom: "1.4rem", fontSize: "0.9rem" }}>
          Enter the basics for this job. We’ll wire in more fields later.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.25rem",
                opacity: 0.8,
              }}
            >
              Project Name
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid rgba(51, 65, 85, 0.9)",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.9rem",
              }}
              placeholder="Brochure – New Product Line"
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  opacity: 0.8,
                }}
              >
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid rgba(51, 65, 85, 0.9)",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "0.9rem",
                }}
              >
                <option>Waiting for Files</option>
                <option>In Production</option>
                <option>Proof Ready</option>
                <option>On Hold</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  opacity: 0.8,
                }}
              >
                Proof Status
              </label>
              <select
                value={proofStatus}
                onChange={(e) => setProofStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid rgba(51, 65, 85, 0.9)",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: "0.9rem",
                }}
              >
                <option>Not Created</option>
                <option>Needs Your Approval</option>
                <option>Approved</option>
              </select>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.25rem",
                opacity: 0.8,
              }}
            >
              Due Date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid rgba(51, 65, 85, 0.9)",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginTop: "0.35rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                background: "rgba(248, 113, 113, 0.15)",
                border: "1px solid rgba(248, 113, 113, 0.6)",
                fontSize: "0.8rem",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "1.1rem",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              style={{
                flex: 1,
                padding: "0.6rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid rgba(148, 163, 184, 0.6)",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "0.6rem 0.9rem",
                borderRadius: "999px",
                border: "none",
                background:
                  "linear-gradient(to right, #4f46e5 0%, #22c55e 100%)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 16px 40px rgba(79, 70, 229, 0.45)",
              }}
            >
              {loading ? "Creating…" : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
