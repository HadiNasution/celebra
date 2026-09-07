"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

type Template = {
  id: string;
  name: string;
  version: number;
  isPremium: boolean;
  isActive: boolean;
  previewImage: string | null;
};

type Category = {
  id: string;
  name: string;
};

const fieldCls =
  "flex w-full rounded-md border border-dash-input bg-dash-card px-3 py-1 text-sm font-mono shadow-sm transition-all duration-200 placeholder:text-dash-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring focus-visible:ring-offset-2";

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editPremium, setEditPremium] = useState(false);
  const [editPreviewImage, setEditPreviewImage] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/templates/admin/all`, { credentials: "include" }).then((r) => r.json()).then(setTemplates);
    fetch(`${apiUrl}/categories`, { credentials: "include" }).then((r) => r.json()).then(setCategories);
  }, [apiUrl]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let rows = templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    if (activeFilter !== "all") {
      rows = rows.filter((t) => (activeFilter === "active" ? t.isActive : !t.isActive));
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "version": cmp = a.version - b.version; break;
        case "isPremium": cmp = (a.isPremium ? 1 : 0) - (b.isPremium ? 1 : 0); break;
        case "isActive": cmp = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0); break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [templates, search, activeFilter, sortKey, sortDir]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    let jsonSchema: unknown;
    try {
      jsonSchema = JSON.parse((form.get("jsonSchema") as string) || "{}");
    } catch {
      setError("Invalid JSON Schema. Check the JSON format.");
      setSubmitting(false);
      return;
    }
    const body = {
      name: form.get("name"),
      categoryId: form.get("categoryId"),
      previewImage: form.get("previewImage") || undefined,
      htmlBundle: form.get("htmlBundle"),
      cssBundle: form.get("cssBundle") || undefined,
      jsBundle: form.get("jsBundle") || undefined,
      jsonSchema,
      isPremium: form.get("isPremium") === "on",
    };

    const res = await fetch(`${apiUrl}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError((data as { message?: string } | null)?.message ?? "Failed to save template.");
      setSubmitting(false);
      return;
    }
    setShowForm(false);
    location.reload();
  }

  async function handleUpdate() {
    if (!editing) return;
    setError("");
    const res = await fetch(`${apiUrl}/templates/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: editName, isPremium: editPremium, previewImage: editPreviewImage || null }),
    });
    if (!res.ok) {
      setError("Failed to update template.");
      return;
    }
    setEditing(null);
    location.reload();
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`${apiUrl}/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !current }),
    });
    location.reload();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deactivate this template?")) return;
    await fetch(`${apiUrl}/templates/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    location.reload();
  }

  return (
    <section className="admin-templates">
      <div className="flex items-center justify-between">
        <h1 className="admin-templates__heading text-2xl font-bold tracking-tight">Templates</h1>
        <Button variant={showForm ? "outline" : "default"} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Upload Template"}
        </Button>
      </div>

      {showForm && (
        <Card className="admin-templates__form mt-6 space-y-4 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previewImage">Thumbnail URL</Label>
              <Input id="previewImage" name="previewImage" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                className="flex h-9 w-full rounded-md border border-dash-input bg-dash-card px-3 py-1 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring"
              >
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="htmlBundle">HTML Bundle</Label>
              <textarea id="htmlBundle" name="htmlBundle" required rows={8} className={fieldCls} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cssBundle">CSS Bundle (optional)</Label>
              <textarea id="cssBundle" name="cssBundle" rows={4} className={fieldCls} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jsBundle">JS Bundle (optional)</Label>
              <textarea id="jsBundle" name="jsBundle" rows={4} className={fieldCls} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jsonSchema">JSON Schema</Label>
              <textarea id="jsonSchema" name="jsonSchema" required rows={4} className={fieldCls} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isPremium" id="isPremium" className="size-4 rounded border-dash-border" />
              <Label htmlFor="isPremium">Premium template</Label>
            </div>
            {error && <p className="text-sm text-dash-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Upload"}
            </Button>
          </form>
        </Card>
      )}

      <div className="admin-templates__controls mt-6 flex flex-wrap items-center gap-3">
        <div className="admin-templates__search relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dash-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-8"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="admin-templates__filter rounded-md border border-dash-input bg-dash-card px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {editing && (
        <Card className="admin-templates__editor mt-4 flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm font-medium">Editing:</span>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Name"
            className="w-48"
          />
          <Input
            value={editPreviewImage}
            onChange={(e) => setEditPreviewImage(e.target.value)}
            placeholder="Thumbnail URL"
            className="w-56"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editPremium}
              onChange={(e) => setEditPremium(e.target.checked)}
              className="size-4 rounded border-dash-border"
            />
            Premium
          </label>
          <Button size="sm" onClick={handleUpdate}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
        </Card>
      )}

      <Card className="admin-templates__table mt-6 overflow-x-auto">
          <table className="admin-templates__table-content w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              {([
                ["name", "Name"],
                ["version", "Version"],
                ["isPremium", "Premium"],
                ["isActive", "Active"],
              ] as [string, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="admin-templates__th px-6 py-3 font-medium cursor-pointer select-none hover:text-dash-foreground transition-colors"
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1 text-dash-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
              <th className="admin-templates__th px-6 py-3 font-medium">Thumbnail</th>
              <th className="admin-templates__th px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="admin-templates__row border-b border-dash-border last:border-0">
                <td className="px-6 py-3">{t.name}</td>
                <td className="px-6 py-3">{t.version}</td>
                <td className="px-6 py-3">
                  {t.isPremium ? <Badge variant="premium">Premium</Badge> : <span className="text-dash-muted-foreground">No</span>}
                </td>
                <td className="px-6 py-3">
                  <Badge variant={t.isActive ? "success" : "destructive"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-6 py-3">
                  {t.previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.previewImage} alt={t.name} className="h-10 w-16 rounded object-cover" />
                  ) : (
                    <span className="text-dash-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(t);
                        setEditName(t.name);
                        setEditPremium(t.isPremium);
                        setEditPreviewImage(t.previewImage ?? "");
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleActive(t.id, t.isActive)}
                    >
                      {t.isActive ? "Disable" : "Enable"}
                    </Button>
                    {t.isActive && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-templates__empty px-6 py-8 text-center text-dash-muted-foreground">
                  No templates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
