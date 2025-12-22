"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: "260px", borderRight: "1px solid rgba(255,255,255,0.1)", padding: "2rem", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "2rem", color: "#38bdf8" }}>
          PrintHQ <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>OPS</span>
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <NavLink href="/admin" label="Command Center" />
          <div style={{ height: "1rem" }} />
          <SectionLabel label="DEPARTMENTS" />
          <NavLink href="/admin/csr" label="CSR / Orders" />
          <NavLink href="/admin/prepress" label="Prepress Queue" />
          <NavLink href="/admin/production" label="Production / Press" />
          <NavLink href="/admin/bindery" label="Bindery & Shipping" />
          
          <div style={{ height: "1rem" }} />
          <SectionLabel label="SYSTEM" />
          <NavLink href="/admin/customers" label="Customers" />
          <NavLink href="/admin/settings" label="Settings" />
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.8rem", opacity: 0.5 }}>
          Logged in as Admin
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link href={href} style={{
      display: "block",
      padding: "0.75rem 1rem",
      borderRadius: "8px",
      textDecoration: "none",
      color: isActive ? "#fff" : "#94a3b8",
      background: isActive ? "#3b82f6" : "transparent",
      fontWeight: isActive ? 600 : 400,
      transition: "all 0.2s"
    }}>
      {label}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ 
      fontSize: "0.75rem", 
      fontWeight: 700, 
      color: "#475569", 
      letterSpacing: "0.05em", 
      marginBottom: "0.25rem",
      paddingLeft: "1rem" 
    }}>
      {label}
    </div>
  );
}
