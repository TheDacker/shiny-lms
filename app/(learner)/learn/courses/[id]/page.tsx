import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { checkCourseAccess } from "@/lib/courseAccess";
import { ChevronLeft, BookOpen, CheckCircle, ChevronRight } from "lucide-react";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hasAccess = await checkCourseAccess(supabase, user.id, id);
  if (!hasAccess) redirect("/library");

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, cover_image_url")
    .eq("id", id)
    .single();

  if (!course) notFound();

  // Fetch assignments ordered
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, media_type, order")
    .eq("course_id", id)
    .order("order");

  // Fetch progress
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: progressRows } = assignmentIds.length > 0
    ? await supabase
        .from("progress")
        .select("assignment_id, completed")
        .eq("user_id", user.id)
        .in("assignment_id", assignmentIds)
    : { data: [] };

  const completedSet = new Set(
    (progressRows ?? []).filter((p) => p.completed).map((p) => p.assignment_id)
  );

  const total = assignments?.length ?? 0;
  const done = (assignments ?? []).filter((a) => completedSet.has(a.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const MEDIA_LABELS: Record<string, string> = {
    video: "Video", audio: "Audio", text: "Text", flashcard: "Flashcard",
  };

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
            {course.title}
          </h1>
          {course.description && (
            <p className="text-white/60 text-xs mt-0.5 line-clamp-2">{course.description}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Progress bar */}
        {total > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs" style={{ color: "rgba(31,57,109,0.5)" }}>
              <span>{done} of {total} complete</span>
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

        {/* Assignments */}
        {total === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <BookOpen size={28} style={{ color: "rgba(31,57,109,0.25)" }} />
            <p className="text-sm" style={{ color: "rgba(31,57,109,0.45)" }}>No assignments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(assignments ?? []).map((a) => {
              const completed = completedSet.has(a.id);
              return (
                <Link
                  key={a.id}
                  href={`/play/${a.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border transition-colors"
                  style={{
                    borderColor: completed ? "rgba(45,138,78,0.15)" : "rgba(31,57,109,0.1)",
                    backgroundColor: completed ? "rgba(45,138,78,0.03)" : "transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: completed ? "rgba(45,138,78,0.1)" : "rgba(31,57,109,0.07)" }}
                  >
                    {completed
                      ? <CheckCircle size={18} style={{ color: "var(--color-success)" }} />
                      : <BookOpen size={18} style={{ color: "rgba(31,57,109,0.4)" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-primary)" }}>
                      {a.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(31,57,109,0.45)" }}>
                      {MEDIA_LABELS[a.media_type] ?? a.media_type}
                    </p>
                  </div>
                  {completed
                    ? <span className="text-xs font-semibold flex-shrink-0" style={{ color: "rgba(31,57,109,0.4)" }}>Retake</span>
                    : <ChevronRight size={16} style={{ color: "rgba(31,57,109,0.3)", flexShrink: 0 }} />
                  }
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
