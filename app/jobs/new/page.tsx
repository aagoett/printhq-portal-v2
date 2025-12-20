"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Size = { w: string; h: string; unit: "in" | "mm" };
type Shipping = {
  deliveryType: "ship" | "pickup";
  recipientName: string;
  company: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};

const FILE_BUCKET = "art-files";

export default function NewJobPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // Core job info (customer-facing)
  const [title, setTitle] = useState("");
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [size, setSize] = useState<Size>({ w: "", h: "", unit: "in" });
  const [paper, setPaper] = useState("");
  const [colors, setColors] = useState("");
  const [finishing, setFinishing] = useState<string[]>([]);
  const [turnaround, setTurnaround] = useState<"standard" | "rush">("standard");
  const [notes, setNotes] = useState("");

  // Upload
  const [files, setFiles] = useState<File[]>([]);

  // Shipping / pickup
  const [shipping, setShipping] = useState<Shipping>({
    deliveryType: "ship",
    recipientName: "",
    company: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  const finishingOptions = useMemo(
    () => [
      "Folding",
      "Cutting / Trimming",
      "Scoring",
      "Laminating",
      "Die-cutting",
      "Drilling",
      "Numbering",
      "Binding (Saddle / Perfect)",
      "Mailing Services",
    ],
    []
  );

  const productOptions = useMemo(
    () => [
      "Business Cards",
      "Postcards",
      "Flyers",
      "Brochures",
      "Booklets",
      "Presentation Folders",
      "Stickers / Labels",
      "Signs / Posters",
      "EDDM / Mailing",
      "Other",
    ],
    []
  );

  const paperOptions = useMemo(
    () => [
      "80# Gloss Text",
      "100# Gloss Cover",
      "100# Dull Cover",
      "100# Uncoated Text",
      "14pt C2S",
      "16pt C2S",
      "Soft Touch Lam (specify stock)",
      "Other (describe below)",
    ],
    []
  );

  function toggleFinishing(v: string) {
    setFinishing((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  function validate(): string | null {
    if (!title.trim()) return "Give this job a name (ex: “Q1 Postcard Mailer”).";
    if (!productType) return "Select a product type.";
    if (!quantity.trim()) return "Enter a quantity.";
    if (files.length === 0) return "Please upload at least one file (PDF preferred).";
    if (shipping.deliveryType === "ship") {
      if (!shipping.recipientName.trim()) return "Shipping: recipient name is required.";
      if (!shipping.address1.trim()) return "Shipping: address is required.";
      if (!shipping.city.trim() || !shipping.state.trim() || !shipping.zip.trim())
        return "Shipping: city/state/zip are required.";
    }
    return null;
  }

  async function uploadToStorage(jobId: string, f: File) {
    // Store under: art-files/<jobId>/<timestamp>_<filename>
    const safeName = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${jobId}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(path, f, { upsert: false });

    if (upErr) throw new Error(upErr.message);

    return { bucket: FILE_BUCKET, path };
  }

  /**
   * Inserts a job file row, but adapts to whichever schema you actually have.
   * Your screenshots show NOT NULL on bucket + path.
   */
  async function insertJobFileRow(args: {
    jobId: string;
    userId: string;
    file: File;
    bucket: string;
    path: string;
  }) {
    const { jobId, userId, file, bucket, path } = args;

    // Attempt #1: schema with bucket/path + file metadata (common in your screenshots)
    const payload1: any = {
      job_id: jobId,
      user_id: userId,
      bucket,
      path,
      file_name: file.name,
      file_type: file.type || null,
      size: file.size || null, // some tables use `size`
    };

    const r1 = await supabase.from("job_files").insert(payload1);
    if (!r1.error) return;

    const msg1 = (r1.error.message || "").toLowerCase();

    // Attempt #2: alternate column names you’ve hit before (file_size, storage_path, etc.)
    // Map to what your table *might* actually be:
    const payload2: any = {
      job_id: jobId,
      user_id: userId,
      bucket,
      path,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size || null,      // some tables use file_size
      storage_path: path,                // some tables use storage_path instead of path
    };

    // If your table does NOT have `path` but does have `storage_path`, remove path.
    if (msg1.includes("could not find the 'path' column")) {
      delete payload2.path;
    }

    // If your table does NOT have `bucket`, but your DB error says it does NOT NULL (yours does),
    // you would *not* delete it. Keeping it here is correct for your current setup.

    const r2 = await supabase.from("job_files").insert(payload2);
    if (!r2.error) return;

    // If both failed, throw the better error message
    throw new Error(r2.error.message || r1.error.message || "Failed to insert job file record.");
  }

  async function handleSubmit() {
    setErr("");
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setLoading(true);
    try {
      // 1) Get logged in user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw new Error(userErr.message);
      if (!user) throw new Error("You’re not logged in.");

      // 2) CUSTOMER LOOKUP (customers.user_id -> customers.id)
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("id, user_id, email, company_name, contact_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (custErr) throw new Error(custErr.message);
      if (!customer?.id) {
        throw new Error(
          "Could not find your customer record (customers.user_id does not match auth user id)."
        );
      }
      const customerId = customer.id;

      // 3) Build a readable details block
      const detailsBlock = [
        `Product: ${productType}`,
        `Qty: ${quantity}`,
        size.w && size.h ? `Size: ${size.w} x ${size.h} ${size.unit}` : null,
        paper ? `Paper: ${paper}` : null,
        colors ? `Colors: ${colors}` : null,
        finishing.length ? `Finishing: ${finishing.join(", ")}` : null,
        `Turnaround: ${turnaround === "rush" ? "Rush" : "Standard"}`,
        shipping.deliveryType === "pickup" ? `Delivery: Pickup` : `Delivery: Ship`,
        shipping.deliveryType === "ship"
          ? `Ship To: ${shipping.recipientName}, ${
              shipping.company ? shipping.company + ", " : ""
            }${shipping.address1}${shipping.address2 ? " " + shipping.address2 : ""}, ${
              shipping.city
            }, ${shipping.state} ${shipping.zip}`
          : null,
        shipping.phone ? `Phone: ${shipping.phone}` : null,
        shipping.notes ? `Shipping Notes: ${shipping.notes}` : null,
        notes ? `Customer Notes: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      // 4) Insert job
      const jobPayload: any = {
        customer_id: customerId,
        project_name: title.trim(),
        status: "Submitted",
        proof_status: "Not Created",
        due_date: null,
        notes: detailsBlock,
      };

      let jobRow: any = null;

      const attempt1 = await supabase.from("jobs").insert(jobPayload).select("*").single();

      if (attempt1.error) {
        const msg = attempt1.error.message || "";

        // Retry without notes if notes column doesn't exist
        if (msg.toLowerCase().includes("could not find the 'notes' column")) {
          const { notes: _n, ...withoutNotes } = jobPayload;
          const attempt2 = await supabase.from("jobs").insert(withoutNotes).select("*").single();
          if (attempt2.error) throw new Error(attempt2.error.message);
          jobRow = attempt2.data;
        } else {
          throw new Error(msg);
        }
      } else {
        jobRow = attempt1.data;
      }

      const jobId = jobRow.id as string;

      // 5) Upload files + insert job_files rows
      for (const f of files) {
        const up = await uploadToStorage(jobId, f);

        await insertJobFileRow({
          jobId,
          userId: user.id,
          file: f,
          bucket: up.bucket,
          path: up.path,
        });
      }

      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 3rem",
        color: "#f9fafb",
        background:
          "radial-gradient(circle at top, #111827 0%, #020617 45%, #000 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>
          Submit a New Print Job
        </h1>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          Tell us what you need, upload your artwork, and we’ll take it from there.
        </p>

        {err ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.9rem 1rem",
              borderRadius: 12,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
            }}
          >
            {err}
          </div>
        ) : null}

        <Section title="Job Details">
          <Field label="Job Name (what should we call this?)" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Ex: “Q1 Postcard Mailer”'
              style={inputStyle}
            />
          </Field>

          <Grid2>
            <Field label="Product Type" required>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select…</option>
                {productOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantity" required>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 5,000"
                style={inputStyle}
              />
            </Field>
          </Grid2>

          <Grid2>
            <Field label="Finished Size (optional)">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={size.w}
                  onChange={(e) => setSize((s) => ({ ...s, w: e.target.value }))}
                  placeholder="W"
                  style={inputStyle}
                />
                <input
                  value={size.h}
                  onChange={(e) => setSize((s) => ({ ...s, h: e.target.value }))}
                  placeholder="H"
                  style={inputStyle}
                />
                <select
                  value={size.unit}
                  onChange={(e) =>
                    setSize((s) => ({ ...s, unit: e.target.value as any }))
                  }
                  style={{ ...inputStyle, width: 110 }}
                >
                  <option value="in">in</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </Field>

            <Field label="Paper / Stock (optional)">
              <select value={paper} onChange={(e) => setPaper(e.target.value)} style={inputStyle}>
                <option value="">Select…</option>
                {paperOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </Grid2>

          <Grid2>
            <Field label="Colors (optional)">
              <input
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="Ex: 4/4 CMYK, 4/1, PMS + CMYK…"
                style={inputStyle}
              />
            </Field>

            <Field label="Turnaround">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Pill
                  active={turnaround === "standard"}
                  onClick={() => setTurnaround("standard")}
                  text="Standard"
                />
                <Pill
                  active={turnaround === "rush"}
                  onClick={() => setTurnaround("rush")}
                  text="Rush (we’ll confirm feasibility)"
                />
              </div>
            </Field>
          </Grid2>

          <Field label="Finishing (optional)">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {finishingOptions.map((f) => (
                <Pill
                  key={f}
                  active={finishing.includes(f)}
                  onClick={() => toggleFinishing(f)}
                  text={f}
                />
              ))}
            </div>
          </Field>

          <Field label="Notes / Instructions (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know? Folding style, mailing list, panel sizes, special packing, etc."
              style={{ ...inputStyle, minHeight: 110 }}
            />
          </Field>
        </Section>

        <Section title="Upload Artwork">
          <p style={{ opacity: 0.8, marginTop: 0 }}>
            Preferred: PDF. Also accepted: AI, PSD, INDD (packaged), JPG/PNG.
          </p>

          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            style={{ marginTop: 8 }}
          />

          {files.length ? (
            <div style={{ marginTop: 12, opacity: 0.9 }}>
              <b>Selected files:</b>
              <ul>
                {files.map((f) => (
                  <li key={f.name}>
                    {f.name} ({Math.round(f.size / 1024)} KB)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>

        <Section title="Delivery">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <Pill
              active={shipping.deliveryType === "ship"}
              onClick={() => setShipping((s) => ({ ...s, deliveryType: "ship" }))}
              text="Ship it to me"
            />
            <Pill
              active={shipping.deliveryType === "pickup"}
              onClick={() => setShipping((s) => ({ ...s, deliveryType: "pickup" }))}
              text="I will pick up"
            />
          </div>

          {shipping.deliveryType === "ship" ? (
            <>
              <Grid2>
                <Field label="Recipient Name" required>
                  <input
                    value={shipping.recipientName}
                    onChange={(e) => setShipping((s) => ({ ...s, recipientName: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Company (optional)">
                  <input
                    value={shipping.company}
                    onChange={(e) => setShipping((s) => ({ ...s, company: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
              </Grid2>

              <Grid2>
                <Field label="Phone (optional)">
                  <input
                    value={shipping.phone}
                    onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <div />
              </Grid2>

              <Field label="Address" required>
                <input
                  value={shipping.address1}
                  onChange={(e) => setShipping((s) => ({ ...s, address1: e.target.value }))}
                  placeholder="Address line 1"
                  style={inputStyle}
                />
                <div style={{ height: 8 }} />
                <input
                  value={shipping.address2}
                  onChange={(e) => setShipping((s) => ({ ...s, address2: e.target.value }))}
                  placeholder="Address line 2 (optional)"
                  style={inputStyle}
                />
              </Field>

              <Grid3>
                <Field label="City" required>
                  <input
                    value={shipping.city}
                    onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="State" required>
                  <input
                    value={shipping.state}
                    onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="ZIP" required>
                  <input
                    value={shipping.zip}
                    onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
              </Grid3>

              <Field label="Shipping notes (optional)">
                <input
                  value={shipping.notes}
                  onChange={(e) => setShipping((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Liftgate, call before delivery, inside delivery, etc."
                  style={inputStyle}
                />
              </Field>
            </>
          ) : (
            <p style={{ opacity: 0.85 }}>
              Great — we’ll confirm pickup details after you submit.
            </p>
          )}
        </Section>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(to right, #4f46e5 0%, #22c55e 100%)",
              color: "#f9fafb",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px rgba(79, 70, 229, 0.35)",
              minWidth: 220,
            }}
          >
            {loading ? "Submitting…" : "Submit Job"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: 14,
              border: "1px solid rgba(148, 163, 184, 0.45)",
              background: "transparent",
              color: "#f9fafb",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>

        <div style={{ marginTop: 18, opacity: 0.7, fontSize: 13 }}>
          After you submit, our team will review your files and confirm pricing + schedule.
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginTop: "1.25rem",
        padding: "1.25rem",
        borderRadius: 18,
        background: "rgba(2, 6, 23, 0.65)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "1.15rem" }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 6, fontWeight: 700, opacity: 0.9 }}>
        {label} {required ? <span style={{ color: "#fca5a5" }}>*</span> : null}
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function Grid3({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  active,
  text,
  onClick,
}: {
  active: boolean;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.5rem 0.75rem",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(34,197,94,0.9)"
          : "1px solid rgba(148,163,184,0.35)",
        background: active ? "rgba(34,197,94,0.12)" : "transparent",
        color: "#f9fafb",
        cursor: "pointer",
        fontWeight: 700,
        opacity: active ? 1 : 0.9,
      }}
    >
      {text}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.75rem",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.3)",
  background: "rgba(15, 23, 42, 0.6)",
  color: "#f9fafb",
  outline: "none",
};
