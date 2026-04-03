"use client";

import { useState, useMemo } from "react";
import DOMPurify from "dompurify";

function SanitizedHtml({ html }: { html: string }) {
  const sanitized = useMemo(() => DOMPurify.sanitize(html), [html]);
  return (
    <div
      className="rounded-2xl p-5 text-sm leading-relaxed"
      style={{
        backgroundColor: "rgba(31,57,109,0.03)",
        border: "1px solid rgba(31,57,109,0.08)",
        color: "var(--color-primary)",
      }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
import { useRouter } from "next/navigation";
import { CheckCircle, ChevronLeft, ChevronRight, Trophy, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────

export interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank";
  prompt: string;
  options: string[] | null;
  correct_answer: string;
  order: number;
}

export interface Assignment {
  id: string;
  title: string;
  media_type: "video" | "audio" | "text" | "flashcard";
  media_url: string | null;
  embed_url: string | null;
}

interface Props {
  assignment: Assignment;
  questions: Question[];
  alreadyCompleted: boolean;
  userId: string;
}

type Phase = "media" | "quiz" | "done";

// ─── Main ─────────────────────────────────────────────────────

export default function AssignmentPlayer({
  assignment,
  questions,
  alreadyCompleted,
  userId,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(alreadyCompleted ? "done" : "media");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());

  const hasQuestions = questions.length > 0;

  async function handleSubmit() {
    setSaving(true);
    const supabase = createClient();

    // Score: count exact-match correct answers (case-insensitive for fill_blank)
    let correct = 0;
    const wrong = new Set<string>();
    for (const q of questions) {
      let ans: string;
      let ca: string;
      if (q.type === "multiple_choice") {
        const parseSelections = (s: string): string[] => {
          try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr; } catch {}
          return s ? [s] : [];
        };
        const opts = q.options ?? [];
        const rawParts = (q.correct_answer ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const allIndices = rawParts.length > 0 && rawParts.every((p) => /^\d+$/.test(p));
        if (allIndices) {
          // Index-based: map 0-based indices → option texts
          ca = rawParts.map((idx) => (opts[Number(idx)] ?? "").trim().toLowerCase()).filter(Boolean).sort().join("|");
        } else {
          // Legacy: correct_answer is the option text itself (may contain commas)
          ca = (q.correct_answer ?? "").trim().toLowerCase();
        }
        ans = parseSelections(answers[q.id] ?? "")
          .map((x: string) => x.trim().toLowerCase())
          .sort()
          .join("|");
      } else {
        ans = (answers[q.id] ?? "").trim().toLowerCase();
        ca = (q.correct_answer ?? "").trim().toLowerCase();
      }
      if (ans === ca) {
        correct++;
      } else {
        wrong.add(q.id);
      }
    }
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;

    await supabase.from("progress").upsert(
      {
        user_id: userId,
        assignment_id: assignment.id,
        completed: true,
        score,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,assignment_id" }
    );

    setFinalScore(score);
    setWrongIds(wrong);
    setPhase("done");
    setSaving(false);
  }

  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 flex items-start gap-3"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <button
          onClick={() => router.back()}
          className="mt-0.5 flex-shrink-0"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0">
          <h1
            className="text-xl font-bold uppercase tracking-wide text-white leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {assignment.title}
          </h1>
          <p className="text-white/50 text-xs mt-0.5 capitalize">
            {assignment.media_type}
            {hasQuestions ? ` · ${questions.length} question${questions.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-6">
        {/* ── MEDIA PHASE ── */}
        {phase === "media" && (
          <>
            <MediaPlayer assignment={assignment} />
            <button
              onClick={() => hasQuestions ? setPhase("quiz") : handleSubmit()}
              className="w-full py-4 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-opacity active:opacity-80"
              style={{
                backgroundColor: "var(--color-accent)",
                fontFamily: "var(--font-heading)",
              }}
            >
              {hasQuestions ? "Continue to Questions" : "Mark Complete"}
            </button>
          </>
        )}

        {/* ── QUIZ PHASE ── */}
        {phase === "quiz" && (
          <>
            <div className="space-y-5">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  answer={answers[q.id] ?? ""}
                  onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                />
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving || questions.some((q) => {
                const a = answers[q.id] ?? "";
                if (q.type === "multiple_choice") {
                  try { const arr = JSON.parse(a); return !Array.isArray(arr) || arr.length === 0; } catch { return !a; }
                }
                return !a;
              })}
              className="w-full py-4 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-40 active:opacity-80"
              style={{
                backgroundColor: "var(--color-accent)",
                fontFamily: "var(--font-heading)",
              }}
            >
              {saving ? "Saving…" : "Submit Answers"}
            </button>
          </>
        )}

        {/* ── DONE PHASE ── */}
        {phase === "done" && (
          <DoneScreen
            score={finalScore ?? (alreadyCompleted ? null : 100)}
            total={questions.length}
            questions={questions}
            answers={answers}
            wrongIds={wrongIds}
            alreadyCompleted={alreadyCompleted}
            onRetry={() => {
              setAnswers({});
              setWrongIds(new Set());
              setFinalScore(null);
              setPhase("quiz");
            }}
            onRetake={() => {
              setAnswers({});
              setWrongIds(new Set());
              setFinalScore(null);
              setPhase("media");
            }}
            onBack={() => router.back()}
          />
        )}
      </div>
    </div>
  );
}

// ─── Media Player ─────────────────────────────────────────────

function MediaPlayer({ assignment }: { assignment: Assignment }) {
  const { media_type, media_url, embed_url } = assignment;

  if (media_type === "video") {
    if (embed_url) {
      return (
        <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={embed_url}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }
    if (media_url) {
      return (
        <video
          src={media_url}
          controls
          className="w-full rounded-2xl"
          style={{ maxHeight: "280px", backgroundColor: "#000" }}
        />
      );
    }
  }

  if (media_type === "audio") {
    if (media_url || embed_url) {
      return (
        <div
          className="rounded-2xl p-6 flex flex-col items-center gap-4"
          style={{ backgroundColor: "rgba(31,57,109,0.05)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(31,57,109,0.1)" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(31,57,109,0.5)" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <audio src={media_url ?? embed_url ?? ""} controls className="w-full" />
        </div>
      );
    }
  }

  if (media_type === "text") {
    // embed_url holds the WYSIWYG HTML content — sanitized before render
    if (embed_url) {
      return <SanitizedHtml html={embed_url} />;
    }
    if (media_url) {
      const isPdf = media_url.toLowerCase().includes(".pdf");
      if (isPdf) {
        return (
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(31,57,109,0.1)", height: "400px" }}>
            <iframe src={media_url} className="w-full h-full" />
          </div>
        );
      }
      return (
        <a
          href={media_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl border transition-colors"
          style={{ borderColor: "rgba(31,57,109,0.12)", color: "var(--color-primary)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(31,57,109,0.08)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">Open Document</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(31,57,109,0.5)" }}>Tap to view in browser</p>
          </div>
        </a>
      );
    }
  }

  if (media_type === "flashcard") {
    // embed_url holds JSON: { text: string; large: boolean }[]
    if (embed_url) {
      try {
        const cards = JSON.parse(embed_url) as { text: string; large: boolean }[];
        if (cards.length > 0) return <FlashcardViewer cards={cards} />;
      } catch {
        // fall through to no media
      }
    }
  }

  // No media fallback
  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
      style={{ backgroundColor: "rgba(31,57,109,0.05)" }}
    >
      <p className="text-sm font-medium" style={{ color: "rgba(31,57,109,0.45)" }}>
        No media attached to this assignment
      </p>
    </div>
  );
}

// ─── Flashcard Viewer ─────────────────────────────────────────

function FlashcardViewer({ cards }: { cards: { text: string; large: boolean }[] }) {
  const [current, setCurrent] = useState(0);
  const card = cards[current];

  return (
    <div className="space-y-3">
      {/* Slide */}
      <div
        className="rounded-2xl flex items-center justify-center px-6"
        style={{ aspectRatio: "16/7", backgroundColor: "var(--color-primary)" }}
      >
        <p
          className="text-white font-bold text-center"
          style={{
            fontSize: card.large ? "clamp(22px, 5vw, 40px)" : "clamp(14px, 2.5vw, 22px)",
            lineHeight: 1.4,
          }}
        >
          {card.text}
        </p>
      </div>

      {/* Navigation row */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-25"
          style={{ backgroundColor: "rgba(31,57,109,0.08)", color: "var(--color-primary)" }}
        >
          <ChevronLeft size={20} />
        </button>

        <span className="text-sm font-semibold" style={{ color: "rgba(31,57,109,0.45)" }}>
          {current + 1} / {cards.length}
        </span>

        <button
          type="button"
          onClick={() => setCurrent((c) => Math.min(cards.length - 1, c + 1))}
          disabled={current === cards.length - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-25"
          style={{ backgroundColor: "rgba(31,57,109,0.08)", color: "var(--color-primary)" }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Dot indicators */}
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all"
              style={{
                height: 6,
                width: i === current ? 20 : 6,
                backgroundColor: i === current ? "var(--color-primary)" : "rgba(31,57,109,0.2)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────

function QuestionCard({
  question: q,
  index,
  answer,
  onChange,
}: {
  question: Question;
  index: number;
  answer: string;
  onChange: (val: string) => void;
}) {
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ border: "1px solid rgba(31,57,109,0.1)" }}
    >
      <div className="flex gap-2">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white mt-0.5"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {index + 1}
        </span>
        <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
          {q.prompt}
        </p>
      </div>

      {/* Multiple Choice */}
      {q.type === "multiple_choice" && (
        <div className="space-y-2 pl-7">
          <p className="text-xs font-medium" style={{ color: "rgba(31,57,109,0.5)" }}>
            Select all that apply.
          </p>
          {(q.options ?? []).map((opt, i) => {
            const current: string[] = (() => { try { const a = JSON.parse(answer); return Array.isArray(a) ? a : []; } catch { return answer ? [answer] : []; } })();
            const selected = current.includes(opt);
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const next = selected ? current.filter((s) => s !== opt) : [...current, opt];
                  onChange(JSON.stringify(next));
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-colors"
                style={
                  selected
                    ? { backgroundColor: "var(--color-primary)", color: "white" }
                    : { backgroundColor: "rgba(31,57,109,0.05)", color: "var(--color-primary)", border: "1px solid rgba(31,57,109,0.1)" }
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* True / False */}
      {q.type === "true_false" && (
        <div className="flex gap-3 pl-7">
          {["True", "False"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={
                answer === opt
                  ? { backgroundColor: "var(--color-primary)", color: "white" }
                  : { backgroundColor: "rgba(31,57,109,0.05)", color: "var(--color-primary)", border: "1px solid rgba(31,57,109,0.1)" }
              }
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Fill in the Blank */}
      {q.type === "fill_blank" && (
        <div className="pl-7">
          <input
            type="text"
            value={answer}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer…"
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: "rgba(31,57,109,0.15)", color: "var(--color-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.15)")}
          />
        </div>
      )}
    </div>
  );
}

// ─── Done Screen ──────────────────────────────────────────────

function DoneScreen({
  score,
  total,
  questions,
  answers,
  wrongIds,
  alreadyCompleted,
  onRetry,
  onRetake,
  onBack,
}: {
  score: number | null;
  total: number;
  questions: Question[];
  answers: Record<string, string>;
  wrongIds: Set<string>;
  alreadyCompleted: boolean;
  onRetry: () => void;
  onRetake: () => void;
  onBack: () => void;
}) {
  const passed = score === null || score >= 70;

  return (
    <div className="space-y-5">
      {/* Score card */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
        style={{
          backgroundColor: passed ? "rgba(45,138,78,0.06)" : "rgba(201,59,59,0.06)",
          border: `1px solid ${passed ? "rgba(45,138,78,0.15)" : "rgba(201,59,59,0.15)"}`,
        }}
      >
        {alreadyCompleted && score === null ? (
          <>
            <CheckCircle size={40} style={{ color: "var(--color-success)" }} />
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--color-success)", fontFamily: "var(--font-heading)" }}>
                Already Completed
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(31,57,109,0.55)" }}>
                You&apos;ve finished this assignment
              </p>
            </div>
          </>
        ) : (
          <>
            <Trophy size={40} style={{ color: passed ? "var(--color-success)" : "var(--color-error)" }} />
            {score !== null && total > 0 && (
              <p className="text-4xl font-bold" style={{ color: passed ? "var(--color-success)" : "var(--color-error)", fontFamily: "var(--font-heading)" }}>
                {score}%
              </p>
            )}
            <div>
              <p className="text-lg font-bold" style={{ color: passed ? "var(--color-success)" : "var(--color-error)", fontFamily: "var(--font-heading)" }}>
                {total === 0 ? "Completed!" : passed ? "Well Done!" : "Keep Practicing"}
              </p>
              {total > 0 && (
                <p className="text-sm mt-1" style={{ color: "rgba(31,57,109,0.55)" }}>
                  {Math.round(((score ?? 0) / 100) * total)} of {total} correct
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Review wrong answers */}
      {wrongIds.size > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(31,57,109,0.45)" }}>
            Review
          </p>
          {questions.filter((q) => wrongIds.has(q.id)).map((q, i) => {
            let yourAnswerDisplay: string;
            let correctDisplay: string;
            if (q.type === "multiple_choice") {
              const opts = q.options ?? [];
              // Your answer: JSON array of option texts → join as text
              try {
                const arr: string[] = JSON.parse(answers[q.id] ?? "");
                yourAnswerDisplay = Array.isArray(arr) && arr.length > 0 ? arr.join(", ") : "—";
              } catch { yourAnswerDisplay = "—"; }
              // Correct: detect index-based vs legacy text
              const rawParts = (q.correct_answer ?? "").split(",").map((s) => s.trim()).filter(Boolean);
              const allIndices = rawParts.length > 0 && rawParts.every((p) => /^\d+$/.test(p));
              if (allIndices) {
                const correctTexts = rawParts
                  .slice()
                  .sort((a, b) => Number(a) - Number(b))
                  .map((idx) => opts[Number(idx)])
                  .filter(Boolean) as string[];
                correctDisplay = correctTexts.length > 0 ? correctTexts.join(", ") : "—";
              } else {
                correctDisplay = q.correct_answer ?? "—";
              }
            } else {
              yourAnswerDisplay = answers[q.id] || "—";
              correctDisplay = q.correct_answer;
            }
            return (
            <div
              key={q.id}
              className="rounded-2xl p-4 space-y-2"
              style={{ backgroundColor: "rgba(201,59,59,0.04)", border: "1px solid rgba(201,59,59,0.12)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>{q.prompt}</p>
              <p className="text-xs" style={{ color: "var(--color-error)" }}>
                Your answer: {yourAnswerDisplay}
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--color-success)" }}>
                Correct: {correctDisplay}
              </p>
            </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!alreadyCompleted && wrongIds.size > 0 && (
          <button
            onClick={onRetry}
            className="w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-opacity active:opacity-80"
            style={{
              border: "1.5px solid rgba(31,57,109,0.2)",
              color: "var(--color-primary)",
              fontFamily: "var(--font-heading)",
            }}
          >
            <RotateCcw size={15} />
            Try Again
          </button>
        )}
        <button
          onClick={onRetake}
          className="w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-opacity active:opacity-80"
          style={{
            border: "1.5px solid rgba(31,57,109,0.2)",
            color: "var(--color-primary)",
            fontFamily: "var(--font-heading)",
          }}
        >
          <RotateCcw size={15} />
          Retake
        </button>
        <button
          onClick={onBack}
          className="w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wide text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: "var(--color-primary)", fontFamily: "var(--font-heading)" }}
        >
          Back to Assignments
        </button>
      </div>
    </div>
  );
}
