"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function enrollCourse(courseId: string) {
  // Verify the user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the course allows open enrollment
  const { data: course } = await supabase
    .from("courses")
    .select("open_enrollment")
    .eq("id", courseId)
    .single();

  if (!course?.open_enrollment) return { error: "Course does not allow open enrollment" };

  // Use admin client to bypass RLS for the insert
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("enrollments").insert({
      user_id: user.id,
      course_id: courseId,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/learn");
  return { ok: true };
}
