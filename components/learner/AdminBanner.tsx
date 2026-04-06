"use client";

import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

interface AdminBannerProps {
  role: "admin" | "manager";
}

export default function AdminBanner({ role }: AdminBannerProps) {
  const router = useRouter();

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-white text-xs"
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      <span className="opacity-70 capitalize">
        Viewing as Learner &mdash; you are an {role}
      </span>
      <button
        onClick={() => router.push("/courses")}
        className="flex items-center gap-1.5 font-semibold hover:opacity-80 transition-opacity"
        style={{ color: "var(--color-accent)" }}
      >
        <LayoutDashboard size={13} />
        Admin View
      </button>
    </div>
  );
}
