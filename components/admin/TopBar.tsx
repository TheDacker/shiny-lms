"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, UserPlus, Bell, HelpCircle } from "lucide-react";

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin":     "Dashboard",
  "/courses":   "Courses",
  "/paths":     "Paths",
  "/users":     "Users",
  "/locations": "Locations",
};

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [];
  const segments = pathname.split("/").filter(Boolean);

  let accumulated = "";
  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label = BREADCRUMB_MAP[accumulated] ?? seg.replace(/-/g, " ");
    crumbs.push({ label, href: accumulated });
  }
  return crumbs;
}

interface TopBarProps {
  firstName: string;
  lastName: string;
  role: "admin" | "manager";
}

export default function TopBar({ firstName, lastName, role }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0 border-b"
      style={{ backgroundColor: "var(--color-white)", borderColor: "rgba(31,57,109,0.1)" }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <span style={{ color: "rgba(31,57,109,0.3)" }}>/</span>
            )}
            {i === crumbs.length - 1 ? (
              <span
                className="font-semibold capitalize"
                style={{ color: "var(--color-primary)" }}
              >
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => router.push(crumb.href)}
                className="capitalize hover:underline"
                style={{ color: "rgba(31,57,109,0.5)" }}
              >
                {crumb.label}
              </button>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: "rgba(31,57,109,0.5)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-neutral)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "";
            (e.currentTarget as HTMLElement).style.color = "rgba(31,57,109,0.5)";
          }}
        >
          <Search size={16} />
          <span className="hidden sm:inline text-xs">Search</span>
        </button>

        {/* Add User */}
        <button
          onClick={() => router.push("/users?invite=true")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--color-accent)",
            fontFamily: "var(--font-heading)",
          }}
        >
          <UserPlus size={14} />
          <span className="hidden sm:inline">Add User</span>
        </button>

        {/* Divider */}
        <div
          className="w-px h-5 mx-1"
          style={{ backgroundColor: "rgba(31,57,109,0.12)" }}
        />

        {/* Notifications */}
        <IconButton icon={<Bell size={18} />} title="Notifications" />

        {/* Help */}
        <IconButton icon={<HelpCircle size={18} />} title="Help" />

        {/* Profile avatar */}
        <button
          title={`${firstName} ${lastName}`}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ml-1 flex-shrink-0"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {`${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()}
        </button>
      </div>
    </header>
  );
}

function IconButton({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
      style={{ color: "rgba(31,57,109,0.5)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-neutral)";
        (e.currentTarget as HTMLElement).style.color = "var(--color-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "";
        (e.currentTarget as HTMLElement).style.color = "rgba(31,57,109,0.5)";
      }}
    >
      {icon}
    </button>
  );
}
