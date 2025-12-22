"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; 

export default function JobDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Messaging & Interactions
  const [msgInput, setMsgInput] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    async function fetchAllData() {
      if (!id) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        const { data: jobData, error: jobErr } = await supabase.from("jobs").select("*").eq("id", id).single();
        if (jobErr) throw jobErr;
        setJob(jobData);

        const { data: fileData } = await supabase.from("job_files").select("*").eq("job_id", id);
        setFiles(fileData || []);

        const { data: msgData } = await supabase.from("messages").select("*").eq("job_id", id).order("created_at", { ascending: true });
        setMessages(msgData || []);

      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchAllData();
  }, [id]);

  async function sendMessage(text: string, senderOverride?: string) {
    if (!text.trim() || !currentUser || !job) return;
    try {
      await supabase.from("messages").insert({
        job_id: job.id,
        user_id: currentUser.id,
        sender_name: senderOverride || "You",
        content: text.trim(),
      });
      // Refresh messages
      const { data: freshMsgs } = await supabase.from("messages").select("*").eq("job_id", id).order("created_at", { ascending: true });
      setMessages(freshMsgs || []);
    } catch (err) { console.error(err); }
  }

  async function handleApproval(approved: boolean) {
    if (approved) {
      if(!confirm("Are you sure you want to approve this proof for production?")) return;
      
      // Update Job
      await supabase.from("jobs").update({ proof_status: "Approved", status: "Production Ready" }).eq("id", id);
      setJob({ ...job, proof_status: "Approved", status: "Production Ready" });
      
      // Auto-Message
      sendMessage("✅ I have approved the proof. Please proceed to production!", "System");

    } else {
      // Rejection
      if(!rejectReason.trim()) return alert("Please enter a reason for the changes.");
      
      await supabase.from("jobs").update({ proof_status: "Rejected" }).eq("id", id);
      setJob({ ...job, proof_status: "Rejected" });
      
      // Auto-Message
      sendMessage(`❌ Proof Rejected. Changes requested: ${rejectReason}`, "System");
      setRejectMode(false);
    }
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#020617", color: "#fff", padding: "3rem" }}>Loading...</div>;
  if (!job) return <div>Job not found.</div>;

  return (
    <main style={{ minHeight: "100vh", padding: "2rem 3rem", color: "#f9fafb", background: "radial-gradient(circle at top, #111827 0%, #020617 45%, #000 100%)", fontFamily: "system-ui, sans-serif" }}>
      <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", marginBottom: "1rem" }}>← Back to Dashboard</button>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", margin: 0 }}>{job.project_name}</h1>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <StatusBadge status={job.status} />
            {job.proof_status && <span style={{ opacity: 0.7, fontSize: "0.85rem", border: "1px solid #475569", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>Proof: {job.proof_status}</span>}
          </div>
        </div>
      </header>

      {/* --- PROOF ACTION AREA --- */}
      {job.proof_status === "Needs Approval" && job.proof_url && (
        <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid #3b82f6", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#60a5fa" }}>⚡ Proof Ready for Review</h3>
            <p style={{ margin: 0, opacity: 0.8, maxWidth: "500px" }}>Please review the proof below carefully. Check spelling, layout, and dates. Once approved, we will go straight to print.</p>
            <a href={job.proof_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "1rem", color: "#fff", textDecoration: "underline" }}>View PDF Proof</a>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "200px" }}>
            {!rejectMode ? (
              <>
                <button onClick={() => handleApproval(true)} style={{ padding: "0.8rem", background: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>Approve Proof</button>
                <button onClick={() => setRejectMode(true)} style={{ padding: "0.8rem", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>Reject / Changes</button>
              </>
            ) : (
              <div style={{ background: "#000", padding: "1rem", borderRadius: "8px", border: "1px solid #333" }}>
                <textarea 
                  autoFocus
                  placeholder="What needs to be changed?" 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: "100%", height: "80px", marginBottom: "0.5rem", padding: "0.5rem" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => handleApproval(false)} style={{ flex: 1, padding: "0.5rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Send Rejection</button>
                  <button onClick={() => setRejectMode(false)} style={{ padding: "0.5rem", background: "none", color: "#aaa", border: "none", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        {/* Specs & Files */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <Section title="Job Specifications">
            <pre style={{ fontFamily: "inherit", opacity: 0.8, whiteSpace: "pre-wrap" }}>{job.notes || "No details."}</pre>
          </Section>

          <Section title={`Files (${files.length})`}>
             <ul style={{ listStyle: "none", padding: 0 }}>{files.map(f => (
               <li key={f.id} style={{ padding: "0.75rem", marginBottom: "0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                 <span>{f.file_name}</span>
                 <button style={{ color: "#fff", fontSize: "0.8rem", cursor: "pointer", background: "none", border: "1px solid #555", padding: "2px 8px", borderRadius: "4px" }}>Download</button>
               </li>
             ))}</ul>
          </Section>
        </div>

        {/* Messaging */}
        <div>
          <Section title="Messages & Activity">
            <div style={{ height: "400px", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem" }}>
                {messages.map((m) => {
                  const isMe = m.user_id === currentUser?.id;
                  const isSystem = m.sender_name === "System";
                  return (
                    <div key={m.id} style={{ marginBottom: "1rem", opacity: 0.9, textAlign: isMe ? "right" : "left" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.2rem", color: isSystem ? "#fbbf24" : (isMe ? "#fff" : "#4ade80") }}>
                        {isMe ? "You" : m.sender_name}
                      </div>
                      <div style={{ background: isSystem ? "rgba(251, 191, 36, 0.1)" : (isMe ? "rgba(79, 70, 229, 0.4)" : "rgba(255,255,255,0.05)"), padding: "0.6rem 0.8rem", borderRadius: "8px", fontSize: "0.9rem", display: "inline-block" }}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <textarea value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder="Type a message..." style={{ width: "100%", height: "80px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "0.75rem", color: "#fff", marginBottom: "0.5rem" }} />
              <button onClick={() => { sendMessage(msgInput); setMsgInput(""); }} style={{ width: "100%", padding: "0.6rem", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Send Message</button>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section style={{ background: "rgba(2, 6, 23, 0.65)", border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: "18px", padding: "1.5rem" }}>
      <h2 style={{ marginTop: 0, marginBottom: "1.25rem", fontSize: "1.1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>{title}</h2>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = "#94a3b8"; 
  if (status === "Submitted") color = "#38bdf8"; 
  if (status === "Waiting for Files") color = "#fbbf24";
  if (status === "In Production") color = "#a3e635";
  return <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700, color, border: `1px solid ${color}40` }}>{status}</span>;
}
