"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UploadFilesButton({ jobId }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage("");

    try {
      const uploadsToInsert = [];

      for (const file of files) {
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `job-${jobId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("art-files")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error", uploadError);
          throw uploadError;
        }

        uploadsToInsert.push({
          job_id: jobId,
          bucket: "art-files",
          path,
          file_name: file.name,
          file_type: file.type,
          size: file.size,
          // uploaded_by: will be filled automatically later once we tie in auth
        });
      }

      if (uploadsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("files")
          .insert(uploadsToInsert);

        if (insertError) {
          console.error("DB insert error", insertError);
          throw insertError;
        }
      }

      setMessage(
        `Uploaded ${files.length} file${files.length > 1 ? "s" : ""} for ${jobId}`
      );
    } catch (err) {
      console.error(err);
      setMessage("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // reset the input so selecting the same file again triggers onChange
      event.target.value = "";
      setTimeout(() => setMessage(""), 4000);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.15rem",
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        style={{
          padding: "0.25rem 0.75rem",
          borderRadius: "999px",
          border: "1px solid rgba(148, 163, 184, 0.6)",
          background:
            "linear-gradient(to right, rgba(148,163,184,0.15), rgba(37,99,235,0.35))",
          color: "#e5e7eb",
          fontSize: "0.8rem",
          cursor: uploading ? "default" : "pointer",
          opacity: uploading ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {uploading ? "Uploading…" : "Upload Files"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFilesSelected}
        style={{ display: "none" }}
      />

      {message && (
        <span
          style={{
            fontSize: "0.7rem",
            color: "#9ca3af",
            maxWidth: "10rem",
            textAlign: "right",
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}
