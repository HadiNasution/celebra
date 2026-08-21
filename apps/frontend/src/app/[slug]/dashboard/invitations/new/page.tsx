"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
      <h1 className="text-xl font-semibold tracking-tight">New Invitation</h1>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <button
          onClick={() => setCategoryId("")}
          className={cn(
            "rounded-md px-3 py-1.5 transition-all duration-200 active:scale-[0.97]",
            categoryId === ""
              ? "bg-dash-primary text-dash-primary-foreground shadow-sm"
              : "text-dash-muted-foreground hover:bg-dash-accent hover:text-dash-foreground",
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={cn(
              "rounded-md px-3 py-1.5 transition-all duration-200 active:scale-[0.97]",
              categoryId === c.id
                ? "bg-dash-primary text-dash-primary-foreground shadow-sm"
                : "text-dash-muted-foreground hover:bg-dash-accent hover:text-dash-foreground",
            )}
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
            className={cn(
              "rounded-lg border p-5 text-left transition-all duration-200 active:scale-[0.99]",
              templateId === t.id
                ? "border-dash-primary bg-dash-accent shadow-sm"
                : "border-dash-border bg-dash-card hover:-translate-y-0.5 hover:border-dash-ring hover:shadow-md",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{t.name}</h2>
              {t.isPremium && <Badge>Premium</Badge>}
            </div>
            {t.previewImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.previewImage}
                alt={t.name}
                className="mt-3 h-32 w-full rounded-md object-cover"
              />
            )}
          </button>
        ))}
        {visibleTemplates.length === 0 && (
          <p className="text-sm text-dash-muted-foreground">
            No templates available. Contact the administrator to upload templates first.
          </p>
        )}
      </div>

      <form onSubmit={handleCreate} className="mt-8 max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Invitation title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Rina & Budi Wedding"
          />
        </div>
        {error && <p className="text-sm text-dash-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Invitation"}
        </Button>
      </form>
    </div>
  );
}