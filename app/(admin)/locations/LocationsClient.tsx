"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MapPin, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface Location {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

export default function LocationsClient({ initialLocations }: { initialLocations: Location[] }) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);

  function openCreate() { setEditing(null); setModal("create"); }
  function openEdit(loc: Location) { setEditing(loc); setModal("edit"); }
  function closeModal() { setModal(null); setEditing(null); }

  function handleSaved(loc: Location) {
    setLocations((prev) => {
      const exists = prev.find((l) => l.id === loc.id);
      return exists ? prev.map((l) => (l.id === loc.id ? loc : l)) : [loc, ...prev];
    });
    closeModal();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (!error) {
      setLocations((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
        >
          <Plus size={16} />
          New Location
        </button>
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-white)" }}>
        {locations.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
            >
              <MapPin size={24} style={{ color: "rgba(31,57,109,0.3)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{ color: "var(--color-primary)" }}>No locations yet</p>
              <p className="text-sm mt-1" style={{ color: "rgba(31,57,109,0.5)" }}>Add your carwash locations</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
            >
              <Plus size={16} />
              New Location
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
                {["Location", "State", "Added", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "rgba(31,57,109,0.45)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "rgba(31,57,109,0.05)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(31,57,109,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
                      >
                        <MapPin size={15} style={{ color: "var(--color-primary)" }} />
                      </div>
                      <span className="font-medium" style={{ color: "var(--color-primary)" }}>
                        {loc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                      style={{ backgroundColor: "rgba(31,57,109,0.08)", color: "var(--color-primary)" }}
                    >
                      {loc.state}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: "rgba(31,57,109,0.45)" }}>
                    {new Date(loc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <IconBtn icon={<Pencil size={14} />} title="Edit" onClick={() => openEdit(loc)} />
                      <DeleteConfirm name={loc.name} onConfirm={() => handleDelete(loc.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <LocationModal
          location={editing}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

// ─── Location modal ───────────────────────────────────────────

function LocationModal({
  location,
  onClose,
  onSaved,
}: {
  location: Location | null;
  onClose: () => void;
  onSaved: (loc: Location) => void;
}) {
  const [name, setName] = useState(location?.name ?? "");
  const [state, setState] = useState(location?.state ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !state.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    if (location) {
      const { data, error: err } = await supabase
        .from("locations")
        .update({ name: name.trim(), state: state.trim().toUpperCase() })
        .eq("id", location.id)
        .select()
        .single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      onSaved(data);
    } else {
      const { data, error: err } = await supabase
        .from("locations")
        .insert({ name: name.trim(), state: state.trim().toUpperCase() })
        .select()
        .single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      onSaved(data);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm p-6 space-y-5"
        style={{ backgroundColor: "var(--color-white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-lg font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            {location ? "Edit Location" : "New Location"}
          </h2>
          <button onClick={onClose} style={{ color: "rgba(31,57,109,0.4)" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
              Location Name <span style={{ color: "var(--color-accent)" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Murray Highlands"
              required
              className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
              style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
              State <span style={{ color: "var(--color-accent)" }}>*</span>
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value.slice(0, 2))}
              placeholder="UT"
              required
              maxLength={2}
              className="w-24 px-4 py-3 rounded-lg border text-sm outline-none uppercase"
              style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
            />
            <p className="text-xs" style={{ color: "rgba(31,57,109,0.4)" }}>2-letter abbreviation (e.g. UT, PA, MD)</p>
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: "1px solid rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
            >
              {saving ? "Saving…" : location ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function IconBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center transition-colors"
      style={{ color: "rgba(31,57,109,0.35)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.35)")}
    >
      {icon}
    </button>
  );
}

function DeleteConfirm({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={onConfirm}
          className="text-xs px-2 py-1 rounded font-medium text-white"
          style={{ backgroundColor: "var(--color-error)" }}
        >
          Delete
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs px-2 py-1 rounded"
          style={{ color: "rgba(31,57,109,0.5)", border: "1px solid rgba(31,57,109,0.15)" }}
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setOpen(true)}
      title={`Delete ${name}`}
      className="w-7 h-7 rounded flex items-center justify-center transition-colors"
      style={{ color: "rgba(31,57,109,0.35)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(31,57,109,0.35)")}
    >
      <Trash2 size={14} />
    </button>
  );
}
