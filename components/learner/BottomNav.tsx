"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, GraduationCap, User } from "lucide-react";

const TABS = [
  { href: "/library", label: "Courses", icon: ClipboardList },
  { href: "/learn",       label: "My Learning", icon: GraduationCap },
  { href: "/profile",     label: "Profile",     icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto border-t"
      style={{
        backgroundColor: "var(--color-white)",
        borderColor: "rgba(31,57,109,0.1)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors"
              style={{
                color: active ? "var(--color-accent)" : "rgba(31,57,109,0.4)",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
