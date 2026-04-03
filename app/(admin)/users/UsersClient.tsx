"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, UserPlus, Upload, Pencil, Trash2, GraduationCap } from "lucide-react";
import InviteUserModal from "./InviteUserModal";
import CsvImportModal from "./CsvImportModal";
import EnrollUserModal from "./EnrollUserModal";

// ─── Types ────────────────────────────────────────────────────

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: "learner" | "manager" | "admin";
  location_id: string | null;
  is_active: boolean;
  created_at: string;
  locations: { name: string; state: string } | null;
  status: "active" | "pending" | "deactivated";
}

export interface Location {
  id: string;
  name: string;
  state: string;
}

interface Props {
  initialUsers: User[];
  locations: Location[];
  currentUserRole: "admin" | "manager";
  currentUserLocationId: string | null;
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin:   { bg: "#E8E6DB",               color: "#6b6450" },
  manager: { bg: "rgba(212,147,13,0.15)", color: "var(--color-warning)" },
  learner: { bg: "rgba(2,173,223,0.15)",  color: "#02ADDF" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: "rgba(45,138,78,0.1)",   color: "var(--color-success)", label: "Active" },
  pending:     { bg: "rgba(212,147,13,0.1)",  color: "var(--color-warning)", label: "Pending" },
  deactivated: { bg: "rgba(201,59,59,0.1)",   color: "var(--color-error)",   label: "Deactivated" },
};

// ─── Component ────────────────────────────────────────────────

export default function UsersClient({
  initialUsers,
  locations,
  currentUserRole,
  currentUserLocationId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "deactivated">("all");
  const [showInvite, setShowInvite] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [enrollingUser, setEnrollingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("invite") === "true") setShowInvite(true);
  }, [searchParams]);

  // ── Filtering ───────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  // ── Delete ──────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeletingId(null);
  }

  // ── Deactivate / Reactivate ─────────────────────────────────

  async function handleToggleActive(user: User) {
    setTogglingId(user.id);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, is_active: !u.is_active, status: !u.is_active ? "active" : "deactivated" }
            : u
        )
      );
    }
    setTogglingId(null);
  }

  function handleSuccess() {
    router.refresh();
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(31,57,109,0.35)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)", backgroundColor: "var(--color-white)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border text-sm outline-none"
          style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)", backgroundColor: "var(--color-white)" }}
        >
          <option value="all">All roles</option>
          <option value="learner">Learner</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2.5 rounded-lg border text-sm outline-none"
          style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)", backgroundColor: "var(--color-white)" }}
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="deactivated">Deactivated</option>
          <option value="all">All statuses</option>
        </select>

        {/* CSV import (admin only) */}
        {currentUserRole === "admin" && (
          <button
            onClick={() => setShowCsv(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium"
            style={{ borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)", backgroundColor: "var(--color-white)" }}
          >
            <Upload size={15} />
            CSV Import
          </button>
        )}

        {/* Invite */}
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
        >
          <UserPlus size={15} />
          Invite User
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-white)" }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "rgba(31,57,109,0.45)" }}>
              {search || roleFilter !== "all" || statusFilter !== "active"
                ? "No users match your filters."
                : "No users yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
                  {["Name", "Email", "Role", "Status", "Location", "Joined", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "rgba(31,57,109,0.45)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 transition-colors"
                    style={{
                      borderColor: "rgba(31,57,109,0.05)",
                      opacity: user.status === "deactivated" ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(31,57,109,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: "var(--color-primary)" }}
                        >
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <span className="font-medium" style={{ color: "var(--color-primary)" }}>
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3" style={{ color: "rgba(31,57,109,0.65)" }}>
                      {user.email}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                        style={ROLE_COLORS[user.role]}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: STATUS_STYLES[user.status].bg, color: STATUS_STYLES[user.status].color }}
                      >
                        {STATUS_STYLES[user.status].label}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3" style={{ color: "rgba(31,57,109,0.65)" }}>
                      {user.locations ? `${user.locations.name}, ${user.locations.state}` : "—"}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "rgba(31,57,109,0.45)" }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ActionBtn
                          icon={<GraduationCap size={14} />}
                          title="Enroll"
                          onClick={() => setEnrollingUser(user)}
                        />
                        {currentUserRole === "admin" && (
                          <>
                            <ActionBtn
                              icon={<Pencil size={14} />}
                              title="Edit"
                              onClick={() => setEditingUser(user)}
                            />
                            {togglingId === user.id ? (
                              <span className="text-xs px-2" style={{ color: "rgba(31,57,109,0.4)" }}>…</span>
                            ) : (
                              <ActionBtn
                                icon={
                                  user.is_active
                                    ? <BanIcon />
                                    : <CheckIcon />
                                }
                                title={user.is_active ? "Deactivate" : "Reactivate"}
                                onClick={() => handleToggleActive(user)}
                              />
                            )}
                            {deletingId === user.id ? (
                              <span className="text-xs px-2 py-1 flex items-center gap-1" style={{ color: "rgba(31,57,109,0.4)" }}>
                                <span className="animate-spin">⏳</span>
                              </span>
                            ) : (
                              <DeleteConfirm
                                onConfirm={() => handleDelete(user.id)}
                                userName={`${user.first_name} ${user.last_name}`}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteUserModal
          locations={locations}
          currentUserRole={currentUserRole}
          currentUserLocationId={currentUserLocationId}
          onClose={() => { setShowInvite(false); router.replace("/users"); }}
          onSuccess={handleSuccess}
        />
      )}

      {showCsv && (
        <CsvImportModal
          locations={locations}
          onClose={() => setShowCsv(false)}
          onSuccess={handleSuccess}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          locations={locations}
          onClose={() => setEditingUser(null)}
          onSave={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
            setEditingUser(null);
          }}
        />
      )}

      {enrollingUser && (
        <EnrollUserModal
          user={enrollingUser}
          onClose={() => setEnrollingUser(null)}
        />
      )}
    </>
  );
}

// ─── Edit modal ───────────────────────────────────────────────

function EditUserModal({
  user,
  locations,
  onClose,
  onSave,
}: {
  user: User;
  locations: Location[];
  onClose: () => void;
  onSave: (updated: Partial<User> & { id: string }) => void;
}) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [role, setRole] = useState(user.role);
  const [locationId, setLocationId] = useState(user.location_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        role,
        location_id: locationId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onSave({ id: user.id, first_name: firstName, last_name: lastName, email, phone: phone || null, role, location_id: locationId || null });
  }

  const inputStyle = { borderColor: "rgba(31,57,109,0.2)", color: "var(--color-primary)" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm flex flex-col"
        style={{ backgroundColor: "var(--color-white)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
            Edit {user.first_name} {user.last_name}
          </h2>
          <button onClick={onClose} style={{ color: "rgba(31,57,109,0.4)" }}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")} onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")} onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")} onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")} onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as User["role"])} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle}>
              <option value="learner">Learner</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle}>
              <option value="">No location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}, {l.state}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t space-y-3" style={{ borderColor: "rgba(31,57,109,0.08)" }}>
          {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: "1px solid rgba(31,57,109,0.2)", color: "var(--color-primary)" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white disabled:opacity-50" style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────

import { X } from "lucide-react";

function BanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function ActionBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
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

function DeleteConfirm({ onConfirm, userName }: { onConfirm: () => void; userName: string }) {
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
    <ActionBtn
      icon={<Trash2 size={14} />}
      title={`Delete ${userName}`}
      onClick={() => setOpen(true)}
    />
  );
}
