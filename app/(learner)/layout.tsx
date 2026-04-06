import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/learner/BottomNav";
import AdminBanner from "@/components/learner/AdminBanner";

export default async function LearnerLayout({
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
    .select("role")
    .eq("id", user.id)
    .single();

  const isElevated =
    profile?.role === "admin" || profile?.role === "manager";

  return (
    // Outer: centers the 480px column on desktop, tan background fills the rest
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-neutral)" }}
    >
      {/* Inner: the mobile column */}
      <div
        className="relative mx-auto flex flex-col min-h-screen max-w-[480px]"
        style={{ backgroundColor: "var(--color-white)" }}
      >
        {isElevated && (
          <AdminBanner role={profile.role as "admin" | "manager"} />
        )}
        <main className="flex-1 overflow-auto" style={{ paddingBottom: "72px" }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
