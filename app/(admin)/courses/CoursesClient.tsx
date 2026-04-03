"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Pencil, UserPlus, X, Check, Loader, Eye, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import CoursePreviewModal, { type CoursePreviewData } from "@/components/admin/CoursePreviewModal";

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: "draft" | "published";
  open_enrollment: boolean;
}

interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Props {
  courses: Course[];
}

export default function CoursesClient({ courses }: Props) {
  const router = useRouter();
  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const [previewData, setPreviewData] = useState<CoursePreviewData | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);

  async function openPreview(course: Course) {
    const supabase = createClient();
    const { data: assignments } = await supabase
      .from("assignments")
      .select("title, media_type")
      .eq("course_id", course.id)
      .order("order");

    setPreviewData({
      title: course.title,
      description: course.description,
      coverImageUrl: course.cover_image_url,
      assignments: (assignments ?? []).map((a) => ({
        title: a.title as string,
        mediaType: a.media_type as string,
      })),
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onAssign={() => setAssignCourse(course)}
            onPreview={() => openPreview(course)}
            onDelete={() => setDeleteCourse(course)}
          />
        ))}
      </div>

      {assignCourse && (
        <AssignModal course={assignCourse} onClose={() => setAssignCourse(null)} />
      )}

      <CoursePreviewModal
        preview={previewData}
        onClose={() => setPreviewData(null)}
      />

      {deleteCourse && (
        <DeleteCourseModal
          course={deleteCourse}
          onClose={() => setDeleteCourse(null)}
          onDeleted={() => { setDeleteCourse(null); router.refresh(); }}
        />
      )}
    </>
  );
}

// ─── Course card with hover overlay ───────────────────────────

