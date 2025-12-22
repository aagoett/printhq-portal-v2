"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase"; // Check path length!

export default function AdminJobDetails() {
  const { id } = useParams();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState("");

  useEffect(() => {
    fetchJobData();
  }, [id]);

  async function fetchJobData() {
    if (!id) return;
    try {
      // 1. Fetch Job
      const { data: jobData, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      setJob(jobData);

      // 2. Fetch Files
      const { data: fileData } = await supabase
        .from("job_files")
        .select("*")
        .eq("job_id", id);
      setFiles(fileData || []);

      // 3. Fetch Messages
      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: true });
      setMessages(msgData || []);

    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    // Optimistic update (update UI immediately)
    setJob({ ...job, status: newStatus });

    const { error } = await supabase
      .from("jobs")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) alert("Failed to update status");
  }

  async function sendMessage() {
    if (!msgInput.trim()) return;
    
    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newMsg = {
      job_id: id,
      user_id: user.id,
      sender_name: "PrintHQ Admin", // You appear as Admin
      content: msgInput.trim(),
    };

    const { error } = await supabase.from("messages").insert(newMsg);
    if (!error) {
      setMsgInput("");
      fetchJobData(); // Refresh list
    }
  }

  if (loading) return <div style={{ padding: "2rem", color: "#fff" }}>Loading Mission Control...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", marginBottom: "0.5rem" }}>← Back</button>
          <h1 style={{ fontSize: "2rem", margin: 0 }}>{job.project_name}</h1>
          <div style={{ opacity: 0.6, fontFamily: "monospace", marginTop: "0.25rem" }}>{job.job_code || job.id}</div>
        </div>

        <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "8px", border: "1px solid #334155" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.5rem" }}>
            CURRENT STATUS
          </label>
          <select 
            value={job.status} 
            onChange={(e) => updateStatus(e.target.value)}
            style={{ 
              background: "#0f172a", 
              color: "#fff", 
              padding: "0.5rem", 
              borderRadius: "6px", 
              border: "1px solid #475569",
              fontSize: "0.9rem",
              minWidth: "160px"
            }}
          >
            <option value="Submitted">Submitted</option>
            <option value="Waiting for Files">Waiting for Files</option>
            <option value="Proofing">Proofing</option>
            <option value="In Production">In Production</option>
            <option value="Shipped">Shipped</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        
        {/* Left Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Job Details Card */}
          <Section title="Order Specifications">
             <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", opacity: 0.9, lineHeight: "1.6" }}>
               {job.notes || "No notes provided."}
             </pre>
          </Section>

          {/* Files Card */}
          <Section title={`Production Files (${files.length})`}>
            {files.length === 0 ? <div style={{ opacity: 0.5 }}>No files.</div> : (
              files.map(f => (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", background: "rgba(255,255,255,0.05)", marginBottom: "0.5rem", borderRadius: "6px" }}>
                  <span>{f.file_name}</span>
                  <button style={{ color: "#38bdf8", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Download</button>
                </div>
              ))
            )}
          </Section>

        </div>

        {/* Right Col: Chat */}
        <Section title="Customer Communication">
          <div style={{ height: "400px", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
               {messages.map(m => {
                 const isAdmin = m.sender_name.includes("Admin");
                 return (
                   <div key={m.id} style={{ alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                     <div style={{ fontSize: "0.75rem", marginBottom: "0.2rem", color: isAdmin ? "#94a3b8" : "#38bdf8", textAlign: isAdmin ? "right" : "left" }}>
                       {m.sender_name}
                     </div>
                     <div style={{ 
                       background: isAdmin ? "#3b82f6" : "#334155", 
                       padding: "0.6rem 0.8rem", 
                       borderRadius: "8px",
                       fontSize: "0.9rem"
                     }}>
                       {m.content}
                     </div>
                   </div>
                 )
               })}
            </div>
            
            <textarea 
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              placeholder="Reply to customer..."
              style={{ background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "0.5rem", borderRadius: "6px", height: "80px", marginBottom: "0.5rem" }}
            />
            <button 
              onClick={sendMessage}
              style={{ background: "#10b981", color: "#fff", border: "none", padding: "0.6rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
            >
              Send Reply
            </button>
          </div>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.5rem" }}>
      <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8" }}>{title}</h3>
      {children}
    </div>
  );
}
