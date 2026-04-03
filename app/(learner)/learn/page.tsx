import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, GitBranch, ChevronRight, GraduationCap, CheckCircle } from "lucide-react";
import { buildCourseProgress, isCourseComplete as _isCourseComplete } from "@/lib/progress";
import type { CourseRow, PathRow } from "@/lib/types";

export default async function MyLearningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch course enrollments with course data
  const { data: courseEnrollments } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, courses(id, title, cover_image_url, description)")
    .eq("user_id", user!.id)
    .not("course_id", "is", null)
    .order("enrolled_at", { ascending: false });

  // Fetch path enrollments with path data
  const { data: pathEnrollments } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, paths(id, title, cover_image_url, description)")
    .eq("user_id", user!.id)
    .not("path_id", "is", null)
    .order("enrolled_at", { ascending: false });

  const enrolledCourses = (courseEnrollments ?? [])
    .map((e) => e.courses as unknown as CourseRow | null)
    .filter(Boolean) as CourseRow[];

  const enrolledPaths = (pathEnrollments ?? [])
    .map((e) => e.paths as unknown as PathRow | null)
    .filter(Boolean) as PathRow[];

  // Fetch courses inside enrolled paths
  const pathIds = enrolledPaths.map((p) => p.id);
  const { data: pathCourseRows } = pathIds.length > 0
    ? await supabase
        .from("path_courses")
        .select("path_id, courses(id)")
        .in("path_id", pathIds)
    : { data: [] };

  // Build pathId → courseId[] map
  const pathCourseMap: Record<string, string[]> = {};
  for (const pc of pathCourseRows ?? []) {
    const cId = (pc.courses as unknown as { id: string } | null)?.id;
    if (!cId) continue;
    if (!pathCourseMap[pc.path_id]) pathCourseMap[pc.path_id] = [];
    pathCourseMap[pc.path_id].push(cId);
  }

  // All course IDs needed for progress
  const directCourseIds = enrolledCourses.map((c) => c.id);
  const pathCourseIds = Object.values(pathCourseMap).flat();
  const allCourseIds = [...new Set([...directCourseIds, ...pathCourseIds])];

  // Fetch assignments + progress
  const { data: assignments } = allCourseIds.length > 0
    ? await supabase
        .from("assignments")
        .select("id, course_id")
        .in("course_id", allCourseIds)
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

  function isPathComplete(pathId: string) {
    const cIds = pathCourseMap[pathId] ?? [];
    return cIds.length > 0 && cIds.every((cId) => isCourseComplete(cId));
  }

  // Split into 4 buckets
  const incompletePaths = enrolledPaths.filter((p) => !isPathComplete(p.id));
  const completedPaths = enrolledPaths.filter((p) => isPathComplete(p.id));
  const incompleteCourses = enrolledCourses.filter((c) => !isCourseComplete(c.id));
  const completedCourses = enrolledCourses.filter((c) => isCourseComplete(c.id));

  const hasAnything = enrolledCourses.length > 0 || enrolledPaths.length > 0;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <h1
          className="text-2xl font-bold uppercase tracking-wide text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          My Learning
        </h1>
        <p className="text-white/60 text-sm mt-0.5">Your enrolled courses and paths</p>
      </div>

      <div className="px-5 py-5 space-y-6">
        {!hasAnything && <EmptyState />}

        {/* Incomplete Paths */}
        {incompletePaths.length > 0 && (
          <Section title="In-Progress Paths" icon={<GitBranch size={16} />}>
            {incompletePaths.map((path) => {
              const cIds = pathCourseMap[path.id] ?? [];
              const total = cIds.length;
              const done = cIds.filter((cId) => isCourseComplete(cId)).length;
              return (
                <EnrollmentCard
                  key={path.id}
                  title={path.title}
                  description={path.description}
                  coverUrl={path.cover_image_url}
                  href={`/learn/paths/${path.id}`}
                  type="path"
                  completed={false}
                  progress={total > 0 ? { total, done } : undefined}
                  progressLabel="courses"
                />
              );
            })}
          </Section>
        )}

        {/* Incomplete Courses */}
        {incompleteCourses.length > 0 && (
          <Section title="In-Progress Courses" icon={<BookOpen size={16} />}>
            {incompleteCourses.map((course) => {
              const prog = courseProgress[course.id];
              return (
                <EnrollmentCard
                  key={course.id}
                  title={course.title}
                  description={course.description}
                  coverUrl={course.cover_image_url}
                  href={`/learn/courses/${course.id}`}
                  type="course"
                  completed={false}
                  progress={prog}
                  progressLabel="assignments"
                />
              );
            })}
          </Section>
        )}

        {/* Completed Courses */}
        {completedCourses.length > 0 && (
          <Section title="Completed Courses" icon={<CheckCircle size={16} />}>
            {completedCourses.map((course) => (
              <EnrollmentCard
                key={course.id}
                title={course.title}
                description={course.description}
                coverUrl={course.cover_image_url}
                href={`/learn/courses/${course.id}`}
                type="course"
                completed={true}
              />
            ))}
          </Section>
        )}

        {/* Completed Paths */}
        {completedPaths.length > 0 && (
          <Section title="Completed Paths" icon={<CheckCircle size={16} />}>
            {completedPaths.map((path) => (
              <EnrollmentCard
                key={path.id}
                title={path.title}
                description={path.description}
                coverUrl={path.cover_image_url}
                href={`/learn/paths/${path.id}`}
                type="path"
                completed={true}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span style={{ color: "rgba(31,57,109,0.5)" }}>{icon}</span>
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgba(31,57,109,0.5)" }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EnrollmentCard({
  title, description, coverUrl, href, type, completed, progress, progressLabel,
}: {
  title: string;
  description: string | null;
  coverUrl: string | null;
  href: string;
  type: "course" | "path";
  completed: boolean;
  progress?: { total: number; done: number };
  progressLabel?: string;
}) {
  const pct = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-2xl border transition-colors active:scale-[0.98]"
      style={{
        borderColor: completed ? "rgba(45,138,78,0.15)" : "rgba(31,57,109,0.1)",
        backgroundColor: completed ? "rgba(45,138,78,0.03)" : "transparent",
      }}
    >
      {/* Thumbnail */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: completed ? "rgba(45,138,78,0.08)" : "rgba(31,57,109,0.07)" }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : completed ? (
          <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
        ) : type === "path" ? (
          <GitBranch size={20} style={{ color: "rgba(31,57,109,0.3)" }} />
        ) : (
          <BookOpen size={20} style={{ color: "rgba(31,57,109,0.3)" }} />
        )}
      </div>

      {/* Text + progress */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: "var(--color-primary)" }}>
          {title}
        </p>

        {!completed && progress ? (
          <div className="mt-1.5 space-y-1">
            <div className="flex justify-between text-xs" style={{ color: "rgba(31,57,109,0.45)" }}>
              <span>{progress.done} of {progress.total} {progressLabel ?? "assignments"} done</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(31,57,109,0.1)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct === 0 ? "rgba(31,57,109,0.2)" : "var(--color-accent)",
                }}
              />
            </div>
          </div>
        ) : !completed && description ? (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "rgba(31,57,109,0.5)" }}>
            {description}
          </p>
        ) : null}
      </div>

      <ChevronRight size={16} style={{ color: completed ? "rgba(45,138,78,0.4)" : "rgba(31,57,109,0.3)", flexShrink: 0 }} />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
      >
        <GraduationCap size={28} style={{ color: "rgba(31,57,109,0.3)" }} />
      </div>
      <div>
        <p className="font-semibold" style={{ color: "var(--color-primary)" }}>
          No courses yet
        </p>
        <p className="text-sm mt-1" style={{ color: "rgba(31,57,109,0.5)" }}>
          Your manager will enroll you in training courses
        </p>
      </div>
    </div>
  );
}
