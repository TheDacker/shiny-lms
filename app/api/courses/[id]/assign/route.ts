import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "learner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user_ids } = await request.json();
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: "No users specified" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Filter out already-enrolled users
  const { data: existing } = await admin
    .from("enrollments")
    .select("user_id")
    .eq("course_id", id)
    .in("user_id", user_ids);

  const existingIds = new Set((existing ?? []).map((e) => e.user_id));
  const newIds = (user_ids as string[]).filter((uid) => !existingIds.has(uid));

  if (newIds.length > 0) {
    const { error } = await admin.from("enrollments").insert(
      newIds.map((uid) => ({ user_id: uid, course_id: id, enrolled_by: user.id }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ enrolled: newIds.length, skipped: existingIds.size });
}
