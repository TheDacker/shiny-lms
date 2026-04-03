"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, X, Search, ArrowUp, ArrowDown, Trash2, BookOpen, Plus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────

export interface PathCourse {
  id: string;
  title: string;
  cover_image_url: string | null;
  status: string;
}

interface FormData {
  title: string;
  description: string;
  coverImageFile: File | null;
  coverImagePreviewUrl: string;
  courses: PathCourse[];
}

interface Props {
  pathId?: string;
  initialData?: Partial<FormData>;
  allCourses: PathCourse[];
}

// ─── Component ────────────────────────────────────────────────

export default function PathForm({ pathId, initialData, allCourses }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    coverImageFile: null,
    coverImagePreviewUrl: initialData?.coverImagePreviewUrl ?? "",
    courses: initialData?.courses ?? [],
  });

  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  // ── Cover image ──────────────────────────────────────────────

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    update({ coverImageFile: file, coverImagePreviewUrl: previewUrl });
  }

  function removeCover() {
    if (form.coverImagePreviewUrl && form.coverImageFile) {
      URL.revokeObjectURL(form.coverImagePreviewUrl);
    }
    update({ coverImageFile: null, coverImagePreviewUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Course list management ───────────────────────────────────

  const selectedIds = new Set(form.courses.map((c) => c.id));

  function addCourses(courses: PathCourse[]) {
    update({ courses: [...form.courses, ...courses] });
  }

  function removeCourse(id: string) {
    update({ courses: form.courses.filter((c) => c.id !== id) });
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...form.courses];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    update({ courses: next });
  }

  function moveDown(index: number) {
    if (index === form.courses.length - 1) return;
    const next = [...form.courses];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    update({ courses: next });
  }

  // ── Save ─────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (form.courses.length === 0) { setError("Add at least one course."); return; }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Upload cover image
      let coverImageUrl: string | null =
        initialData?.coverImagePreviewUrl && !form.coverImageFile
          ? initialData.coverImagePreviewUrl
          : null;

      if (form.coverImageFile) {
        const ext = form.coverImageFile.name.split(".").pop();
        const path = `covers/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("course-media")
          .upload(path, form.coverImageFile);
        if (upErr) throw upErr;
        coverImageUrl = supabase.storage
          .from("course-media")
          .getPublicUrl(path).data.publicUrl;
      }

      if (pathId) {
        // Update path
        const { error: pathErr } = await supabase
          .from("paths")
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            cover_image_url: coverImageUrl,
          })
          .eq("id", pathId);
        if (pathErr) throw pathErr;

        // Replace path_courses
        await supabase.from("path_courses").delete().eq("path_id", pathId);
        const { error: pcErr } = await supabase.from("path_courses").insert(
          form.courses.map((c, i) => ({
            path_id: pathId,
            course_id: c.id,
            order: i + 1,
          }))
        );
        if (pcErr) throw pcErr;
      } else {
        // Create path
        const { data: path, error: pathErr } = await supabase
          .from("paths")
          .insert({
            title: form.title.trim(),
            description: form.description.trim() || null,
            cover_image_url: coverImageUrl,
          })
          .select("id")
          .single();
        if (pathErr) throw pathErr;

        const { error: pcErr } = await supabase.from("path_courses").insert(
          form.courses.map((c, i) => ({
            path_id: path.id,
            course_id: c.id,
            order: i + 1,
          }))
        );
        if (pcErr) throw pcErr;
      }

      router.push("/paths");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      {/* Metadata card */}
      <div className="rounded-2xl p-6 space-y-5" style={{ backgroundColor: "var(--color-white)" }}>
        <SectionTitle>Path Details</SectionTitle>

        {/* Title */}
        <Field label="Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. New Employee Onboarding"
            className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
            style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
          />
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What is this learning path for?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
          />
        </Field>

        {/* Cover image */}
        <Field label="Cover Image">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
          />
          {form.coverImagePreviewUrl ? (
            <div className="relative w-full h-36 rounded-lg overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.coverImagePreviewUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-black/70"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
              style={{ borderColor: "rgba(31,57,109,0.2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(31,57,109,0.2)")}
            >
              <ImageIcon size={20} style={{ color: "rgba(31,57,109,0.3)" }} />
              <span className="text-sm" style={{ color: "rgba(31,57,109,0.4)" }}>
                Click to upload cover image
              </span>
            </button>
          )}
        </Field>
      </div>

      {/* Courses card */}
      <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: "var(--color-white)" }}>
        <SectionTitle>Courses in this Path</SectionTitle>

        {/* Selected courses (ordered) */}
        {form.courses.length > 0 ? (
          <div className="space-y-2">
            {form.courses.map((course, i) => (
              <div
                key={course.id}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: "rgba(31,57,109,0.1)", backgroundColor: "rgba(31,57,109,0.02)" }}
              >
                {/* Order number */}
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {i + 1}
                </span>

                {/* Thumbnail */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
                >
                  {course.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.cover_image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen size={16} style={{ color: "rgba(31,57,109,0.3)" }} />
                  )}
                </div>

                <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--color-primary)" }}>
                  {course.title}
                </span>

                {/* Reorder + remove */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <IconBtn
                    icon={<ArrowUp size={13} />}
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    title="Move up"
                  />
                  <IconBtn
                    icon={<ArrowDown size={13} />}
                    onClick={() => moveDown(i)}
                    disabled={i === form.courses.length - 1}
                    title="Move down"
                  />
                  <IconBtn
                    icon={<Trash2 size={13} />}
                    onClick={() => removeCourse(course.id)}
                    title="Remove"
                    danger
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm py-2" style={{ color: "rgba(31,57,109,0.4)" }}>
            No courses added yet. Search below to add courses.
          </p>
        )}

        {/* Add Course button */}
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
          style={{ borderColor: "rgba(31,57,109,0.2)", color: "rgba(31,57,109,0.5)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(31,57,109,0.2)";
            e.currentTarget.style.color = "rgba(31,57,109,0.5)";
          }}
        >
          <Plus size={16} />
          Add Course
        </button>
      </div>

      {/* Course picker modal */}
      {showPicker && (
        <CoursePickerModal
          allCourses={allCourses}
          selectedIds={selectedIds}
          onAdd={(courses) => { addCourses(courses); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/paths")}
          className="px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{ border: "1px solid rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
        >
          {saving ? "Saving…" : pathId ? "Save Changes" : "Create Path"}
        </button>
      </div>
    </div>
  );
}

// ─── Course Picker Modal ──────────────────────────────────────

function CoursePickerModal({
  allCourses,
  selectedIds,
  onAdd,
  onClose,
}: {
  allCourses: PathCourse[];
  selectedIds: Set<string>;
  onAdd: (courses: PathCourse[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const available = allCourses.filter(
    (c) =>
      !selectedIds.has(c.id) &&
      c.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const courses = allCourses.filter((c) => picked.has(c.id));
    onAdd(courses);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-lg flex flex-col"
        style={{ backgroundColor: "var(--color-white)", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: "rgba(31,57,109,0.08)" }}
        >
          <h2
            className="text-lg font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Course Library
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "rgba(31,57,109,0.4)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "rgba(31,57,109,0.35)" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
              autoFocus
            />
          </div>
        </div>

        {/* Course list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {available.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(31,57,109,0.4)" }}>
              {search ? "No courses match your search" : "All courses are already in this path"}
            </p>
          ) : (
            available.map((course) => {
              const isSelected = picked.has(course.id);
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => toggle(course.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                  style={{
                    backgroundColor: isSelected ? "rgba(31,57,109,0.06)" : "transparent",
                    border: `1px solid ${isSelected ? "rgba(31,57,109,0.15)" : "transparent"}`,
                  }}
                >
                  {/* Checkbox */}
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--color-primary)" : "transparent",
                      border: `2px solid ${isSelected ? "var(--color-primary)" : "rgba(31,57,109,0.25)"}`,
                    }}
                  >
                    {isSelected && <Check size={11} color="white" strokeWidth={3} />}
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
                  >
                    {course.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen size={15} style={{ color: "rgba(31,57,109,0.3)" }} />
                    )}
                  </div>

                  {/* Title + status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-primary)" }}>
                      {course.title}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                    style={
                      course.status === "published"
                        ? { backgroundColor: "rgba(45,138,78,0.1)", color: "var(--color-success)" }
                        : { backgroundColor: "rgba(212,147,13,0.1)", color: "var(--color-warning)" }
                    }
                  >
                    {course.status}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          <button
            type="button"
            onClick={handleAdd}
            disabled={picked.size === 0}
            className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
          >
            {picked.size === 0
              ? "Select Courses"
              : `Add ${picked.size} Course${picked.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Local helpers ────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-base font-bold uppercase tracking-wide"
      style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
    >
      {children}
    </h2>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
        {label}
        {required && <span style={{ color: "var(--color-accent)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function IconBtn({
  icon,
  onClick,
  disabled,
  title,
  danger,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center transition-colors disabled:opacity-20"
      style={{ color: "rgba(31,57,109,0.35)" }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLElement).style.color = danger
            ? "var(--color-error)"
            : "var(--color-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "rgba(31,57,109,0.35)";
      }}
    >
      {icon}
    </button>
  );
}
