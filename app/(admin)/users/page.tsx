import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("users")
    .select("role, location_id")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role === "learner") redirect("/learn");

  const admin = createAdminClient();

  const [{ data: users }, { data: locations }, { data: authData }] = await Promise.all([
    supabase
      .from("users")
      .select("id, first_name, last_name, email, phone, role, location_id, is_active, created_at, locations(name, state)")
      .order("created_at", { ascending: false }),
    supabase
      .from("locations")
      .select("id, name, state")
      .order("state")
      .order("name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Build map of auth userId → email_confirmed_at
  const confirmedMap = new Map<string, string | null>(
    (authData?.users ?? []).map((u) => [u.id, u.email_confirmed_at ?? null])
  );

  // Derive status for each user
  const usersWithStatus = (users ?? []).map((u) => {
    const confirmedAt = confirmedMap.get(u.id);
    const status = !(u as unknown as { is_active: boolean }).is_active
      ? "deactivated"
      : !confirmedAt
      ? "pending"
      : "active";
    return { ...u, status };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Users
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
            {users?.length ?? 0} total user{users?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Suspense>
        <UsersClient
          initialUsers={usersWithStatus as unknown as Parameters<typeof UsersClient>[0]["initialUsers"]}
          locations={locations ?? []}
          currentUserRole={currentProfile.role}
          currentUserLocationId={currentProfile.location_id}
        />
      </Suspense>
    </div>
  );
}
