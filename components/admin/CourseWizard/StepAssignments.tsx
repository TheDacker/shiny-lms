"use client";

import { useRef, useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, Link, Check } from "lucide-react";
import type { WizardAssignment, WizardQuestion, FlashcardItem } from "./index";

// ─── Types ────────────────────────────────────────────────────

const MEDIA_TYPES = [
  { value: "video",     label: "Video" },
  { value: "audio",     label: "Audio" },
  { value: "text",      label: "Text" },
  { value: "flashcard", label: "Flashcard" },
] as const;

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false",      label: "True / False" },
  { value: "fill_blank",      label: "Fill in the Blank" },
] as const;

// ─── Main component ───────────────────────────────────────────

interface Props {
  assignments: WizardAssignment[];
  onChange: (assignments: WizardAssignment[]) => void;
}

export default function StepAssignments({ assignments, onChange }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(assignments.map((a) => [a.localId, true]))
  );

  function updateAssignment(id: string, patch: Partial<WizardAssignment>) {
    onChange(assignments.map((a) => (a.localId === id ? { ...a, ...patch } : a)));
  }

  function removeAssignment(id: string) {
    onChange(assignments.filter((a) => a.localId !== id));
  }

  function addAssignment() {
    const newId = crypto.randomUUID();
    const next: WizardAssignment = {
      localId: newId,
      title: "",
      mediaType: "video",
      mediaSource: "upload",
      mediaFile: null,
      mediaPreviewUrl: "",
      embedUrl: "",
      textContent: "",
      flashcards: [{ text: "", large: true }],
      questions: [emptyQuestion()],
    };
    onChange([...assignments, next]);
    setExpanded((prev) => ({ ...prev, [newId]: true }));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Assignments
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          Add media and questions for each assignment
        </p>
      </div>

      <div className="space-y-3">
        {assignments.map((a, i) => (
          <AssignmentCard
            key={a.localId}
            assignment={a}
            index={i}
            expanded={!!expanded[a.localId]}
            onToggle={() => toggleExpand(a.localId)}
            onChange={(patch) => updateAssignment(a.localId, patch)}
            onRemove={() => removeAssignment(a.localId)}
            canRemove={assignments.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addAssignment}
        className="w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
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
        Add Assignment
      </button>
    </div>
  );
}

// ─── Assignment card ──────────────────────────────────────────

function AssignmentCard({
  assignment: a,
  index,
  expanded,
  onToggle,
  onChange,
  onRemove,
  canRemove,
}: {
  assignment: WizardAssignment;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<WizardAssignment>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleMediaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    onChange({ mediaFile: file, mediaPreviewUrl: previewUrl });
  }

  function updateQuestion(qId: string, patch: Partial<WizardQuestion>) {
    onChange({
      questions: a.questions.map((q) =>
        q.localId === qId ? { ...q, ...patch } : q
      ),
    });
  }

  function removeQuestion(qId: string) {
    onChange({ questions: a.questions.filter((q) => q.localId !== qId) });
  }

  function addQuestion() {
    onChange({ questions: [...a.questions, emptyQuestion()] });
  }

  const acceptMap: Record<string, string> = {
    video: "video/*",
    audio: "audio/*",
    text: ".pdf,.doc,.docx,.txt",
    flashcard: ".pdf,.pptx",
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "rgba(31,57,109,0.12)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ backgroundColor: "rgba(31,57,109,0.03)" }}
        onClick={onToggle}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {index + 1}
        </span>
        <span
          className="flex-1 text-sm font-medium truncate"
          style={{ color: a.title ? "var(--color-primary)" : "rgba(31,57,109,0.35)" }}
        >
          {a.title || "Untitled assignment"}
        </span>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1 rounded transition-colors"
              style={{ color: "rgba(31,57,109,0.3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.3)")}
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? (
            <ChevronUp size={16} style={{ color: "rgba(31,57,109,0.4)" }} />
          ) : (
            <ChevronDown size={16} style={{ color: "rgba(31,57,109,0.4)" }} />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={a.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Assignment title"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
          />

          {/* Media type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(31,57,109,0.5)" }}>
              Media Type
            </label>
            <div className="flex gap-1.5">
              {MEDIA_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ mediaType: value })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={
                    a.mediaType === value
                      ? { backgroundColor: "var(--color-primary)", color: "white" }
                      : { backgroundColor: "rgba(31,57,109,0.07)", color: "rgba(31,57,109,0.6)" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Media source — video & audio only */}
          {(a.mediaType === "video" || a.mediaType === "audio") && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(31,57,109,0.5)" }}>
                Media Source
              </label>
              <div className="flex gap-1.5">
                {(["upload", "embed"] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => onChange({ mediaSource: src })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={
                      a.mediaSource === src
                        ? { backgroundColor: "var(--color-primary)", color: "white" }
                        : { backgroundColor: "rgba(31,57,109,0.07)", color: "rgba(31,57,109,0.6)" }
                    }
                  >
                    {src === "upload" ? <Upload size={12} /> : <Link size={12} />}
                    {src === "upload" ? "Upload File" : "Embed URL"}
                  </button>
                ))}
              </div>

              {a.mediaSource === "upload" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptMap[a.mediaType]}
                    className="hidden"
                    onChange={handleMediaFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-lg border border-dashed text-sm transition-colors"
                    style={{
                      borderColor: a.mediaFile ? "var(--color-success)" : "rgba(31,57,109,0.2)",
                      color: a.mediaFile ? "var(--color-success)" : "rgba(31,57,109,0.45)",
                    }}
                  >
                    {a.mediaFile
                    ? `✓ ${a.mediaFile.name}`
                    : a.mediaPreviewUrl
                    ? "✓ Existing file (click to replace)"
                    : `Choose ${a.mediaType} file`}
                  </button>
                </div>
              ) : (
                <input
                  type="url"
                  value={a.embedUrl}
                  onChange={(e) => onChange({ embedUrl: e.target.value })}
                  placeholder="https://youtube.com/embed/..."
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
                />
              )}
            </div>
          )}

          {/* Text WYSIWYG editor */}
          {a.mediaType === "text" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(31,57,109,0.5)" }}>
                Content
              </label>
              <SimpleWysiwyg
                value={a.textContent}
                onChange={(html) => onChange({ textContent: html })}
              />
            </div>
          )}

          {/* Flashcard editor */}
          {a.mediaType === "flashcard" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(31,57,109,0.5)" }}>
                Flashcards
              </label>
              <FlashcardEditor
                cards={a.flashcards}
                onChange={(flashcards) => onChange({ flashcards })}
              />
            </div>
          )}

          {/* Questions */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(31,57,109,0.5)" }}>
                Questions ({a.questions.length})
              </label>
            </div>

            {a.questions.map((q, qi) => (
              <QuestionEditor
                key={q.localId}
                question={q}
                index={qi}
                onChange={(patch) => updateQuestion(q.localId, patch)}
                onRemove={() => removeQuestion(q.localId)}
                canRemove={a.questions.length > 1}
              />
            ))}

            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: "rgba(31,57,109,0.45)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.45)")}
            >
              <Plus size={14} />
              Add Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Question editor ──────────────────────────────────────────

