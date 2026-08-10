"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = { id: string; name: string };
type Template = {
  id: string;
  name: string;
  previewImage: string | null;
  isPremium: boolean;
  categoryId: string;
};

export default function NewInvitationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/categories`, { credentials: "include" })
      .then((r) => r.json())
      .then(setCategories);
    fetch(`${apiUrl}/templates`, { credentials: "include" })
      .then((r) => r.json())
      .then(setTemplates);
  }, [apiUrl]);

  const visibleTemplates = useMemo(
    () => (categoryId ? templates.filter((t) => t.categoryId === categoryId) : templates),
    [templates, categoryId],
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!templateId) {
      setError("Select a template first.");
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch(`${apiUrl}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ templateId, title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError((body as { message?: string } | null)?.message ?? "Failed to create invitation.");
      setLoading(false);
      return;
    }
    const created = await res.json();
    router.push(`/${slug}/dashboard/invitations/${created.invitation.id}`);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium">New Invitation</h1>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <button
          onClick={() => setCategoryId("")}
          className={`rounded-full px-3 py-1.5 transition-colors ${
            categoryId === "" ? "bg-primary/20 text-primary" : "text-text-secondary hover:text-white"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              categoryId === c.id ? "bg-primary/20 text-primary" : "text-text-secondary hover:text-white"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplateId(t.id)}
            className={`rounded-2xl border p-5 text-left transition-colors ${
              templateId === t.id
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-white/5 hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{t.name}</h2>
              {t.isPremium && (
                <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                  Premium
                </span>
              )}
            </div>
            {t.previewImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.previewImage}
                alt={t.name}
                className="mt-3 h-32 w-full rounded-lg object-cover"
              />
            )}
          </button>
        ))}
        {visibleTemplates.length === 0 && (
          <p className="text-sm text-text-secondary">
            No templates available. Contact the administrator to upload templates first.
          </p>
        )}
      </div>

      <form onSubmit={handleCreate} className="mt-8 flex max-w-md flex-col gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Invitation title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/50"
            placeholder="Rina & Budi Wedding"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Invitation"}
        </button>
      </form>
    </div>
  );
}
