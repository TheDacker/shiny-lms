import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: courseCount }, { count: userCount }, { count: locationCount }] =
    await Promise.all([
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("locations").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Courses",   value: courseCount   ?? 0 },
    { label: "Users",     value: userCount     ?? 0 },
    { label: "Locations", value: locationCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          Welcome to Shiny Shell Training
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-6"
            style={{ backgroundColor: "var(--color-white)" }}
          >
            <p className="text-sm" style={{ color: "rgba(31,57,109,0.55)" }}>
              {label}
            </p>
            <p
              className="text-3xl font-bold mt-1 uppercase"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
