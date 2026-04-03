import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if a user has access to a course.
 * Access is granted if any of the following is true:
 *  1. The course has open_enrollment = true
 *  2. The user has a direct enrollment for the course
 *  3. The user is enrolled in a path that contains the course
 */
export async function checkCourseAccess(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<boolean> {
  // 1. Open enrollment
  const { data: course } = await supabase
    .from("courses")
    .select("open_enrollment")
    .eq("id", courseId)
    .single();

  if (course?.open_enrollment) return true;

  // 2. Direct enrollment
  const { data: direct } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (direct) return true;

  // 3. Path enrollment
  const { data: pathEnrollments } = await supabase
    .from("enrollments")
    .select("path_id")
    .eq("user_id", userId)
    .not("path_id", "is", null);

  const pathIds = (pathEnrollments ?? []).map((e) => e.path_id as string);
  if (pathIds.length > 0) {
    const { data: pc } = await supabase
      .from("path_courses")
      .select("path_id")
      .eq("course_id", courseId)
      .in("path_id", pathIds)
      .limit(1);
    if ((pc?.length ?? 0) > 0) return true;
  }

  return false;
}