function QuestionEditor({
  question: q,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  question: WizardQuestion;
  index: number;
  onChange: (patch: Partial<WizardQuestion>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  function handleTypeChange(type: WizardQuestion["type"]) {
    const defaults: Partial<WizardQuestion> = { type, correctAnswer: "" };
    if (type === "multiple_choice") defaults.options = ["", "", "", ""];
    else if (type === "true_false") defaults.options = ["True", "False"];
    else defaults.options = [];
    onChange(defaults);
  }

  return (
    <div
      className="rounded-lg p-3 space-y-3"
      style={{ backgroundColor: "rgba(31,57,109,0.03)", border: "1px solid rgba(31,57,109,0.08)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "rgba(31,57,109,0.4)" }}>
          Q{index + 1}
        </span>
        <div className="flex gap-1 flex-1">
          {QUESTION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeChange(value)}
              className="px-2 py-1 rounded text-xs font-medium transition-colors"
              style={
                q.type === value
                  ? { backgroundColor: "var(--color-accent)", color: "white" }
                  : { backgroundColor: "rgba(31,57,109,0.07)", color: "rgba(31,57,109,0.55)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{ color: "rgba(31,57,109,0.3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.3)")}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Prompt */}
      <input
        type="text"
        value={q.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        placeholder={q.type === "fill_blank" ? "The ___ is checked daily." : "Question prompt"}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ borderColor: "rgba(31,57,109,0.15)", color: "var(--color-primary)", backgroundColor: "white" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.15)")}
      />

      {/* Multiple choice options */}
      {q.type === "multiple_choice" && (
        <div className="space-y-1.5">
          {q.options.map((opt, i) => {
            // Only keep valid numeric indices — filters out any corrupt legacy text
            const selectedIndices = (q.correctAnswer ?? "")
              .split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
            const isSelected = selectedIndices.includes(String(i));
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(selectedIndices);
                    next.has(String(i)) ? next.delete(String(i)) : next.add(String(i));
                    onChange({ correctAnswer: [...next].join(",") });
                  }}
                  className="w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: isSelected ? "var(--color-accent)" : "rgba(31,57,109,0.25)",
                    backgroundColor: isSelected ? "var(--color-accent)" : "transparent",
                  }}
                >
                  {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                </button>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const options = [...q.options];
                    options[i] = e.target.value;
                    onChange({ options });
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-2.5 py-1.5 rounded border text-xs outline-none"
                  style={{ borderColor: "rgba(31,57,109,0.15)", color: "var(--color-primary)", backgroundColor: "white" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.15)")}
                />
              </div>
            );
          })}
          <p className="text-xs" style={{ color: "rgba(31,57,109,0.4)" }}>
            Check one or more boxes to mark correct answer(s)
          </p>
        </div>
      )}

      {/* True / False */}
      {q.type === "true_false" && (
        <div className="flex gap-3">
          {["True", "False"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ correctAnswer: opt })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                q.correctAnswer === opt
                  ? { backgroundColor: "var(--color-accent)", color: "white" }
                  : { backgroundColor: "rgba(31,57,109,0.07)", color: "rgba(31,57,109,0.6)" }
              }
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Fill in the blank */}
      {q.type === "fill_blank" && (
        <input
          type="text"
          value={q.correctAnswer}
          onChange={(e) => onChange({ correctAnswer: e.target.value })}
          placeholder="Correct answer"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: "rgba(31,57,109,0.15)", color: "var(--color-primary)", backgroundColor: "white" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.15)")}
        />
      )}
    </div>
  );
}

// ─── Simple WYSIWYG ───────────────────────────────────────────

function SimpleWysiwyg({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Uncontrolled: set innerHTML only on mount to avoid resetting cursor on re-render
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string, insertHtml?: string) {
    if (insertHtml !== undefined) {
      document.execCommand("insertHTML", false, insertHtml);
    } else {
      document.execCommand(cmd, false, undefined);
    }
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  }

  const toolBtn = (label: React.ReactNode, cmd: string, insertHtml?: string) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, insertHtml); }}
      className="px-2 py-1 rounded text-xs font-semibold transition-colors"
      style={{ color: "rgba(31,57,109,0.6)", backgroundColor: "rgba(31,57,109,0.07)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(31,57,109,0.14)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(31,57,109,0.07)")}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(31,57,109,0.2)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 border-b"
        style={{ borderColor: "rgba(31,57,109,0.1)", backgroundColor: "rgba(31,57,109,0.02)" }}
      >
        {toolBtn(<strong>B</strong>, "bold")}
        {toolBtn(<em>I</em>, "italic")}
        {toolBtn(<span style={{ textDecoration: "underline" }}>U</span>, "underline")}
      </div>

      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        className="min-h-40 p-3 outline-none text-sm"
        style={{ color: "var(--color-primary)", lineHeight: "1.6" }}
      />
    </div>
  );
}

