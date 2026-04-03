"use client";

import { useRef, useState } from "react";
import { X, Upload, CheckCircle, XCircle } from "lucide-react";

interface Location {
  id: string;
  name: string;
  state: string;
}

interface CsvRow {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  location_name?: string;
  // resolved
  location_id?: string;
  // status after import
  status?: "pending" | "success" | "error";
  errorMsg?: string;
}

interface Props {
  locations: Location[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CsvImportModal({ locations, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  // Build a location name → id map (case-insensitive)
  const locationMap = Object.fromEntries(
    locations.map((l) => [l.name.toLowerCase(), l.id])
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setRows([]);
    setDone(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseCsv(text, locationMap);
        setRows(parsed);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to parse CSV.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);

    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      updated[i] = { ...row, status: "pending" };
      setRows([...updated]);

      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone ?? "",
          role: "learner",
          location_id: row.location_id ?? "",
        }),
      });

      const data = await res.json();
      updated[i] = {
        ...row,
        status: res.ok ? "success" : "error",
        errorMsg: res.ok ? undefined : data.error,
      };
      setRows([...updated]);
    }

    setImporting(false);
    setDone(true);
    onSuccess();
  }

  const validRows = rows.filter((r) => !r.errorMsg);
  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            className="text-lg font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            CSV Import
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "rgba(31,57,109,0.4)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Format hint */}
        <div className="rounded-lg p-3 text-xs space-y-1" style={{ backgroundColor: "rgba(31,57,109,0.04)", color: "rgba(31,57,109,0.6)" }}>
          <p className="font-semibold">Required columns: <span className="font-mono">first_name, last_name, email</span></p>
          <p>Optional columns: <span className="font-mono">phone, location_name</span></p>
          <p className="text-xs" style={{ color: "rgba(31,57,109,0.4)" }}>
            Location name must match exactly: {locations.map((l) => l.name).join(", ")}
          </p>
        </div>

        {/* File input */}
        <div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
            style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(31,57,109,0.2)")}
          >
            <Upload size={15} />
            Choose CSV file
          </button>
        </div>

        {parseError && (
          <p className="text-sm" style={{ color: "var(--color-error)" }}>{parseError}</p>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
              {rows.length} row{rows.length !== 1 ? "s" : ""} found
              {done && ` · ${successCount} invited · ${errorCount} failed`}
            </p>

            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "rgba(31,57,109,0.1)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "rgba(31,57,109,0.04)" }}>
                    {["Name", "Email", "Phone", "Location", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: "rgba(31,57,109,0.55)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "rgba(31,57,109,0.06)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--color-primary)" }}>
                        {row.first_name} {row.last_name}
                      </td>
                      <td className="px-3 py-2" style={{ color: "rgba(31,57,109,0.65)" }}>{row.email}</td>
                      <td className="px-3 py-2" style={{ color: "rgba(31,57,109,0.65)" }}>{row.phone || "—"}</td>
                      <td className="px-3 py-2" style={{ color: "rgba(31,57,109,0.65)" }}>
                        {row.location_id
                          ? locations.find((l) => l.id === row.location_id)?.name
                          : <span style={{ color: "var(--color-warning)" }}>{row.location_name || "—"}</span>}
                      </td>
                      <td className="px-3 py-2">
                        {row.status === "success" && <CheckCircle size={14} style={{ color: "var(--color-success)" }} />}
                        {row.status === "error" && (
                          <span className="flex items-center gap-1" style={{ color: "var(--color-error)" }}>
                            <XCircle size={14} />
                            <span>{row.errorMsg}</span>
                          </span>
                        )}
                        {(!row.status || row.status === "pending") && (
                          <span style={{ color: "rgba(31,57,109,0.3)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!done && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="w-full py-3 rounded text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
              >
                {importing ? `Importing… (${successCount + errorCount}/${rows.length})` : `Import ${validRows.length} Users`}
              </button>
            )}

            {done && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded text-sm font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: "var(--color-success)", fontFamily: "var(--font-heading)" }}
              >
                Done — {successCount} invited
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSV parser ───────────────────────────────────────────────

function parseCsv(text: string, locationMap: Record<string, string>): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["first_name", "last_name", "email"];
  for (const r of required) {
    if (!headers.includes(r)) throw new Error(`Missing required column: ${r}`);
  }

  return lines.slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });

      const locationId = row.location_name
        ? locationMap[row.location_name.toLowerCase()]
        : undefined;

      return {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone || undefined,
        location_name: row.location_name || undefined,
        location_id: locationId,
      };
    });
}
