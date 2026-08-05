"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function AdminCategoriesPage() {
  const [data, setData] = useState<Category[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/categories`, { credentials: "include" }).then((r) => r.json()).then(setData);
  }, []);

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

  async function handleDelete(id: string) {
    await fetch(`${apiUrl}/categories/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    location.reload();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium">Categories</h1>

      <form onSubmit={handleAdd} className="mt-6 flex gap-3">
        <input
          name="name"
          required
          placeholder="Category name"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
        />
        <input
          name="slug"
          required
          placeholder="slug"
          className="w-40 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
        />
        <button type="submit" className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-secondary">
          Add
        </button>
      </form>

      <div className="mt-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-text-secondary">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Slug</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-b border-white/5">
                <td className="py-3 pr-4">{c.name}</td>
                <td className="py-3 pr-4">{c.slug}</td>
                <td className="py-3">
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
