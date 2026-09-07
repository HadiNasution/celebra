"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function AdminCategoriesPage() {
  const [data, setData] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/categories`, { credentials: "include" }).then((r) => r.json()).then(setData);
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
    const q = search.toLowerCase();
    let rows = data.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "slug": cmp = a.slug.localeCompare(b.slug); break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, search, sortKey, sortDir]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch(`${apiUrl}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: form.get("name"), slug: form.get("slug") }),
    });
    location.reload();
  }

  async function handleUpdate() {
    if (!editing) return;
    await fetch(`${apiUrl}/categories/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: editName, slug: editSlug }),
    });
    setEditing(null);
    location.reload();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this category?")) return;
    await fetch(`${apiUrl}/categories/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    location.reload();
  }

  return (
    <section className="admin-categories">
      <div className="admin-categories__header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="admin-categories__heading text-2xl font-bold tracking-tight">Categories</h1>
        <div className="admin-categories__search relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dash-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="pl-8"
          />
        </div>
      </div>

      <form onSubmit={handleAdd} className="admin-categories__add-form mt-6 flex flex-wrap gap-3">
        <Input name="name" required placeholder="Category name" className="max-w-xs" />
        <Input name="slug" required placeholder="slug" className="w-40" />
        <Button type="submit">Add</Button>
      </form>

      {editing && (
        <Card className="admin-categories__editor mt-4 flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm font-medium">Editing:</span>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Name"
            className="w-44"
          />
          <Input
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
            placeholder="Slug"
            className="w-40"
          />
          <Button size="sm" onClick={handleUpdate}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
        </Card>
      )}

      <Card className="admin-categories__table mt-6 overflow-x-auto">
        <table className="admin-categories__table-content w-full min-w-[450px] text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              {([
                ["name", "Name"],
                ["slug", "Slug"],
              ] as [string, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="admin-categories__th px-6 py-3 font-medium cursor-pointer select-none hover:text-dash-foreground transition-colors"
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1 text-dash-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
              <th className="admin-categories__th px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="admin-categories__row border-b border-dash-border last:border-0">
                <td className="px-6 py-3">{c.name}</td>
                <td className="px-6 py-3 text-dash-muted-foreground">{c.slug}</td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setEditName(c.name);
                        setEditSlug(c.slug);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="admin-categories__empty px-6 py-8 text-center text-dash-muted-foreground">
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
