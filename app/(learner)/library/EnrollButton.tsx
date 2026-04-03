"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Loader, CheckCircle, GraduationCap } from "lucide-react";
import { enrollCourse } from "./actions";

type State = "idle" | "loading" | "enrolled";

interface Props {
  courseId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
}

export default function EnrollButton({ courseId, title, description, coverUrl }: Props) {
  const [state, setState] = useState<State>("idle");

  async function handleEnroll() {
    setState("loading");
    await enrollCourse(courseId);
    setState("enrolled");
  }

  // ── Enrolled state ──────────────────────────────────────────
  if (state === "enrolled") {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-2xl border"
        style={{ borderColor: "rgba(45,138,78,0.25)", backgroundColor: "rgba(45,138,78,0.05)" }}
      >
        {/* Thumbnail */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: "rgba(45,138,78,0.1)" }}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--color-primary)" }}>
              {title}
            </p>
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: "rgba(45,138,78,0.12)", color: "var(--color-success)" }}
            >
              Enrolled
            </span>
          </div>
          <Link
            href="/learn"
            className="text-xs mt-0.5 font-medium flex items-center gap-1"
            style={{ color: "var(--color-accent)" }}
          >
            <GraduationCap size={11} />
            Go to My Learning to begin the Course
          </Link>
        </div>
      </div>
    );
  }

  // ── Idle / Loading state ────────────────────────────────────
  return (
    <button
      onClick={handleEnroll}
      disabled={state === "loading"}
      className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors active:scale-[0.98]"
      style={{ borderColor: "rgba(241,95,58,0.2)", backgroundColor: "rgba(241,95,58,0.04)" }}
    >
      {/* Thumbnail */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: "rgba(241,95,58,0.08)" }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <BookOpen size={20} style={{ color: "var(--color-accent)" }} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: "var(--color-primary)" }}>
          {title}
        </p>
        {description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "rgba(31,57,109,0.5)" }}>
            {description}
          </p>
        )}
      </div>

      {/* CTA */}
      {state === "loading" ? (
        <Loader size={16} className="animate-spin flex-shrink-0" style={{ color: "var(--color-accent)" }} />
      ) : (
        <span
          className="text-xs font-bold uppercase tracking-wide flex-shrink-0 px-2.5 py-1.5 rounded"
          style={{
            backgroundColor: "var(--color-accent)",
            color: "white",
            fontFamily: "var(--font-heading)",
          }}
        >
          Enroll
        </span>
      )}
    </button>
  );
}
