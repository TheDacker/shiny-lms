"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  GitBranch,
  Users,
  MapPin,
  LogOut,
  GraduationCap,
} from "lucide-react";
import ShellLogo from "@/components/ShellLogo";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/courses",   label: "Courses",   icon: BookOpen },
  { href: "/paths",     label: "Paths",     icon: GitBranch },
  { href: "/users",     label: "Users",     icon: Users },
  { href: "/locations", label: "Locations", icon: MapPin },
];

interface SidebarProps {
  firstName: string;
  lastName: string;
  role: "admin" | "manager";
}

export default function Sidebar({ firstName, lastName, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <ShellLogo size={22} />
          </div>
          <div>
            <p
              className="text-white text-sm font-bold uppercase tracking-wide leading-none"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Shiny Shell
            </p>
            <p className="text-white/50 text-xs mt-0.5">Training</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: "var(--color-accent)",
                      color: "white",
                      fontWeight: 600,
                    }
                  : {
                      color: "rgba(255,255,255,0.65)",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "";
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.65)";
                }
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Learner view toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={() => router.push("/learn")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.65)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "";
            (e.currentTarget as HTMLElement).style.color =
              "rgba(255,255,255,0.65)";
          }}
        >
          <GraduationCap size={18} />
          <span>Learner View</span>
        </button>
      </div>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: "var(--color-accent)", color: "white" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {firstName} {lastName}
            </p>
            <p className="text-white/40 text-xs capitalize">{role}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-white/40 hover:text-white transition-colors flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