function CourseCard({ course, onAssign, onPreview, onDelete }: { course: Course; onAssign: () => void; onPreview: () => void; onDelete: () => void }) {
  return (
    <div
      className="relative flex flex-col rounded-xl overflow-hidden group"
      style={{ backgroundColor: "var(--color-white)" }}
    >
      {/* Cover */}
      <div
        className="h-36 flex items-center justify-center"
        style={{ backgroundColor: "rgba(31,57,109,0.06)" }}
      >
        {course.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen size={32} style={{ color: "rgba(31,57,109,0.2)" }} />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-bold text-sm leading-snug line-clamp-2"
            style={{ color: "var(--color-primary)" }}
          >
            {course.title}
          </h3>
          <StatusBadge status={course.status} />
        </div>

        {course.description && (
          <p className="text-xs line-clamp-2 flex-1" style={{ color: "rgba(31,57,109,0.55)" }}>
            {course.description}
          </p>
        )}

        {course.open_enrollment && (
          <span
            className="text-xs self-start px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(45,138,78,0.1)", color: "var(--color-success)" }}
          >
            Open Enrollment
          </span>
        )}
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl px-6"
        style={{ backgroundColor: "rgba(31,57,109,0.82)" }}
      >
        <div className="flex items-center gap-2 w-full">
          <Link
            href={`/courses/${course.id}/edit`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
          >
            <Pencil size={13} />
            Edit
          </Link>
          <button
            type="button"
            onClick={onAssign}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-opacity hover:opacity-90"
            style={{ backgroundColor: "white", color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}
          >
            <UserPlus size={13} />
            Assign
          </button>
        </div>
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-opacity hover:opacity-90"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontFamily: "var(--font-heading)" }}
          >
            <Eye size={13} />
            Preview
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center w-9 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: "rgba(201,59,59,0.7)", color: "white" }}
            title="Delete course"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign modal ─────────────────────────────────────────────

function AssignModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("role", "learner")
        .eq("is_active", true)
        .order("last_name")
        .order("first_name"),
      supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", course.id),
    ]).then(([{ data: l }, { data: e }]) => {
      setLearners(l ?? []);
      setEnrolled(new Set((e ?? []).map((en) => en.user_id)));
      setLoading(false);
    });
  }, [course.id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    const ids = [...selected].filter((id) => !enrolled.has(id));
    if (ids.length === 0) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/courses/${course.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: ids }),
    });

    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to enroll learners.");
      return;
    }

    const { enrolled: count } = await res.json();
    setEnrolled((prev) => new Set([...prev, ...ids]));
    setSelected(new Set());
    setSuccessCount(count);
  }

  const filtered = learners.filter((l) =>
    `${l.first_name} ${l.last_name} ${l.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const newlySelected = [...selected].filter((id) => !enrolled.has(id)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md flex flex-col"
        style={{ backgroundColor: "var(--color-white)", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(31,57,109,0.08)" }}
        >
          <div>
            <h2
              className="text-lg font-bold uppercase tracking-wide"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
            >
              Assign Learners
            </h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(31,57,109,0.5)" }}>
              {course.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "rgba(31,57,109,0.4)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learners…"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
          />
        </div>

        {/* Learner list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader size={18} className="animate-spin" style={{ color: "rgba(31,57,109,0.3)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "rgba(31,57,109,0.4)" }}>
              No learners found
            </p>
          ) : (
            filtered.map((learner) => {
              const isEnrolled = enrolled.has(learner.id);
              const isSelected = selected.has(learner.id);
              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => !isEnrolled && toggle(learner.id)}
                  disabled={isEnrolled}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors disabled:opacity-60"
                  style={{
                    backgroundColor: isEnrolled
                      ? "rgba(45,138,78,0.05)"
                      : isSelected
                      ? "rgba(31,57,109,0.06)"
                      : "transparent",
                    border: `1px solid ${isEnrolled ? "rgba(45,138,78,0.2)" : isSelected ? "rgba(31,57,109,0.15)" : "transparent"}`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      backgroundColor: isEnrolled
                        ? "var(--color-success)"
                        : isSelected
                        ? "var(--color-primary)"
                        : "transparent",
                      border: `2px solid ${isEnrolled ? "var(--color-success)" : isSelected ? "var(--color-primary)" : "rgba(31,57,109,0.25)"}`,
                    }}
                  >
                    {(isEnrolled || isSelected) && <Check size={11} color="white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                      {learner.first_name} {learner.last_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "rgba(31,57,109,0.45)" }}>
                      {learner.email}
                    </p>
                  </div>
                  {isEnrolled && (
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--color-success)" }}>
                      Enrolled
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t space-y-3" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
          {successCount !== null && (
            <p className="text-sm" style={{ color: "var(--color-success)" }}>
              ✓ {successCount} learner{successCount !== 1 ? "s" : ""} enrolled successfully
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || newlySelected === 0}
            className="w-full py-3 rounded text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
          >
            {saving
              ? "Enrolling…"
              : newlySelected > 0
              ? `Enroll ${newlySelected} Learner${newlySelected !== 1 ? "s" : ""}`
              : "Select Learners"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Course Modal ──────────────────────────────────────

function DeleteCourseModal({
  course,
  onClose,
  onDeleted,
}: {
  course: Course;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (typed !== "DELETE") return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("courses").delete().eq("id", course.id);
    onDeleted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm p-6 space-y-5"
        style={{ backgroundColor: "var(--color-white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2
              className="text-lg font-bold uppercase tracking-wide"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-error)" }}
            >
              Delete Course
            </h2>
            <p className="text-sm" style={{ color: "rgba(31,57,109,0.6)" }}>
              You&apos;re about to delete{" "}
              <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
                &ldquo;{course.title}&rdquo;
              </span>
              . This cannot be undone.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center"
            style={{ color: "rgba(31,57,109,0.4)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Type to confirm */}
        <div className="space-y-1.5">
          <label
            className="block text-xs font-semibold uppercase tracking-wide"
            style={{ color: "rgba(31,57,109,0.5)" }}
          >
            Type <span className="font-bold" style={{ color: "var(--color-error)" }}>DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            autoFocus
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none font-mono"
            style={{
              borderColor: typed === "DELETE" ? "var(--color-error)" : "rgba(31,57,109,0.2)",
              color: "var(--color-primary)",
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{ border: "1px solid rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={typed !== "DELETE" || deleting}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-35"
            style={{ backgroundColor: "var(--color-error)", fontFamily: "var(--font-heading)" }}
          >
            {deleting ? "Deleting…" : "Delete Course"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize"
      style={
        status === "published"
          ? { backgroundColor: "rgba(45,138,78,0.1)", color: "var(--color-success)" }
          : { backgroundColor: "rgba(212,147,13,0.1)", color: "var(--color-warning)" }
      }
    >
      {status}
    </span>
  );
}
