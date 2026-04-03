import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildCourseProgress, isCourseComplete as _isCourseComplete } from "@/lib/progress";
import type { CourseRow } from "@/lib/types";
import { ChevronLeft, BookOpen, ChevronRight, CheckCircle } from "lucide-react";

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify path enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("path_id", id)
    .maybeSingle();

  if (!enrollment) redirect("/learn");

  // Fetch path
  const { data: path } = await supabase
    .from("paths")
    .select("id, title, description")
    .eq("id", id)
    .single();

  if (!path) notFound();

  // Fetch ordered courses in path
  const { data: pathCourses } = await supabase
    .from("path_courses")
    .select("order, courses(id, title, description)")
    .eq("path_id", id)
    .order("order");

  const courses = (pathCourses ?? [])
    .map((pc) => pc.courses as unknown as CourseRow | null)
    .filter(Boolean) as CourseRow[];

  // For each course, get assignment count + completion count
  const courseIds = courses.map((c) => c.id);

  const { data: assignments } = courseIds.length > 0
    ? await supabase
        .from("assignments")
        .select("id, course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const { data: progressRows } = (assignments?.length ?? 0) > 0
    ? await supabase
        .from("progress")
        .select("assignment_id, completed")
        .eq("user_id", user.id)
        .in("assignment_id", (assignments ?? []).map((a) => a.id))
    : { data: [] };

  const courseProgress = buildCourseProgress(assignments ?? [], progressRows ?? []);

  const totalCourses = courses.length;
  const doneCourses = courses.filter((c) => _isCourseComplete(courseProgress, c.id)).length;
  const pct = totalCourses > 0 ? Math.round((doneCourses / totalCourses) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 flex items-start gap-3"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <Link href="/learn" className="mt-1 flex-shrink-0" style={{ color: "rgba(255,255,255,0.7)" }}>
          <ChevronLeft size={22} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1
            className="text-xl font-bold uppercase tracking-wide text-white leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {path.title}
          </h1>
          {path.description && (
            <p className="text-white/60 text-xs mt-0.5 line-clamp-2">{path.description}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Progress bar */}
        {totalCourses > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs" style={{ color: "rgba(31,57,109,0.5)" }}>
              <span>{doneCourses} of {totalCourses} course{totalCourses !== 1 ? "s" : ""} complete</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(31,57,109,0.1)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "var(--color-success)" : "var(--color-accent)" }}
              />
            </div>
          </div>
        )}

        {/* Courses */}
        {courses.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <BookOpen size={28} style={{ color: "rgba(31,57,109,0.25)" }} />
            <p className="text-sm" style={{ color: "rgba(31,57,109,0.45)" }}>No courses in this path yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {courses.map((course, i) => {
              const prog = courseProgress[course.id] ?? { total: 0, done: 0 };
              const allDone = _isCourseComplete(courseProgress, course.id);
              return (
                <Link
                  key={course.id}
                  href={`/learn/courses/${course.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border transition-colors"
                  style={{
                    borderColor: allDone ? "rgba(45,138,78,0.15)" : "rgba(31,57,109,0.1)",
                    backgroundColor: allDone ? "rgba(45,138,78,0.03)" : "transparent",
                    opacity: allDone ? 0.75 : 1,
                  }}
                >
                  {/* Step number */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{
                      backgroundColor: allDone ? "rgba(45,138,78,0.1)" : "rgba(31,57,109,0.07)",
                      color: allDone ? "var(--color-success)" : "var(--color-primary)",
                    }}
                  >
                    {allDone ? <CheckCircle size={18} /> : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-primary)" }}>
                      {course.title}
                    </p>
                    {prog.total > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(31,57,109,0.45)" }}>
                        {prog.done}/{prog.total} assignments
                      </p>
                    )}
                  </div>

                  <ChevronRight size={16} style={{ color: "rgba(31,57,109,0.3)", flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
