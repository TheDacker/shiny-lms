import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { course_id } = await req.json();
  if (!course_id) return NextResponse.json({ error: "course_id required" }, { status: 400 });

  // Verify the course is published and open for enrollment
  const { data: course } = await supabase
    .from("courses")
    .select("id, open_enrollment, status")
    .eq("id", course_id)
    .eq("status", "published")
    .eq("open_enrollment", true)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Course not found or not open for enrollment" }, { status: 404 });
  }

  // Check not already enrolled
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", course_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
  }

  // Use admin client to bypass learner RLS restriction on insert
  const admin = createAdminClient();
  const { error } = await admin.from("enrollments").insert({
    user_id: user.id,
    course_id,
    enrolled_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
