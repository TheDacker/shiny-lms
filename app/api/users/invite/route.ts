import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // Verify the caller is authenticated and has invite permission
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

  const body = await request.json();
  const { email, first_name, last_name, phone, role, location_id, course_ids = [], path_ids = [] } = body;

  if (!email || !first_name || !last_name || !role || !location_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Managers can only invite learners
  if (profile.role === "manager" && role !== "learner") {
    return NextResponse.json({ error: "Managers can only invite learners" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name, role, location_id, phone: phone || null },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Insert enrollments if any were selected
  const newUserId = data.user.id;
  const enrollmentRows: Array<{ user_id: string; enrolled_by: string; course_id?: string; path_id?: string }> = [
    ...(course_ids as string[]).map((id: string) => ({ user_id: newUserId, enrolled_by: user.id, course_id: id })),
    ...(path_ids as string[]).map((id: string) => ({ user_id: newUserId, enrolled_by: user.id, path_id: id })),
  ];

  let enrollmentWarning: string | undefined;
  if (enrollmentRows.length > 0) {
    const { error: enrollError } = await admin.from("enrollments").insert(enrollmentRows);
    if (enrollError) enrollmentWarning = "User invited but enrollment failed: " + enrollError.message;
  }

  return NextResponse.json({ user: data.user, enrollmentWarning });
}
