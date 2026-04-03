"use client";

import { X, BookOpen, ChevronRight } from "lucide-react";

export interface CoursePreviewData {
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  assignments: Array<{ title: string; mediaType: string }>;
}

interface Props {
  preview: CoursePreviewData | null;
  onClose: () => void;
}

const MEDIA_LABELS: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  text: "Text",
  flashcard: "Flashcard",
};

export default function CoursePreviewModal({ preview, onClose }: Props) {
  if (!preview) return null;

  const total = preview.assignments.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      {/* Phone-frame container */}
      <div
        className="relative flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "90vh",
          backgroundColor: "var(--color-bg, #f5f6f8)",
          border: "8px solid rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview banner */}
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ backgroundColor: "rgba(212,147,13,0.12)", borderBottom: "1px solid rgba(212,147,13,0.25)" }}
        >
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(150,100,0,0.8)" }}>
            Learner Preview
          </span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full"
            style={{ color: "rgba(150,100,0,0.7)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable learner view */}
        <div className="flex-1 overflow-y-auto">
          {/* Course header — matches learner page exactly */}
          <div
            className="px-5 pt-10 pb-5"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {preview.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.coverImageUrl}
                alt={preview.title}
                className="w-full h-32 object-cover rounded-xl mb-4 opacity-80"
              />
            )}
            <h1
              className="text-xl font-bold uppercase tracking-wide text-white leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {preview.title || "Untitled Course"}
            </h1>
            {preview.description && (
              <p className="text-white/60 text-xs mt-1 line-clamp-2">
                {preview.description}
              </p>
            )}
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Progress bar */}
            {total > 0 && (
              <div className="space-y-1.5">
                <div
                  className="flex justify-between text-xs"
                  style={{ color: "rgba(31,57,109,0.5)" }}
                >
                  <span>0 of {total} complete</span>
                  <span>0%</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "rgba(31,57,109,0.1)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: "0%", backgroundColor: "var(--color-accent)" }}
                  />
                </div>
              </div>
            )}

            {/* Assignments */}
            {total === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <BookOpen size={28} style={{ color: "rgba(31,57,109,0.25)" }} />
                <p className="text-sm" style={{ color: "rgba(31,57,109,0.45)" }}>
                  No assignments yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {preview.assignments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-2xl border"
                    style={{
                      borderColor: "rgba(31,57,109,0.1)",
                      backgroundColor: "transparent",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
                    >
                      <BookOpen size={18} style={{ color: "rgba(31,57,109,0.4)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {a.title || `Assignment ${i + 1}`}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(31,57,109,0.45)" }}
                      >
                        {MEDIA_LABELS[a.mediaType] ?? a.mediaType}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: "rgba(31,57,109,0.3)", flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
