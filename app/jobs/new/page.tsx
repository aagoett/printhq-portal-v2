"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

    if (!title || !productType || !quantity) {
      setError("Please complete required fields.");
      return;
    }
    if (!files.length) {
      setError("Please upload at least one file.");
      return;
    }

    setLoading(true);

    try {
      /* 1️⃣ Get logged-in user */
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("Not logged in");

      /* 2️⃣ Get customer by user_id (single source of truth) */
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", auth.user.id)
        .single();

      if (custErr || !customer) {
        throw new Error("Customer record not found.");
      }

      /* 3️⃣ Create job */
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          customer_id: customer.id,
          project_name: title,
          notes: `Product: ${productType}\nQuantity: ${quantity}\n\n${notes}`,
          status: "Submitted",
        })
        .select()
        .single();

      if (jobErr) throw jobErr;

      /* 4️⃣ Upload files */
      for (const file of files) {
        const path = `${job.id}/${Date.now()}_${file.name}`;

        const { error: uploadErr } = await supabase.storage
          .from("art-files")
          .upload(path, file);

        if (uploadErr) throw uploadErr;

        const { error: fileErr } = await supabase.from("job_files").insert({
          job_id: job.id,
          file_name: file.name,
          storage_path: path,
        });

        if (fileErr) throw fileErr;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "3rem", color: "#fff" }}>
      <h1>Submit a New Print Job</h1>

      {error && <p style={{ color: "salmon" }}>{error}</p>}

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
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <button disabled={loading} onClick={handleSubmit}>
        {loading ? "Submitting..." : "Submit Job"}
      </button>
    </main>
  );
}
