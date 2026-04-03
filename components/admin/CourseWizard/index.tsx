"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StepDetails from "./StepDetails";
import StepAssignments from "./StepAssignments";
import StepReview from "./StepReview";

// ─── Shared types ────────────────────────────────────────────

export interface FlashcardItem {
  text: string;
  large: boolean;
}

export interface WizardQuestion {
  localId: string;
  type: "multiple_choice" | "true_false" | "fill_blank";
  prompt: string;
  options: string[];      // 4 items for MC, [] otherwise
  correctAnswer: string;
}

export interface WizardAssignment {
  localId: string;
  title: string;
  mediaType: "video" | "audio" | "text" | "flashcard";
  mediaSource: "upload" | "embed";
  mediaFile: File | null;
  mediaPreviewUrl: string;
  embedUrl: string;
  textContent: string;        // used when mediaType === "text"
  flashcards: FlashcardItem[]; // used when mediaType === "flashcard"
  questions: WizardQuestion[];
}

export interface WizardData {
  title: string;
  description: string;
  coverImageFile: File | null;
  coverImagePreviewUrl: string;
  openEnrollment: boolean;
  locationIds: string[];
  assignments: WizardAssignment[];
}

export interface Location {
  id: string;
  name: string;
  state: string;
}

// ─── Stepper ─────────────────────────────────────────────────

