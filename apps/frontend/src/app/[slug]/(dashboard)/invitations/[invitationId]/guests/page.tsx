"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type GuestRole = { id: string; name: string };

type Guest = {
  id: string;
  name: string;
  phone: string | null;
  token: string;
  attendanceStatus: string | null;
  roleName: string | null;
  guestRoleId: string | null;
  rsvpAttendance: boolean | null;
  rsvpGuestCount: number | null;
  createdAt: string;
};

export default function GuestsPage() {
  const params = useParams<{ slug: string; invitationId: string }>();
  const { slug, invitationId } = params;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  const [guests, setGuests] = useState<Guest[]>([]);
  const [roles, setRoles] = useState<GuestRole[]>([]);
  const [inviteSlug, setInviteSlug] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", phone: "", guestRoleId: "" });
  const [editing, setEditing] = useState<Guest | null>(null);
  const [importResult, setImportResult] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`${apiUrl}/invitations/${invitationId}/guests${query}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setGuests)
      .catch(() => setError("Failed to load guests."));
  }, [apiUrl, invitationId, search]);

  useEffect(() => {
    fetch(`${apiUrl}/guest-roles`, { credentials: "include" })
      .then((r) => r.json())
      .then(setRoles);
  }, [apiUrl]);

  useEffect(() => {
    fetch(`${apiUrl}/invitations/${invitationId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setInviteSlug(d.invitation?.slug ?? ""))
      .catch(() => {});
  }, [apiUrl, invitationId]);

  useEffect(load, [load]);

  const filtered = useMemo(
    () => (roleFilter ? guests.filter((g) => g.roleName === roleFilter) : guests),
    [guests, roleFilter],
  );

  const resetForm = () => {
    setForm({ name: "", phone: "", guestRoleId: "" });
    setEditing(null);
  };

  const addGuest = async () => {
    setError("");
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const res = await fetch(`${apiUrl}/invitations/${invitationId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || undefined,
        guestRoleId: form.guestRoleId || undefined,
      }),
    });
    if (!res.ok) {
      setError("Failed to add guest.");
      return;
    }
    resetForm();
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError("");
    const res = await fetch(
      `${apiUrl}/invitations/${invitationId}/guests/${editing.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          guestRoleId: form.guestRoleId || undefined,
        }),
      },
    );
    if (!res.ok) {
      setError("Failed to update guest.");
      return;
    }
    resetForm();
    load();
  };

  const deleteGuest = async (guest: Guest) => {
    if (!window.confirm(`Delete guest "${guest.name}"?`)) return;
    const res = await fetch(`${apiUrl}/invitations/${invitationId}/guests/${guest.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setError("Failed to delete guest.");
      return;
    }
    load();
  };

  const importCsv = async (file: File) => {
    setError("");
    setImportResult("");
    const csv = await file.text();
    const res = await fetch(`${apiUrl}/invitations/${invitationId}/guests/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ csv }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "Import failed.");
      return;
    }
    const { imported, skipped, errors } = data as {
      imported: number;
      skipped: number;
      errors: { row: number; reason: string }[];
    };
    setImportResult(
      `Imported ${imported}, skipped ${skipped}${errors.length ? `, ${errors.length} errors` : ""}.`,
    );
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const startEdit = (guest: Guest) => {
    setEditing(guest);
    setForm({
      name: guest.name,
      phone: guest.phone ?? "",
      guestRoleId: guest.guestRoleId ?? "",
    });
  };

  return (
    <div>
      <Link
        href={`/${slug}/dashboard/invitations/${invitationId}`}
        className="text-sm text-text-secondary hover:text-white"
      >
        ← Back to invitation
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-medium">Guests</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
          >
            Import CSV
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Phone"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
        <select
          value={form.guestRoleId}
          onChange={(e) => setForm({ ...form, guestRoleId: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
        >
          <option value="">No role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {editing ? (
          <>
            <button
              onClick={saveEdit}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-secondary"
            >
              Save
            </button>
            <button
              onClick={resetForm}
              className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={addGuest}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-secondary"
          >
            Add guest
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {(error || importResult) && (
        <div className="mt-4 text-sm">
          {error && <p className="text-red-400">{error}</p>}
          {importResult && <p className="text-green-400">{importResult}</p>}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/5 text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Attendance</th>
              <th className="px-4 py-3 font-medium">RSVP</th>
              <th className="px-4 py-3 font-medium">Link</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((g) => (
              <tr key={g.id} className="hover:bg-white/5">
                <td className="px-4 py-3">{g.name}</td>
                <td className="px-4 py-3 text-text-secondary">{g.phone ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{g.roleName ?? "—"}</td>
                <td className="px-4 py-3">
                  {g.attendanceStatus === "checked_in" ? (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                      Checked in
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                      {g.attendanceStatus === "pending" ? "Pending" : "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {g.rsvpAttendance === null
                    ? "—"
                    : g.rsvpAttendance
                      ? `Attending${g.rsvpGuestCount && g.rsvpGuestCount > 1 ? ` (+${g.rsvpGuestCount - 1})` : ""}`
                      : "Not attending"}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/${inviteSlug}?guest=${g.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {g.token.slice(0, 8)}…
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(g)}
                      className="text-xs text-text-secondary hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGuest(g)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                  No guests yet. Add one above or import a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