// ─── Auto-resize textarea (for flashcard slides) ─────────────

function AutoResizeTextarea({ value, large, onChange }: { value: string; large: boolean; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value, large]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type card text…"
      className="resize-none outline-none text-center bg-transparent font-bold w-full overflow-hidden"
      style={{
        color: "white",
        fontSize: large ? "clamp(26px, 4vw, 48px)" : "clamp(16px, 2.5vw, 26px)",
        lineHeight: "1.4",
        caretColor: "white",
      }}
    />
  );
}

// ─── Flashcard editor ─────────────────────────────────────────

function FlashcardEditor({ cards, onChange }: { cards: FlashcardItem[]; onChange: (cards: FlashcardItem[]) => void }) {
  function update(i: number, patch: Partial<FlashcardItem>) {
    const next = cards.map((c, j) => j === i ? { ...c, ...patch } : c);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {cards.map((card, i) => (
        <div key={i} className="space-y-1.5">
          {/* Toolbar row above slide */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => update(i, { large: !card.large })}
              className="px-2 py-1 rounded text-xs font-semibold transition-colors"
              style={
                card.large
                  ? { backgroundColor: "var(--color-primary)", color: "white" }
                  : { backgroundColor: "rgba(31,57,109,0.07)", color: "rgba(31,57,109,0.6)" }
              }
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = card.large ? "var(--color-primary)" : "rgba(31,57,109,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = card.large ? "var(--color-primary)" : "rgba(31,57,109,0.07)")}
            >
              A<span style={{ fontSize: "0.65em", verticalAlign: "super" }}>+</span> Large
            </button>
            <span className="text-xs font-semibold" style={{ color: "rgba(31,57,109,0.4)" }}>
              Card {i + 1}
            </span>
          </div>

          {/* Slide preview */}
          <div
            className="rounded-xl flex items-center justify-center"
            style={{ aspectRatio: "16 / 7", backgroundColor: "var(--color-primary)", padding: "24px" }}
          >
            <AutoResizeTextarea
              value={card.text}
              large={card.large}
              onChange={(v) => update(i, { text: v })}
            />
          </div>

          {/* Card footer: delete */}
          {cards.length > 1 && (
            <div className="flex justify-end px-1">
              <button
                type="button"
                onClick={() => onChange(cards.filter((_, j) => j !== i))}
                style={{ color: "rgba(31,57,109,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.3)")}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...cards, { text: "", large: true }])}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: "rgba(31,57,109,0.45)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.45)")}
      >
        <Plus size={14} />
        Add Card
      </button>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────

function emptyQuestion(): WizardQuestion {
  return {
    localId: crypto.randomUUID(),
    type: "multiple_choice",
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: "",
  };
}
