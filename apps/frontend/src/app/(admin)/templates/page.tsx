"use client";

import { useEffect, useState } from "react";

type Template = {
  id: string;
  name: string;
  version: number;
  isPremium: boolean;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/templates`, { credentials: "include" }).then((r) => r.json()).then(setTemplates);
    fetch(`${apiUrl}/categories`, { credentials: "include" }).then((r) => r.json()).then(setCategories);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      categoryId: form.get("categoryId"),
      htmlBundle: form.get("htmlBundle"),
      cssBundle: form.get("cssBundle") || undefined,
      jsBundle: form.get("jsBundle") || undefined,
      jsonSchema: JSON.parse(form.get("jsonSchema") as string || "{}"),
      isPremium: form.get("isPremium") === "on",
    };

    await fetch(`${apiUrl}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setShowForm(false);
    location.reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium">Templates</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-secondary"
        >
          {showForm ? "Cancel" : "Upload Template"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input name="name" required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium">Category</label>
            <select name="categoryId" required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none">
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">HTML Bundle</label>
            <textarea name="htmlBundle" required rows={8} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium">CSS Bundle (optional)</label>
            <textarea name="cssBundle" rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium">JS Bundle (optional)</label>
            <textarea name="jsBundle" rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium">JSON Schema</label>
            <textarea name="jsonSchema" required rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="isPremium" id="isPremium" />
            <label htmlFor="isPremium" className="text-sm">Premium template</label>
          </div>
          <button type="submit" className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-secondary">
            Upload
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-text-secondary">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Version</th>
              <th className="pb-3 pr-4">Premium</th>
              <th className="pb-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="py-3 pr-4">{t.name}</td>
                <td className="py-3 pr-4">{t.version}</td>
                <td className="py-3 pr-4">{t.isPremium ? "Yes" : "No"}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    t.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>{t.isActive ? "Active" : "Inactive"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
