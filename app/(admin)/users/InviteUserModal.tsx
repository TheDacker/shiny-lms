"use client";

import { useEffect, useState } from "react";
import { X, BookOpen, GitBranch, Check, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Location { id: string; name: string; state: string; }
interface Course { id: string; title: string; description: string | null; }
interface Path { id: string; title: string; description: string | null; }

interface Props {
  locations: Location[];
  currentUserRole: "admin" | "manager";
  currentUserLocationId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteUserModal({
  locations,
  currentUserRole,
  currentUserLocationId,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "learner" as "learner" | "manager" | "admin",
    location_id: currentUserRole === "manager" ? (currentUserLocationId ?? "") : "",
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [selectedPathIds, setSelectedPathIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("courses").select("id, title, description").eq("status", "published").order("title"),
      supabase.from("paths").select("id, title, description").order("title"),
    ]).then(([{ data: c }, { data: p }]) => {
      setCourses(c ?? []);
      setPaths(p ?? []);
      setLoadingContent(false);
    });
  }, []);

  function update(patch: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePath(id: string) {
    setSelectedPathIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        course_ids: [...selectedCourseIds],
        path_ids: [...selectedPathIds],
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const msg = data.error ?? "Failed to send invite.";
      setError(msg.toLowerCase().includes("rate limit") ? "Too many requests. Please wait a few minutes." : msg);
      return;
    }

    if (data.enrollmentWarning) {
      setError(data.enrollmentWarning);
      onSuccess();
      return;
    }

    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md flex flex-col"
        style={{ backgroundColor: "var(--color-white)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          <h2
            className="text-lg font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Invite User
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "rgba(31,57,109,0.4)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <Input value={form.first_name} onChange={(v) => update({ first_name: v })} placeholder="Jane" required />
              </Field>
              <Field label="Last Name" required>
                <Input value={form.last_name} onChange={(v) => update({ last_name: v })} placeholder="Smith" required />
              </Field>
            </div>

            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(v) => update({ email: v })} placeholder="jane@shinyshell.com" required />
            </Field>

            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={(v) => update({ phone: v })} placeholder="+1 (555) 000-0000" />
            </Field>

            <Field label="Role" required>
              <select
                value={form.role}
                onChange={(e) => update({ role: e.target.value as typeof form.role })}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
                disabled={currentUserRole === "manager"}
              >
                <option value="learner">Learner</option>
                {currentUserRole === "admin" && (
                  <>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </>
                )}
              </select>
            </Field>

            <Field label="Location" required>
              <select
                value={form.location_id}
                onChange={(e) => update({ location_id: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
                disabled={currentUserRole === "manager"}
                required
              >
                <option value="">Select location…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}, {loc.state}</option>
                ))}
              </select>
            </Field>
          </form>

          {/* Enrollment section */}
          {loadingContent ? (
            <div className="flex justify-center py-6">
              <Loader size={18} className="animate-spin" style={{ color: "rgba(31,57,109,0.3)" }} />
            </div>
          ) : (courses.length > 0 || paths.length > 0) ? (
            <div className="mt-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(31,57,109,0.4)" }}>
                Enroll in (optional)
              </p>

              {courses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} style={{ color: "rgba(31,57,109,0.4)" }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(31,57,109,0.4)" }}>Courses</p>
                  </div>
                  {courses.map((course) => (
                    <EnrollRow
                      key={course.id}
                      title={course.title}
                      description={course.description}
                      selected={selectedCourseIds.has(course.id)}
                      onToggle={() => toggleCourse(course.id)}
                    />
                  ))}
                </div>
              )}

              {paths.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GitBranch size={13} style={{ color: "rgba(31,57,109,0.4)" }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(31,57,109,0.4)" }}>Paths</p>
                  </div>
                  {paths.map((path) => (
                    <EnrollRow
                      key={path.id}
                      title={path.title}
                      description={path.description}
                      selected={selectedPathIds.has(path.id)}
                      onToggle={() => togglePath(path.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t space-y-3" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
          <button
            type="submit"
            form="invite-form"
            disabled={loading}
            className="w-full py-3 rounded text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
          >
            {loading ? "Sending invite…" : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnrollRow({ title, description, selected, onToggle }: { title: string; description: string | null; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
      style={{
        backgroundColor: selected ? "rgba(45,138,78,0.06)" : "rgba(31,57,109,0.03)",
        border: `1px solid ${selected ? "rgba(45,138,78,0.2)" : "rgba(31,57,109,0.08)"}`,
      }}
    >
      <div
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          backgroundColor: selected ? "var(--color-success)" : "transparent",
          border: `2px solid ${selected ? "var(--color-success)" : "rgba(31,57,109,0.25)"}`,
        }}
      >
        {selected && <Check size={12} color="white" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--color-primary)" }}>{title}</p>
        {description && <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(31,57,109,0.45)" }}>{description}</p>}
      </div>
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
        {label}{required && <span style={{ color: "var(--color-accent)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", required }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
      style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
      onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
    />
  );
}
