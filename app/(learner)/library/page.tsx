import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, ChevronRight, CheckCircle, Lock, GraduationCap } from "lucide-react";
import EnrollButton from "./EnrollButton";
import { buildCourseProgress, isCourseComplete as _isCourseComplete } from "@/lib/progress";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's location_id
  const { data: profile } = await supabase
    .from("users")
    .select("location_id")
    .eq("id", user!.id)
    .single();

  const locationId = profile?.location_id;

  type CourseRow = {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    open_enrollment: boolean;
  };

  let courses: CourseRow[] = [];

  if (locationId) {
    const { data: locationCourses } = await supabase
      .from("course_locations")
      .select("course_id")
      .eq("location_id", locationId);

    const courseIds = (locationCourses ?? []).map((lc) => lc.course_id).filter(Boolean) as string[];

    if (courseIds.length > 0) {
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, cover_image_url, open_enrollment")
        .in("id", courseIds)
        .eq("status", "published")
        .order("title");
      courses = data ?? [];
    }
  } else {
    // No location assigned — show all published courses
    const { data } = await supabase
      .from("courses")
      .select("id, title, description, cover_image_url, open_enrollment")
      .eq("status", "published")
      .order("title");
    courses = data ?? [];
  }

  const courseIds = courses.map((c) => c.id);

  // Get enrollment status for each course (direct + path)
  const { data: directEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user!.id)
    .not("course_id", "is", null);

  const { data: pathEnrollments } = await supabase
    .from("enrollments")
    .select("path_id")
    .eq("user_id", user!.id)
    .not("path_id", "is", null);

  const pathIds = (pathEnrollments ?? []).map((e) => e.path_id).filter(Boolean) as string[];
  const { data: pathCourseRows } = pathIds.length > 0
    ? await supabase
        .from("path_courses")
        .select("course_id")
        .in("path_id", pathIds)
    : { data: [] };

  const enrolledCourseIds = new Set([
    ...(directEnrollments ?? []).map((e) => e.course_id).filter(Boolean) as string[],
    ...(pathCourseRows ?? []).map((pc) => pc.course_id).filter(Boolean) as string[],
  ]);

  // Get completion progress for enrolled courses
  const { data: assignments } = courseIds.length > 0
    ? await supabase
        .from("assignments")
        .select("id, course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: progressRows } = assignmentIds.length > 0
    ? await supabase
        .from("progress")
        .select("assignment_id, completed")
        .eq("user_id", user!.id)
        .in("assignment_id", assignmentIds)
    : { data: [] };

  const courseProgress = buildCourseProgress(assignments ?? [], progressRows ?? []);

  function isCourseComplete(courseId: string) {
    return _isCourseComplete(courseProgress, courseId);
  }

  // Sort: accessible first (open or enrolled), restricted last
  const sorted = [...courses].sort((a, b) => {
    const aAccessible = a.open_enrollment || enrolledCourseIds.has(a.id);
    const bAccessible = b.open_enrollment || enrolledCourseIds.has(b.id);
    if (aAccessible === bAccessible) return 0;
    return aAccessible ? -1 : 1;
  });

  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <h1
          className="text-2xl font-bold uppercase tracking-wide text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Courses
        </h1>
        <p className="text-white/60 text-sm mt-0.5">
          {courses.length} course{courses.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="px-5 py-5 space-y-2">
        {courses.length === 0 ? (
          <EmptyState />
        ) : (
          sorted.map((course) => {
            const enrolled = enrolledCourseIds.has(course.id);
            const complete = isCourseComplete(course.id);
            const prog = courseProgress[course.id];

            // State 1: Open enrollment, not yet enrolled → Enroll button
            if (course.open_enrollment && !enrolled) {
              return (
                <EnrollButton
                  key={course.id}
                  courseId={course.id}
                  title={course.title}
                  description={course.description}
                  coverUrl={course.cover_image_url}
                />
              );
            }

            // State 2a: Open enrollment, enrolled, not complete → enrolled tile
            if (course.open_enrollment && enrolled && !complete) {
              return (
                <div
                  key={course.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border"
                  style={{ borderColor: "rgba(45,138,78,0.25)", backgroundColor: "rgba(45,138,78,0.05)" }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "rgba(45,138,78,0.1)" }}
                  >
                    {course.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--color-primary)" }}>
                        {course.title}
                      </p>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ backgroundColor: "rgba(45,138,78,0.12)", color: "var(--color-success)" }}
                      >
                        Enrolled
                      </span>
                    </div>
                    <Link
                      href="/learn"
                      className="text-xs mt-0.5 font-medium flex items-center gap-1"
                      style={{ color: "var(--color-accent)" }}
                    >
                      <GraduationCap size={11} />
                      Go to My Learning to begin the Course
                    </Link>
                  </div>
                </div>
              );
            }

            // State 2b: Enrolled → link to course
            if (enrolled) {
              return (
                <Link
                  key={course.id}
                  href={`/learn/courses/${course.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border transition-colors active:scale-[0.98]"
                  style={{
                    borderColor: complete ? "rgba(45,138,78,0.15)" : "rgba(31,57,109,0.1)",
                    backgroundColor: complete ? "rgba(45,138,78,0.03)" : "transparent",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: complete ? "rgba(45,138,78,0.08)" : "rgba(31,57,109,0.07)" }}
                  >
                    {course.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : complete ? (
                      <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
                    ) : (
                      <BookOpen size={20} style={{ color: "rgba(31,57,109,0.3)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--color-primary)" }}>
                      {course.title}
                    </p>
                    {prog ? (
                      <p className="text-xs mt-0.5" style={{ color: complete ? "var(--color-success)" : "rgba(31,57,109,0.5)" }}>
                        {complete ? "Completed" : `${prog.done}/${prog.total} assignments done`}
                      </p>
                    ) : course.description ? (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "rgba(31,57,109,0.5)" }}>
                        {course.description}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight size={16} style={{ color: complete ? "rgba(45,138,78,0.4)" : "rgba(31,57,109,0.3)", flexShrink: 0 }} />
                </Link>
              );
            }

            // State 3: Not open enrollment, not enrolled → manager required
            return (
              <div
                key={course.id}
                className="flex items-center gap-3 p-3 rounded-2xl border"
                style={{ borderColor: "rgba(31,57,109,0.07)", backgroundColor: "rgba(31,57,109,0.02)", opacity: 0.55 }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
                >
                  {course.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Lock size={20} style={{ color: "rgba(31,57,109,0.25)" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--color-primary)" }}>
                    {course.title}
                  </p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: "rgba(31,57,109,0.5)" }}>
                    Enrollment by Manager Required
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
      >
        <BookOpen size={28} style={{ color: "rgba(31,57,109,0.3)" }} />
      </div>
      <div>
        <p className="font-semibold" style={{ color: "var(--color-primary)" }}>
          No courses available
        </p>
        <p className="text-sm mt-1" style={{ color: "rgba(31,57,109,0.5)" }}>
          Check back later for available training
        </p>
      </div>
    </div>
  );
}
