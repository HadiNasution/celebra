"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Upload, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

const selectCls =
  "h-9 rounded-md border border-dash-input bg-dash-card px-3 py-1 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring";

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
        className="inline-flex items-center gap-1 text-sm text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
      >
        <ArrowLeft className="size-4" /> Back to invitation
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Guests</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
          />
          <button onClick={() => fileRef.current?.click()} className={buttonVariants({ variant: "outline" })}>
            <Upload /> Import CSV
          </button>
        </div>
      </div>

      <Card className="mt-6 flex flex-wrap items-center gap-3 p-4">
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
          className="w-44"
        />
        <Input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Phone"
          className="w-40"
        />
        <select
          value={form.guestRoleId}
          onChange={(e) => setForm({ ...form, guestRoleId: e.target.value })}
          className={selectCls}
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
            <button onClick={saveEdit} className={buttonVariants({ size: "sm" })}>
              Save
            </button>
            <button onClick={resetForm} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Cancel
            </button>
          </>
        ) : (
          <button onClick={addGuest} className={buttonVariants({ size: "sm" })}>
            Add guest
          </button>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dash-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-56 pl-8"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={selectCls}
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
          {error && <p className="text-dash-destructive">{error}</p>}
          {importResult && <p className="text-emerald-700">{importResult}</p>}
        </div>
      )}

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-dash-border text-dash-muted-foreground">
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
          <tbody className="divide-y divide-dash-border">
            {filtered.map((g) => (
              <tr key={g.id} className="transition-colors duration-150 hover:bg-dash-muted/50">
                <td className="px-4 py-3 font-medium">{g.name}</td>
                <td className="px-4 py-3 text-dash-muted-foreground">{g.phone ?? "—"}</td>
                <td className="px-4 py-3 text-dash-muted-foreground">{g.roleName ?? "—"}</td>
                <td className="px-4 py-3">
                  {g.attendanceStatus === "checked_in" ? (
                    <Badge variant="success">Checked in</Badge>
                  ) : (
                    <Badge variant={g.attendanceStatus === "pending" ? "warning" : "secondary"}>
                      {g.attendanceStatus === "pending" ? "Pending" : "—"}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-dash-muted-foreground">
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
                    className="font-medium underline-offset-4 transition-colors duration-200 hover:underline"
                  >
                    {g.token.slice(0, 8)}…
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(g)}
                      className="text-xs font-medium text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGuest(g)}
                      className="text-xs font-medium text-dash-destructive transition-opacity duration-200 hover:opacity-70"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-dash-muted-foreground">
                  No guests yet. Add one above or import a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}