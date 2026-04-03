"use client";

import { useRef } from "react";
import { ImageIcon, X } from "lucide-react";
import type { WizardData, Location } from "./index";

interface Props {
  data: WizardData;
  locations: Location[];
  onChange: (patch: Partial<WizardData>) => void;
}

export default function StepDetails({ data, locations, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    onChange({ coverImageFile: file, coverImagePreviewUrl: previewUrl });
  }

  function removeCover() {
    if (data.coverImagePreviewUrl) URL.revokeObjectURL(data.coverImagePreviewUrl);
    onChange({ coverImageFile: null, coverImagePreviewUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleLocation(id: string) {
    const next = data.locationIds.includes(id)
      ? data.locationIds.filter((l) => l !== id)
      : [...data.locationIds, id];
    onChange({ locationIds: next });
  }

  function toggleAll() {
    const allSelected = locations.every((loc) => data.locationIds.includes(loc.id));
    onChange({ locationIds: allSelected ? [] : locations.map((loc) => loc.id) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Course Details
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          Basic information about this course
        </p>
      </div>

      {/* Title */}
      <Field label="Course Title" required>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Vehicle Inspection Procedures"
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
          style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
        />
      </Field>

      {/* Description */}
      <Field label="Description">
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What will employees learn in this course?"
          rows={3}
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none resize-none"
          style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
        />
      </Field>

      {/* Cover Image */}
      <Field label="Cover Image">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
        {data.coverImagePreviewUrl ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.coverImagePreviewUrl}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={removeCover}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors hover:border-accent"
            style={{ borderColor: "rgba(31,57,109,0.2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(31,57,109,0.2)")}
          >
            <ImageIcon size={20} style={{ color: "rgba(31,57,109,0.35)" }} />
            <span className="text-sm" style={{ color: "rgba(31,57,109,0.45)" }}>
              Click to upload cover image
            </span>
          </button>
        )}
      </Field>

      {/* Open Enrollment */}
      <Field label="Open Enrollment">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "rgba(31,57,109,0.65)" }}>
            Allow employees to self-enroll in this course
          </p>
          <Toggle
            value={data.openEnrollment}
            onChange={(v) => onChange({ openEnrollment: v })}
          />
        </div>
      </Field>

      {/* Locations */}
      <Field label="Location Access" required>
        <p className="text-xs mb-3" style={{ color: "rgba(31,57,109,0.5)" }}>
          Which locations can access this course?
        </p>
        {locations.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(31,57,109,0.4)" }}>
            No locations found. Add locations first.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Select All */}
            {(() => {
              const allSelected = locations.every((loc) => data.locationIds.includes(loc.id));
              return (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors w-full"
                  style={
                    allSelected
                      ? { borderColor: "var(--color-accent)", backgroundColor: "rgba(241,95,58,0.06)", color: "var(--color-primary)" }
                      : { borderColor: "rgba(31,57,109,0.15)", color: "rgba(31,57,109,0.65)" }
                  }
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border"
                    style={
                      allSelected
                        ? { backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)" }
                        : { borderColor: "rgba(31,57,109,0.25)" }
                    }
                  >
                    {allSelected && <Check size={10} color="white" />}
                  </span>
                  <span className="font-semibold">Select All</span>
                </button>
              );
            })()}
          <div className="grid grid-cols-2 gap-2">
            {locations.map((loc) => {
              const checked = data.locationIds.includes(loc.id);
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => toggleLocation(loc.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors"
                  style={
                    checked
                      ? {
                          borderColor: "var(--color-accent)",
                          backgroundColor: "rgba(241,95,58,0.06)",
                          color: "var(--color-primary)",
                        }
                      : {
                          borderColor: "rgba(31,57,109,0.15)",
                          color: "rgba(31,57,109,0.65)",
                        }
                  }
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border"
                    style={
                      checked
                        ? { backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)" }
                        : { borderColor: "rgba(31,57,109,0.25)" }
                    }
                  >
                    {checked && <Check size={10} color="white" />}
                  </span>
                  <span className="truncate font-medium">{loc.name}</span>
                  <span className="text-xs ml-auto flex-shrink-0" style={{ color: "rgba(31,57,109,0.4)" }}>
                    {loc.state}
                  </span>
                </button>
              );
            })}
          </div>
          </div>
        )}
      </Field>
    </div>
  );
}

// ─── Local helpers ────────────────────────────────────────────

import { Check } from "lucide-react";

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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: value ? "var(--color-accent)" : "rgba(31,57,109,0.2)" }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: value ? "1.25rem" : "0.25rem" }}
      />
    </button>
  );
}
