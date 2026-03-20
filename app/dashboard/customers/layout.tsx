"use client";

import React from "react";
import { useInternalGuard } from "@/app/hooks/useInternalGuard";

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  const { status } = useInternalGuard();

  if (status !== "authorized") {
    return <div className="p-8 text-gray-500">Checking permissions…</div>;
  }

  return <>{children}</>;
}
