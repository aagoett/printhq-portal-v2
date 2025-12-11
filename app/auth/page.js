"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, signInCustomer } from "../../lib/supabase";
import { Lock, Mail, Building, User } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signup"); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    password: "",
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await createCustomer({
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          contactName: formData.contactName,
        });
      } else {
        await signInCustomer({
          email: formData.email,
          password: formData.password,
        });
      }

      // on success → go to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #020617 0, #020617 40%, #000 100%)",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(15, 23, 42, 0.95)",
          borderRadius: "1.5rem",
          padding: "2rem 2.25rem 2.25rem",
          border: "1px solid rgba(148, 163, 184, 0.4)",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.9)",
        }}
      >
        {/* Logo / Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              height: 48,
              width: 48,
              borderRadius: "1rem",
              background:
                "radial-gradient(circle at 0 0, #22c55e 0, #4f46e5 35%, #0ea5e9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 30px rgba(56, 189, 248, 0.6)",
              marginBottom: "0.75rem",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>⚡</span>
          </div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            PRINTHQ
          </div>
          <div
            style={{
              marginTop: "0.4rem",
              fontSize: "0.85rem",
              opacity: 0.7,
            }}
          >
            Create your account
          </div>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#020617",
            borderRadius: "999px",
            padding: "0.18rem",
            marginBottom: "1rem",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "0.45rem 0.5rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              background:
                mode === "login" ? "#0f172a" : "transparent",
              color: mode === "login" ? "#e5e7eb" : "#9ca3af",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "0.45rem 0.5rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              background:
                mode === "signup"
                  ? "linear-gradient(to right, #4f46e5, #22c55e)"
                  : "transparent",
              color: mode === "signup" ? "#f9fafb" : "#9ca3af",
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.7)",
              color: "#fecaca",
              borderRadius: "0.75rem",
              padding: "0.6rem 0.8rem",
              fontSize: "0.8rem",
              marginBottom: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
          {mode === "signup" && (
            <>
              <Field
                label="Company Name"
                icon={<Building size={16} />}
                value={formData.companyName}
                onChange={handleChange("companyName")}
                placeholder="Pacific Printing"
              />
              <Field
                label="Contact Name"
                icon={<User size={16} />}
                value={formData.contactName}
                onChange={handleChange("contactName")}
                placeholder="Andrew"
              />
            </>
          )}

          <Field
            label="Email Address"
            icon={<Mail size={16} />}
            type="email"
            value={formData.email}
            onChange={handleChange("email")}
            placeholder="you@company.com"
          />

          <Field
            label="Password"
            icon={<Lock size={16} />}
            type="password"
            value={formData.password}
            onChange={handleChange("password")}
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.6rem",
              width: "100%",
              borderRadius: "999px",
              border: "none",
              padding: "0.7rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              background:
                "linear-gradient(to right, #4f46e5 0%, #22c55e 100%)",
              color: "#f9fafb",
              boxShadow: "0 14px 35px rgba(79, 70, 229, 0.55)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? mode === "signup"
                ? "Creating account..."
                : "Logging in..."
              : mode === "signup"
              ? "Create Account"
              : "Log In"}
          </button>
        </form>

        {/* Tiny footer */}
        <div
          style={{
            marginTop: "0.9rem",
            textAlign: "center",
            fontSize: "0.8rem",
            opacity: 0.6,
          }}
        >
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            style={{
              border: "none",
              background: "transparent",
              color: "#60a5fa",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {mode === "signup" ? "Log in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Small input component */

function Field({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <div style={{ display: "grid", gap: "0.25rem" }}>
      <label style={{ fontSize: "0.8rem", opacity: 0.75 }}>{label}</label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          background: "#020617",
          borderRadius: "0.75rem",
          padding: "0.55rem 0.7rem",
          border: "1px solid rgba(30, 64, 175, 0.6)",
        }}
      >
        <span style={{ opacity: 0.6 }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "#e5e7eb",
            fontSize: "0.85rem",
          }}
        />
      </div>
    </div>
  );
}