const STEPS = ["Details", "Assignments", "Review"];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: done
                    ? "var(--color-success)"
                    : active
                    ? "var(--color-accent)"
                    : "rgba(31,57,109,0.12)",
                  color: done || active ? "white" : "rgba(31,57,109,0.4)",
                }}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span
                className="text-xs mt-1 font-medium"
                style={{
                  color: active
                    ? "var(--color-accent)"
                    : done
                    ? "var(--color-success)"
                    : "rgba(31,57,109,0.4)",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-16 h-px mx-2 mb-5"
                style={{
                  backgroundColor: done
                    ? "var(--color-success)"
                    : "rgba(31,57,109,0.12)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Wizard ──────────────────────────────────────────────────

function emptyAssignment(): WizardAssignment {
  return {
    localId: crypto.randomUUID(),
    title: "",
    mediaType: "video",
    mediaSource: "upload",
    mediaFile: null,
    mediaPreviewUrl: "",
    embedUrl: "",
    textContent: "",
    flashcards: [{ text: "", large: true }],
    questions: [],
  };
}

interface CourseWizardProps {
  locations: Location[];
  courseId?: string;       // if set, wizard is in edit mode
  initialData?: WizardData;
}

export default function CourseWizard({ locations, courseId, initialData }: CourseWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>(
    initialData ?? {
      title: "",
      description: "",
      coverImageFile: null,
      coverImagePreviewUrl: "",
      openEnrollment: false,
      locationIds: [],
      assignments: [emptyAssignment()],
    }
  );

  const isEditMode = !!courseId;

  function update(patch: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  // ── Validation ──────────────────────────────────────────────

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!data.title.trim()) return "Course title is required.";
      if (data.locationIds.length === 0) return "Select at least one location.";
    }
    if (s === 1) {
      if (data.assignments.length === 0) return "Add at least one assignment.";
      for (const a of data.assignments) {
        if (!a.title.trim()) return "All assignments need a title.";
        if (a.questions.length === 0)
          return `"${a.title || "An assignment"}" needs at least one question.`;
        for (const q of a.questions) {
          if (!q.prompt.trim()) return "All questions need a prompt.";
          if (!q.correctAnswer.trim()) return "All questions need a correct answer.";
        }
      }
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) { setSaveError(err); return; }
    setSaveError(null);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setSaveError(null);
    setStep((s) => s - 1);
  }

  // ── Save ────────────────────────────────────────────────────

  async function handleSave(status: "draft" | "published") {
    setSaving(true);
    setSaveError(null);

    try {
      const supabase = createClient();

      // ── Cover image ─────────────────────────────────────────
      let coverImageUrl: string | null = null;
      if (data.coverImageFile) {
        const ext = data.coverImageFile.name.split(".").pop();
        const path = `covers/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("course-media")
          .upload(path, data.coverImageFile);
        if (upErr) throw upErr;
        coverImageUrl = supabase.storage
          .from("course-media")
          .getPublicUrl(path).data.publicUrl;
      } else if (data.coverImagePreviewUrl) {
        // Edit mode: keep existing URL; create mode: this is empty so stays null
        coverImageUrl = data.coverImagePreviewUrl;
      }

      // ── Course record ───────────────────────────────────────
      let activeCourseId: string;

      if (isEditMode && courseId) {
        const { error: courseErr } = await supabase
          .from("courses")
          .update({
            title: data.title.trim(),
            description: data.description.trim() || null,
            cover_image_url: coverImageUrl,
            open_enrollment: data.openEnrollment,
            status,
          })
          .eq("id", courseId);
        if (courseErr) throw courseErr;
        activeCourseId = courseId;

        // Replace locations
        await supabase.from("course_locations").delete().eq("course_id", courseId);
        if (data.locationIds.length > 0) {
          const { error: locErr } = await supabase.from("course_locations").insert(
            data.locationIds.map((lid) => ({ course_id: courseId, location_id: lid }))
          );
          if (locErr) throw locErr;
        }

        // Delete existing assignments (cascades to questions)
        await supabase.from("assignments").delete().eq("course_id", courseId);
      } else {
        const { data: course, error: courseErr } = await supabase
          .from("courses")
          .insert({
            title: data.title.trim(),
            description: data.description.trim() || null,
            cover_image_url: coverImageUrl,
            open_enrollment: data.openEnrollment,
            status,
          })
          .select("id")
          .single();
        if (courseErr) throw courseErr;
        activeCourseId = course.id;

        if (data.locationIds.length > 0) {
          const { error: locErr } = await supabase.from("course_locations").insert(
            data.locationIds.map((lid) => ({ course_id: activeCourseId, location_id: lid }))
          );
          if (locErr) throw locErr;
        }
      }

      // ── Assignments + questions ─────────────────────────────
      for (let i = 0; i < data.assignments.length; i++) {
        const a = data.assignments[i];

        let mediaUrl: string | null = null;
        if (a.mediaSource === "upload" && a.mediaFile) {
          const ext = a.mediaFile.name.split(".").pop();
          const path = `media/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("course-media")
            .upload(path, a.mediaFile);
          if (upErr) throw upErr;
          mediaUrl = supabase.storage
            .from("course-media")
            .getPublicUrl(path).data.publicUrl;
        } else if (a.mediaSource === "upload" && a.mediaPreviewUrl) {
          // Edit mode: no new file selected, keep existing URL
          mediaUrl = a.mediaPreviewUrl;
        }

        const { data: assignment, error: aErr } = await supabase
          .from("assignments")
          .insert({
            course_id: activeCourseId,
            title: a.title.trim(),
            media_type: a.mediaType,
            media_url: mediaUrl,
            embed_url:
              a.mediaType === "text"
                ? (a.textContent || null)
                : a.mediaType === "flashcard"
                ? (a.flashcards.some((c) => c.text.trim()) ? JSON.stringify(a.flashcards) : null)
                : a.mediaSource === "embed" && a.embedUrl.trim()
                ? a.embedUrl.trim()
                : null,
            order: i + 1,
          })
          .select("id")
          .single();
        if (aErr) throw aErr;

        if (a.questions.length > 0) {
          const { error: qErr } = await supabase.from("questions").insert(
            a.questions.map((q, qi) => ({
              assignment_id: assignment.id,
              type: q.type,
              prompt: q.prompt.trim(),
              options:
                q.type === "multiple_choice"
                  ? q.options
                  : q.type === "true_false"
                  ? ["True", "False"]
                  : null,
              correct_answer: q.correctAnswer.trim(),
              order: qi + 1,
            }))
          );
          if (qErr) throw qErr;
        }
      }

      router.push("/courses");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save. Please try again."
      );
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto">
      <Stepper current={step} />

      <div
        className="rounded-2xl p-8"
        style={{ backgroundColor: "var(--color-white)" }}
      >
        {step === 0 && (
          <StepDetails
            data={data}
            locations={locations}
            onChange={update}
          />
        )}
        {step === 1 && (
          <StepAssignments
            assignments={data.assignments}
            onChange={(assignments) => update({ assignments })}
          />
        )}
        {step === 2 && (
          <StepReview
            data={data}
            locations={locations}
            saving={saving}
            isEditMode={isEditMode}
            onSave={handleSave}
          />
        )}

        {saveError && (
          <p
            className="mt-4 text-sm"
            style={{ color: "var(--color-error)" }}
          >
            {saveError}
          </p>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: "rgba(31,57,109,0.1)" }}>
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-0"
            style={{ color: "var(--color-primary)", border: "1px solid rgba(31,57,109,0.2)" }}
          >
            Back
          </button>

          {step < 2 && (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
