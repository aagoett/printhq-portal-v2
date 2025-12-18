"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function handleSubmit() {
    setError("");

    if (!title.trim() || !productType.trim() || !quantity.trim()) {
      setError("Please complete required fields.");
      return;
    }
    if (!files.length) {
      setError("Please upload at least one file.");
      return;
    }

    setLoading(true);

    try {
      // 1) Logged-in user
      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw new Error(authErr.message);
      const user = authRes?.user;
      if (!user) throw new Error("Not logged in.");

      // 2) Customer lookup: customers.user_id === auth.users.id
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (custErr) throw new Error(custErr.message);
      if (!customer) throw new Error("Customer record not found.");

      // 3) Insert job (ONLY columns that exist)
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          customer_id: customer.id,
          project_name: title.trim(),
          notes: `Product: ${productType}\nQuantity: ${quantity}\n\n${notes || ""}`,
          status: "Submitted",
        })
        .select("id")
        .single();

      if (jobErr) throw new Error(jobErr.message);
      if (!job?.id) throw new Error("Job insert succeeded but no id returned.");

      // 4) Upload files + create job_files records (ONLY columns that exist)
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${job.id}/${Date.now()}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("art-files")
          .upload(path, file, { upsert: false });

        if (uploadErr) throw new Error(uploadErr.message);

        const { error: jfErr } = await supabase.from("job_files").insert({
          job_id: job.id,
          file_name: file.name,
          storage_path: path,
        });

        if (jfErr) throw new Error(jfErr.message);
      }

      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "3rem", color: "#fff" }}>
      <h1>Submit a New Print Job</h1>

      {error ? <p style={{ color: "salmon" }}>{error}</p> : null}

      <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
        <input
          placeholder="Job name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Product type"
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
        />

        <input
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
        />

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        <button disabled={loading} onClick={handleSubmit}>
          {loading ? "Submitting..." : "Submit Job"}
        </button>
      </div>
    </main>
  );
}
