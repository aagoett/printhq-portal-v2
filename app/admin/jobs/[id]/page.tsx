"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase"; 

export default function JobTicket() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      // Fetch Job & Files
      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", id).single();
      const { data: fileData } = await supabase.from("job_files").select("*").eq("job_id", id);
      
      setJob(jobData);
      setFiles(fileData || []);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) return <div>Loading Ticket...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div style={{ 
      background: "#fff", 
      color: "#000", 
      minHeight: "100vh", 
      padding: "40px", 
      fontFamily: "Arial, sans-serif" 
    }}>
      {/* Print Button (Hidden on paper) */}
      <div className="no-print" style={{ marginBottom: "20px", borderBottom: "1px dashed #ccc", paddingBottom: "20px" }}>
        <button 
          onClick={() => window.print()}
          style={{ padding: "10px 20px", fontSize: "16px", background: "#000", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" }}
        >
          🖨️ Print This Ticket
        </button>
        <style jsx global>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white; margin: 0; }
            @page { margin: 0.5cm; }
          }
        `}</style>
      </div>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "42px", fontWeight: "900", margin: "0 0 10px 0", textTransform: "uppercase" }}>Job Ticket</h1>
          <div style={{ fontSize: "18px" }}>PrintHQ Production</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "14px", color: "#666" }}>JOB ID</div>
          <div style={{ fontSize: "24px", fontFamily: "monospace", fontWeight: "bold" }}>{job.job_code || job.id.slice(0,8).toUpperCase()}</div>
          <div style={{ marginTop: "10px", padding: "5px 10px", border: "2px solid #000", fontWeight: "bold", display: "inline-block" }}>
            DUE: {job.due_date ? new Date(job.due_date).toLocaleDateString() : "ASAP"}
          </div>
        </div>
      </div>

      {/* PROJECT INFO */}
      <div style={{ border: "4px solid #000", padding: "20px", marginBottom: "30px" }}>
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#666", textTransform: "uppercase", marginBottom: "5px" }}>Project Name</div>
        <div style={{ fontSize: "32px", fontWeight: "bold", lineHeight: "1.1" }}>{job.project_name}</div>
      </div>

      {/* SPECS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "40px" }}>
        <div>
          <h3 style={{ borderBottom: "2px solid #000", paddingBottom: "5px", marginTop: 0 }}>Specifications</h3>
          <pre style={{ 
            fontFamily: "Arial, sans-serif", 
            fontSize: "16px", 
            lineHeight: "1.6", 
            whiteSpace: "pre-wrap",
            background: "#f5f5f5",
            padding: "15px",
            border: "1px solid #ddd"
          }}>
            {job.notes || "No specific notes provided."}
          </pre>
        </div>

        <div>
           <h3 style={{ borderBottom: "2px solid #000", paddingBottom: "5px", marginTop: 0 }}>Status & Routing</h3>
           <div style={{ marginBottom: "20px" }}>
             <div style={{ fontWeight: "bold" }}>Current Status:</div>
             <div style={{ fontSize: "20px" }}>{job.status}</div>
           </div>
           
           <h3 style={{ borderBottom: "2px solid #000", paddingBottom: "5px", marginTop: 0 }}>Files ({files.length})</h3>
           {files.length === 0 ? "No files" : (
             <ul style={{ paddingLeft: "20px", margin: 0 }}>
               {files.map(f => (
                 <li key={f.id} style={{ marginBottom: "5px", fontWeight: "bold" }}>{f.file_name}</li>
               ))}
             </ul>
           )}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: "2px solid #000", paddingTop: "20px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666" }}>
        <div>Printed: {new Date().toLocaleString()}</div>
        <div>Operator Initials: ___________</div>
      </div>
    </div>
  );
}
