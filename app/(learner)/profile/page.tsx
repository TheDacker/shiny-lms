import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import { MapPin, Mail, Phone, Shield } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name, email, phone, role, locations(name, state)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const initials = `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase();
  const location = profile.locations as unknown as { name: string; state: string } | null;

  const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
    admin:   { bg: "#E8E6DB", color: "#6b6450" },
    manager: { bg: "rgba(212,147,13,0.15)", color: "var(--color-warning)" },
    learner: { bg: "rgba(2,173,223,0.15)",  color: "#02ADDF" },
  };
  const roleStyle = ROLE_STYLE[profile.role] ?? ROLE_STYLE.learner;

  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-8 flex flex-col items-center gap-3"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {initials}
        </div>

        {/* Name */}
        <div className="text-center">
          <h1
            className="text-xl font-bold uppercase tracking-wide text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {profile.first_name} {profile.last_name}
          </h1>
          <span
            className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold capitalize"
            style={roleStyle}
          >
            {profile.role}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-5 space-y-3">
        <InfoRow icon={<Mail size={16} />} label="Email" value={profile.email} />
        {profile.phone && (
          <InfoRow icon={<Phone size={16} />} label="Phone" value={profile.phone} />
        )}
        {location && (
          <InfoRow
            icon={<MapPin size={16} />}
            label="Location"
            value={`${location.name}, ${location.state}`}
          />
        )}
        <InfoRow
          icon={<Shield size={16} />}
          label="Role"
          value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
        />
      </div>

      {/* Sign out */}
      <div className="px-5 pt-2">
        <SignOutButton />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{ backgroundColor: "rgba(31,57,109,0.04)", border: "1px solid rgba(31,57,109,0.08)" }}
    >
      <span style={{ color: "rgba(31,57,109,0.4)" }}>{icon}</span>
      <div>
        <p className="text-xs" style={{ color: "rgba(31,57,109,0.45)" }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{value}</p>
      </div>
    </div>
  );
}
