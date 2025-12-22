"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; // Adjust path if needed

export default function JobDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Messaging State
  const [msgInput, setMsgInput] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function fetchAllData() {
      if (!id) return;

      try {
        // 0. Get Current User (so we know who is sending messages)
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // 1. Fetch Job Data
        const { data: jobData, error: jobErr } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .single();

        if (jobErr) throw jobErr;
        setJob(jobData);

        // 2. Fetch Associated Files
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
          .order("created_at", { ascending: true }); // Oldest first

        setMessages(msgData || []);

      } catch (err) {
        console.error("Error loading job:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, [id]);

  // Function to send a message
  async function sendMessage() {
    if (!msgInput.trim() || !currentUser || !job) return;

    try {
      const newMsg = {
        job_id: job.id,
        user_id: currentUser.id,
        sender_name: "You", // You can customize this later to pull from profile
        content: msgInput.trim(),
      };

      // Insert into DB
      const { error } = await supabase.from("messages").insert(newMsg);
      if (error) throw error;

      // Clear input
      setMsgInput("");

      // Refresh messages list
      const { data: freshMsgs } = await supabase
        .from("messages")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: true });
        
      setMessages(freshMsgs || []);

    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message.");
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020617", color: "#fff", padding: "3rem" }}>
        Loading job details...
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ minHeight: "100vh", background: "#020617", color: "#fff", padding: "3rem" }}>
        Job not found. <button onClick={() => router.push("/dashboard")}>Go Back</button>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 3rem",
        color: "#f9fafb",
        background: "radial-gradient(circle at top, #111827 0%, #020617 45%, #000 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Navigation */}
      <button
        onClick={() => router.push("/dashboard")}
        style={{
          background: "transparent",
          border: "none",
          color: "#94a3b8",
          cursor: "pointer",
          marginBottom: "1rem",
          fontSize: "0.9rem",
        }}
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
            <h1 style={{ fontSize: "2rem", margin: 0 }}>{job.project_name}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p style={{ opacity: 0.6, margin: 0 }}>Job ID: {job.job_code || job.id}</p>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          {job.proof_status === "Needs Approval" && (
             <button style={actionBtnStyle}>Review Proof</button>
          )}
          <button style={{ ...actionBtnStyle, background: "rgba(255,255,255,0.1)" }}>Upload New Files</button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        
        {/* LEFT COLUMN: Specs & Files */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Job Specs */}
          <Section title="Job Specifications">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.95rem" }}>
              <SpecRow label="Status" value={job.status} />
              <SpecRow label="Proof Status" value={job.proof_status || "Not started"} />
              <SpecRow label="Due Date" value={job.due_date ? new Date(job.due_date).toLocaleDateString() : "TBD"} />
              <SpecRow label="Created" value={new Date(job.created_at).toLocaleDateString()} />
            </div>
            <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
               <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Order Details</h3>
               <pre style={{ 
                 fontFamily: "inherit", 
                 opacity: 0.8, 
                 whiteSpace: "pre-wrap", 
                 lineHeight: "1.6" 
               }}>
                 {job.notes || "No details provided."}
               </pre>
            </div>
          </Section>

          {/* Files */}
          <Section title={`Files (${files.length})`}>
             {files.length === 0 ? (
               <div style={{ opacity: 0.6 }}>No files uploaded.</div>
             ) : (
               <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                 {files.map((f) => (
                   <li key={f.id} style={{ 
                     padding: "0.75rem", 
                     marginBottom: "0.5rem", 
                     background: "rgba(255,255,255,0.03)", 
                     borderRadius: "8px",
                     display: "flex",
                     justifyContent: "space-between",
                     alignItems: "center"
                   }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                       <span style={{ fontSize: "1.2rem" }}>📄</span>
                       <div>
                         <div style={{ fontWeight: 600 }}>{f.file_name}</div>
                         <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                           {f.file_size ? `${Math.round(f.file_size / 1024)} KB` : "Unknown size"}
                         </div>
                       </div>
                     </div>
                     <button style={{ 
                       padding: "0.4rem 0.8rem", 
                       borderRadius: "6px", 
                       border: "1px solid rgba(255,255,255,0.2)",
                       background: "transparent",
                       color: "#fff",
                       fontSize: "0.8rem",
                       cursor: "pointer"
                     }}>
                       Download
                     </button>
                   </li>
                 ))}
               </ul>
             )}
          </Section>
        </div>

        {/* RIGHT COLUMN: Messaging / Activity */}
        <div>
          <Section title="Messages & Activity">
            <div style={{ 
              height: "400px", 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "space-between" 
            }}>
              
              {/* Message List */}
              <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem", paddingRight: "0.5rem" }}>
                {messages.length === 0 ? (
                  <div style={{ opacity: 0.5, fontStyle: "italic", fontSize: "0.9rem" }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.user_id === currentUser?.id;
                    return (
                      <div key={m.id} style={{ marginBottom: "1rem", opacity: 0.9, textAlign: isMe ? "right" : "left" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.2rem", color: isMe ? "#fff" : "#4ade80" }}>
                          {isMe ? "You" : m.sender_name}
                          <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: "0.5rem" }}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ 
                          background: isMe ? "rgba(79, 70, 229, 0.4)" : "rgba(255,255,255,0.05)", 
                          padding: "0.6rem 0.8rem", 
                          borderRadius: "8px", 
                          fontSize: "0.9rem",
                          display: "inline-block",
                          maxWidth: "85%"
                        }}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Area */}
              <div>
                <textarea 
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  placeholder="Type a message to the team..."
                  style={{
                    width: "100%",
                    height: "80px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    color: "#fff",
                    marginBottom: "0.5rem",
                    resize: "none"
                  }}
                />
                <button 
                  onClick={sendMessage}
                  disabled={!msgInput.trim()}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    background: msgInput.trim() ? "#4f46e5" : "rgba(79, 70, 229, 0.5)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: msgInput.trim() ? "pointer" : "not-allowed"
                  }} 
                >
                  Send Message
                </button>
              </div>
            </div>
          </Section>
        </div>

      </div>
    </main>
  );
}

// --- Components ---

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section style={{
      background: "rgba(2, 6, 23, 0.65)",
      border: "1px solid rgba(148, 163, 184, 0.2)",
      borderRadius: "18px",
      padding: "1.5rem",
      boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    }}>
      <h2 style={{ marginTop: 0, marginBottom: "1.25rem", fontSize: "1.1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SpecRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div style={{ opacity: 0.6, fontSize: "0.8rem", marginBottom: "0.2rem" }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = "#94a3b8"; // gray
  let bg = "rgba(148, 163, 184, 0.1)";

  if (status === "Submitted") { color = "#38bdf8"; bg = "rgba(56, 189, 248, 0.15)"; } // blue
  if (status === "Waiting for Files") { color = "#fbbf24"; bg = "rgba(251, 191, 36, 0.15)"; } // yellow
  if (status === "In Production") { color = "#a3e635"; bg = "rgba(163, 230, 53, 0.15)"; } // lime
  
  return (
    <span style={{
      padding: "0.25rem 0.75rem",
      borderRadius: "999px",
      fontSize: "0.8rem",
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${color}40`
    }}>
      {status}
    </span>
  );
}

const actionBtnStyle = {
  padding: "0.6rem 1.2rem",
  borderRadius: "8px",
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9rem"
};
