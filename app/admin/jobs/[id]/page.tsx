"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase"; 

export default function AdminJobDetails() {
  const { id } = useParams();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    fetchJobData();
  }, [id]);

  async function fetchJobData() {
    if (!id) return;
    try {
      const { data: jobData, error } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (error) throw error;
      setJob(jobData);

      const { data: fileData } = await supabase.from("job_files").select("*").eq("job_id", id);
      setFiles(fileData || []);

      const { data: msgData } = await supabase.from("messages").select("*").eq("job_id", id).order("created_at", { ascending: true });
      setMessages(msgData || []);
    } catch (err) { console.error("Error:", err); } 
    finally { setLoading(false); }
  }

  async function updateStatus(newStatus: string) {
    setJob({ ...job, status: newStatus });
    await supabase.from("jobs").update({ status: newStatus }).eq("id", id);
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingProof(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `proof-${Date.now()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('job-files').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('job-files').getPublicUrl(filePath);

      await supabase.from('jobs').update({ proof_url: publicUrl, proof_status: 'Needs Approval', status: 'Proofing' }).eq('id', id);
      
      await supabase.from("messages").insert({
        job_id: id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        sender_name: "System",
        content: `A new proof has been uploaded: ${file.name}. Status changed to Proofing.`
      });

      alert("Proof uploaded successfully!");
      fetchJobData();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Error uploading proof.");
    } finally { setUploadingProof(false); }
  }

  async function sendMessage() {
    if (!msgInput.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("messages").insert({
      job_id: id,
      user_id: user.id,
      sender_name: "PrintHQ Admin",
      content: msgInput.trim(),
    });
    setMsgInput("");
    fetchJobData();
  }

  if (loading) return <div style={{ padding: "2rem", color: "#fff" }}>Loading...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          {/* NAVIGATION BUTTONS */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>← Back</button>
            
            {/* NEW TICKET BUTTON */}
            <a 
              href={`/admin/jobs/${id}/ticket`} 
              target="_blank" 
              style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span>🖨️</span> Print Job Ticket
            </a>
          </div>

          <h1 style={{ fontSize: "2rem", margin: 0 }}>{job.project_name}</h1>
          <div style={{ opacity: 0.6, fontFamily: "monospace", marginTop: "0.25rem" }}>{job.job_code || job.id}</div>
        </div>
        
        {/* Status Dropdown */}
        <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "8px", border: "1px solid #334155" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.5rem" }}>CURRENT STATUS</label>
          <select 
            value={job.status} 
            onChange={(e) => updateStatus(e.target.value)}
            style={{ background: "#0f172a", color: "#fff", padding: "0.5rem", borderRadius: "6px", border: "1px solid #475569", fontSize: "0.9rem", minWidth: "200px" }}
          >
            <optgroup label="Intake" style={{ color: "#94a3b8" }}><option value="Waiting for Files" style={{ color: "#fff" }}>Waiting for Files</option><option value="Submitted" style={{ color: "#fff" }}>Submitted</option></optgroup>
            <optgroup label="Pre-Production" style={{ color: "#94a3b8" }}><option value="Proofing" style={{ color: "#fff" }}>Proofing</option><option value="Production Ready" style={{ color: "#fff" }}>Production Ready</option></optgroup>
            <optgroup label="Manufacturing" style={{ color: "#94a3b8" }}><option value="In Production" style={{ color: "#fff" }}>In Production</option><option value="Bindery" style={{ color: "#fff" }}>Bindery</option></optgroup>
            <optgroup label="Fulfillment" style={{ color: "#94a3b8" }}><option value="Shipping" style={{ color: "#fff" }}>Shipping</option><option value="Completed" style={{ color: "#fff" }}>Completed</option></optgroup>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        {/* Left Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* PROOFING CARD */}
          <Section title="Proof Management">
            {job.proof_url ? (
              <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>Active Proof Uploaded</span>
                  <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>Status: {job.proof_status}</span>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <a href={job.proof_url} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "underline" }}>View Current Proof</a>
                  <button onClick={() => { if(confirm("Replace proof?")) setJob({...job, proof_url: null}) }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.9rem" }}>Replace</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem", border: "2px dashed #475569", borderRadius: "8px" }}>
                <p style={{ marginBottom: "1rem", opacity: 0.7 }}>No proof active.</p>
                <input type="file" accept="application/pdf,image/*" onChange={handleProofUpload} disabled={uploadingProof} style={{ color: "#fff" }} />
              </div>
            )}
          </Section>

          <Section title="Order Specifications">
             <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", opacity: 0.9, lineHeight: "1.6" }}>{job.notes || "No notes provided."}</pre>
          </Section>

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
        <Section title="Communication">
          <div style={{ height: "400px", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
               {messages.map(m => {
                 const isAdmin = m.sender_name === "PrintHQ Admin" || m.sender_name === "System";
                 return (
                   <div key={m.id} style={{ alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                     <div style={{ fontSize: "0.75rem", marginBottom: "0.2rem", color: isAdmin ? "#94a3b8" : "#38bdf8", textAlign: isAdmin ? "right" : "left" }}>{m.sender_name}</div>
                     <div style={{ background: isAdmin ? "#3b82f6" : "#334155", padding: "0.6rem 0.8rem", borderRadius: "8px", fontSize: "0.9rem" }}>{m.content}</div>
                   </div>
                 )
               })}
            </div>
            <textarea value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder="Reply..." style={{ background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "0.5rem", borderRadius: "6px", height: "80px", marginBottom: "0.5rem" }} />
            <button onClick={sendMessage} style={{ background: "#10b981", color: "#fff", border: "none", padding: "0.6rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>Send Reply</button>
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
