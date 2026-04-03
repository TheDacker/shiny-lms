import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/TopBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "learner") redirect("/learn");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        firstName={profile.first_name}
        lastName={profile.last_name}
        role={profile.role}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          firstName={profile.first_name}
          lastName={profile.last_name}
          role={profile.role}
        />
        <main
          className="flex-1 overflow-auto p-6"
          style={{ backgroundColor: "var(--color-neutral)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
