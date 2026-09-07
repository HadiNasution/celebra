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
    <section className="dash-invitation-new">
      <h1 className="dash-invitation-new__heading text-2xl font-bold tracking-tight">New Invitation</h1>

      <div className="dash-invitation-new__categories mt-6 flex flex-wrap gap-2 text-sm">
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

      <div className="dash-invitation-new__templates mt-6 flex flex-col gap-4">
        {visibleTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplateId(t.id)}
            className={cn(
              "dash-invitation-new__template-card group w-full overflow-hidden rounded-lg border text-left shadow transition-all duration-200 active:scale-[0.99]",
              templateId === t.id
                ? "border-dash-primary bg-dash-accent shadow-sm"
                : "border-dash-border bg-dash-card hover:-translate-y-0.5 hover:border-dash-ring hover:shadow-md",
            )}
          >
            <div className="flex flex-col sm:flex-row">
              {t.previewImage ? (
                <div className="aspect-video w-full overflow-hidden bg-dash-muted sm:aspect-[3/1] sm:w-64 sm:shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.previewImage}
                    alt={t.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-dash-muted text-dash-muted-foreground sm:aspect-[3/1] sm:w-64 sm:shrink-0">
                  <span className="text-3xl">👋</span>
                </div>
              )}
              <div className="flex flex-1 items-center justify-between gap-3 p-5">
                <h2 className="font-medium">{t.name}</h2>
                {t.isPremium && <Badge variant="premium">Premium</Badge>}
              </div>
            </div>
          </button>
        ))}
        {visibleTemplates.length === 0 && (
          <p className="dash-invitation-new__empty text-sm text-dash-muted-foreground">
            No templates available. Contact the administrator to upload templates first.
          </p>
        )}
      </div>

      <form onSubmit={handleCreate} className="dash-invitation-new__form mt-8 w-full space-y-4 rounded-lg bg-dash-muted/50 p-6">
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
    </section>
  );
}
