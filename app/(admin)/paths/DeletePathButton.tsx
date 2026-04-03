"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeletePathButton({
  pathId,
  pathTitle,
}: {
  pathId: string;
  pathTitle: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (typed !== "DELETE") return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("paths").delete().eq("id", pathId);
    router.refresh();
  }

  function handleClose() {
    setShowModal(false);
    setTyped("");
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title={`Delete "${pathTitle}"`}
        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
        style={{ color: "rgba(31,57,109,0.35)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.35)")}
      >
        <Trash2 size={14} />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={handleClose}
        >
          <div
            className="rounded-2xl w-full max-w-sm p-6 space-y-5"
            style={{ backgroundColor: "var(--color-white)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2
                  className="text-lg font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-error)" }}
                >
                  Delete Path
                </h2>
                <p className="text-sm" style={{ color: "rgba(31,57,109,0.6)" }}>
                  You&apos;re about to delete{" "}
                  <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
                    &ldquo;{pathTitle}&rdquo;
                  </span>
                  . This cannot be undone.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center"
                style={{ color: "rgba(31,57,109,0.4)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Type to confirm */}
            <div className="space-y-1.5">
              <label
                className="block text-xs font-semibold uppercase tracking-wide"
                style={{ color: "rgba(31,57,109,0.5)" }}
              >
                Type <span className="font-bold" style={{ color: "var(--color-error)" }}>DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="DELETE"
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none font-mono"
                style={{
                  borderColor: typed === "DELETE" ? "var(--color-error)" : "rgba(31,57,109,0.2)",
                  color: "var(--color-primary)",
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ border: "1px solid rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={typed !== "DELETE" || deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-35"
                style={{ backgroundColor: "var(--color-error)", fontFamily: "var(--font-heading)" }}
              >
                {deleting ? "Deleting…" : "Delete Path"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
