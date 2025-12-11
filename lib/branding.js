// lib/branding.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const defaultBrand = {
  name: "PrintHQ",
  logoUrl: null,
  primaryColor: "#4f46e5",
};

export function useBranding() {
  const [brand, setBrand] = useState(defaultBrand);

  useEffect(() => {
    let cancelled = false;

    async function loadBrand() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return; // stay on default

        // 1) get profile for this user
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (profileError || !profile?.company_id) return; // no company, use default

        // 2) get company branding
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("name, logo_url, primary_color")
          .eq("id", profile.company_id)
          .single();

        if (companyError || !company) return;

        if (!cancelled) {
          setBrand({
            name: company.name ?? defaultBrand.name,
            logoUrl: company.logo_url ?? null,
            primaryColor: company.primary_color ?? defaultBrand.primaryColor,
          });

          // Optional: set CSS var for theme
          document.documentElement.style.setProperty(
            "--brand-color",
            company.primary_color ?? defaultBrand.primaryColor
          );
        }
      } catch {
        // swallow errors, stick with default brand
      }
    }

    loadBrand();
    return () => {
      cancelled = true;
    };
  }, []);

  return brand;
}
