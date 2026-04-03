"use client";

import { useState } from "react";
import { BookOpen, MapPin, FileQuestion, Eye } from "lucide-react";
import type { WizardData, Location } from "./index";
import CoursePreviewModal from "@/components/admin/CoursePreviewModal";

interface Props {
  data: WizardData;
  locations: Location[];
  saving: boolean;
  isEditMode?: boolean;
  onSave: (status: "draft" | "published") => void;
}

const STATUS_LABEL: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  fill_blank: "Fill in the Blank",
};

export default function StepReview({ data, locations, saving, isEditMode, onSave }: Props) {
  const [showPreview, setShowPreview] = useState(false);

  const selectedLocations = locations.filter((l) =>
    data.locationIds.includes(l.id)
  );

  const previewData = {
    title: data.title,
    description: data.description || null,
    coverImageUrl: data.coverImagePreviewUrl || null,
    assignments: data.assignments.map((a) => ({
      title: a.title,
      mediaType: a.mediaType,
    })),
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Review & Publish
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          Confirm everything looks right before publishing
        </p>
      </div>

      {/* Course summary */}
      <Section title="Course Details">
        <div className="flex gap-4">
          {data.coverImagePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.coverImagePreviewUrl}
              alt="Cover"
              className="w-24 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="space-y-1 min-w-0">
            <p
              className="font-bold text-base"
              style={{ color: "var(--color-primary)" }}
            >
              {data.title}
            </p>
            {data.description && (
              <p className="text-sm line-clamp-2" style={{ color: "rgba(31,57,109,0.6)" }}>
                {data.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={
                  data.openEnrollment
                    ? { backgroundColor: "rgba(45,138,78,0.1)", color: "var(--color-success)" }
                    : { backgroundColor: "rgba(31,57,109,0.08)", color: "rgba(31,57,109,0.55)" }
                }
              >
                {data.openEnrollment ? "Open Enrollment" : "Enrollment by invite"}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Locations */}
      <Section title="Locations">
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map((loc) => (
            <span
              key={loc.id}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "rgba(31,57,109,0.08)", color: "var(--color-primary)" }}
            >
              <MapPin size={11} />
              {loc.name}, {loc.state}
            </span>
          ))}
        </div>
      </Section>

      {/* Assignments */}
      <Section title={`Assignments (${data.assignments.length})`}>
        <div className="space-y-2">
          {data.assignments.map((a, i) => (
            <div
              key={a.localId}
              className="rounded-lg p-3"
              style={{ backgroundColor: "rgba(31,57,109,0.03)", border: "1px solid rgba(31,57,109,0.08)" }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm" style={{ color: "var(--color-primary)" }}>
                      {a.title}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded capitalize"
                      style={{ backgroundColor: "rgba(31,57,109,0.08)", color: "rgba(31,57,109,0.55)" }}
                    >
                      {a.mediaType}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded capitalize"
                      style={{ backgroundColor: "rgba(31,57,109,0.08)", color: "rgba(31,57,109,0.55)" }}
                    >
                      {a.mediaType === "text"
                        ? "Rich Text"
                        : a.mediaType === "flashcard"
                        ? `${a.flashcards.filter((c) => c.text.trim()).length} card${a.flashcards.filter((c) => c.text.trim()).length !== 1 ? "s" : ""}`
                        : a.mediaSource === "upload" && a.mediaFile
                        ? a.mediaFile.name
                        : a.mediaSource === "embed" && a.embedUrl
                        ? "Embed"
                        : "No media"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(31,57,109,0.45)" }}>
                    <FileQuestion size={11} />
                    {a.questions.length} question{a.questions.length !== 1 ? "s" : ""}
                    {" · "}
                    {a.questions.map((q) => STATUS_LABEL[q.type]).join(", ")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Preview */}
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        style={{ border: "1px solid rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(31,57,109,0.2)")}
      >
        <Eye size={15} />
        Preview as Learner
      </button>

      {/* Save actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave("draft")}
          className="flex-1 py-3 rounded text-sm font-bold uppercase tracking-wide transition-opacity disabled:opacity-50"
          style={{
            border: "2px solid var(--color-primary)",
            color: "var(--color-primary)",
            fontFamily: "var(--font-heading)",
          }}
        >
          {saving ? "Saving…" : isEditMode ? "Update as Draft" : "Save as Draft"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave("published")}
          className="flex-1 py-3 rounded text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-accent)",
            fontFamily: "var(--font-heading)",
          }}
        >
          {saving ? "Saving…" : isEditMode ? "Update & Publish" : "Publish"}
        </button>
      </div>
    </div>

    <CoursePreviewModal
      preview={showPreview ? previewData : null}
      onClose={() => setShowPreview(false)}
    />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(31,57,109,0.45)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}
