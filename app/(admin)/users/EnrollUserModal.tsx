"use client";

import { useEffect, useState } from "react";
import { X, BookOpen, GitBranch, Check, Loader, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "./UsersClient";

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Path {
  id: string;
  title: string;
  description: string | null;
}

interface Enrollment {
  id: string;
  course_id: string | null;
  path_id: string | null;
}

interface Props {
  user: User;
  onClose: () => void;
}

export default function EnrollUserModal({ user, onClose }: Props) {
  const supabase = createClient();

  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending changes: courseId/pathId → true (enroll) | false (unenroll)
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: p }, { data: e }] = await Promise.all([
        supabase.from("courses").select("id, title, description").eq("status", "published").order("title"),
        supabase.from("paths").select("id, title, description").order("title"),
        supabase.from("enrollments").select("id, course_id, path_id").eq("user_id", user.id),
      ]);
      setCourses(c ?? []);
      setPaths(p ?? []);
      setEnrollments(e ?? []);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const enrolledCourseIds = new Set(enrollments.filter((e) => e.course_id).map((e) => e.course_id!));
  const enrolledPathIds = new Set(enrollments.filter((e) => e.path_id).map((e) => e.path_id!));

  function isEnrolled(type: "course" | "path", id: string) {
    const key = `${type}:${id}`;
    if (key in changes) return changes[key];
    return type === "course" ? enrolledCourseIds.has(id) : enrolledPathIds.has(id);
  }

  function toggle(type: "course" | "path", id: string) {
    const key = `${type}:${id}`;
    const current = isEnrolled(type, id);
    setChanges((prev) => ({ ...prev, [key]: !current }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const toEnroll: Array<{ course_id?: string; path_id?: string }> = [];
    const toUnenroll: string[] = []; // enrollment ids

    for (const [key, enrolled] of Object.entries(changes)) {
      const [type, id] = key.split(":");
      if (enrolled) {
        // Only enroll if not already in DB
        const alreadyInDb = type === "course" ? enrolledCourseIds.has(id) : enrolledPathIds.has(id);
        if (!alreadyInDb) {
          if (type === "course") toEnroll.push({ course_id: id });
          else toEnroll.push({ path_id: id });
        }
      } else {
        // Was enrolled, now should not be
        const existing = enrollments.find(
          (e) => (type === "course" ? e.course_id === id : e.path_id === id)
        );
        if (existing) toUnenroll.push(existing.id);
      }
    }

    try {
      if (toEnroll.length > 0) {
        const { data: { user: caller } } = await supabase.auth.getUser();
        const rows = toEnroll.map((item) => ({
          user_id: user.id,
          enrolled_by: caller?.id ?? null,
          ...item,
        }));
        const { error: insertErr } = await supabase.from("enrollments").insert(rows);
        if (insertErr) throw insertErr;
      }

      for (const enrollmentId of toUnenroll) {
        const { error: delErr } = await supabase
          .from("enrollments")
          .delete()
          .eq("id", enrollmentId);
        if (delErr) throw delErr;
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md flex flex-col"
        style={{ backgroundColor: "var(--color-white)", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
              Enroll {user.first_name} {user.last_name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(31,57,109,0.45)" }}>
              Select courses and paths
            </p>
          </div>
          <button onClick={onClose} style={{ color: "rgba(31,57,109,0.4)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-3 pb-1 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(31,57,109,0.35)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search paths and courses…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: "rgba(31,57,109,0.18)", color: "var(--color-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.18)")}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader size={20} className="animate-spin" style={{ color: "rgba(31,57,109,0.3)" }} />
            </div>
          ) : (() => {
              const q = search.toLowerCase();
              const filteredPaths = paths.filter((p) => p.title.toLowerCase().includes(q));
              const filteredCourses = courses.filter((c) => c.title.toLowerCase().includes(q));
              const noneFound = filteredPaths.length === 0 && filteredCourses.length === 0;

              if (paths.length === 0 && courses.length === 0) {
                return (
                  <p className="text-sm text-center py-8" style={{ color: "rgba(31,57,109,0.4)" }}>
                    No published courses or paths yet.
                  </p>
                );
              }
              if (noneFound) {
                return (
                  <p className="text-sm text-center py-8" style={{ color: "rgba(31,57,109,0.4)" }}>
                    No results for &ldquo;{search}&rdquo;
                  </p>
                );
              }
              return (
                <>
                  {/* Paths first */}
                  {filteredPaths.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <GitBranch size={14} style={{ color: "rgba(31,57,109,0.45)" }} />
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(31,57,109,0.45)" }}>
                          Paths
                        </p>
                      </div>
                      {filteredPaths.map((path) => (
                        <EnrollRow
                          key={path.id}
                          title={path.title}
                          description={path.description}
                          enrolled={isEnrolled("path", path.id)}
                          onToggle={() => toggle("path", path.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Courses second */}
                  {filteredCourses.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} style={{ color: "rgba(31,57,109,0.45)" }} />
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(31,57,109,0.45)" }}>
                          Courses
                        </p>
                      </div>
                      {filteredCourses.map((course) => (
                        <EnrollRow
                          key={course.id}
                          title={course.title}
                          description={course.description}
                          enrolled={isEnrolled("course", course.id)}
                          onToggle={() => toggle("course", course.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()
          }
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t space-y-3" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: "1px solid rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex-1 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
              style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────

function EnrollRow({
  title,
  description,
  enrolled,
  onToggle,
}: {
  title: string;
  description: string | null;
  enrolled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
      style={{
        backgroundColor: enrolled ? "rgba(45,138,78,0.06)" : "rgba(31,57,109,0.03)",
        border: `1px solid ${enrolled ? "rgba(45,138,78,0.2)" : "rgba(31,57,109,0.08)"}`,
      }}
    >
      {/* Checkbox */}
      <div
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          backgroundColor: enrolled ? "var(--color-success)" : "transparent",
          border: `2px solid ${enrolled ? "var(--color-success)" : "rgba(31,57,109,0.25)"}`,
        }}
      >
        {enrolled && <Check size={12} color="white" strokeWidth={3} />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--color-primary)" }}>
          {title}
        </p>
        {description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(31,57,109,0.45)" }}>
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
