"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Role = string | null;

type GuardStatus = "checking" | "authorized";

export function useInternalGuard() {
  const router = useRouter();
  const [status, setStatus] = useState<GuardStatus>("checking");
  const [role, setRole] = useState<Role>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    const enforceRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          router.replace("/dashboard");
          return;
        }

        const userRole = profile?.role || "customer";
        setRole(userRole);

        if (userRole !== "admin" && userRole !== "staff") {
          router.replace("/dashboard");
          return;
        }

        setStatus("authorized");
      } catch (err) {
        console.error("role guard failed", err);
        router.replace("/dashboard");
      }
    };

    enforceRole();
  }, [router, supabase]);

  return { supabase, status, role };
}
