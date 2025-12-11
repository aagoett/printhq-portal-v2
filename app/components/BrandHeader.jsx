"use client";

import { useBranding } from "@/lib/branding";

export default function BrandHeader() {
  const brand = useBranding();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={`${brand.name} logo`}
            style={{
              height: "36px",
              width: "auto",
              borderRadius: "0.5rem",
              objectFit: "contain",
              background: "rgba(15,23,42,0.7)",
              padding: "0.25rem 0.4rem",
            }}
          />
        ) : (
          <div
            style={{
              height: "36px",
              width: "36px",
              borderRadius: "0.75rem",
              background:
                "linear-gradient(135deg, #4f46e5 0%, #22c55e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            P
          </div>
        )}

        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            {brand.name} Portal
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
            Powered by PrintHQ
          </div>
        </div>
      </div>
    </header>
  );
}
