"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const fieldCls =
  "flex w-full rounded-md border border-dash-input bg-dash-card px-3 py-1 text-sm font-mono shadow-sm transition-all duration-200 placeholder:text-dash-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring focus-visible:ring-offset-2";

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/templates`, { credentials: "include" }).then((r) => r.json()).then(setTemplates);
    fetch(`${apiUrl}/categories`, { credentials: "include" }).then((r) => r.json()).then(setCategories);
  }, [apiUrl]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    let jsonSchema: unknown;
    try {
      jsonSchema = JSON.parse((form.get("jsonSchema") as string) || "{}");
    } catch {
      setError("JSON Schema tidak valid. Periksa format JSON.");
      setSubmitting(false);
      return;
    }
    const body = {
      name: form.get("name"),
      categoryId: form.get("categoryId"),
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
      setError((data as { message?: string } | null)?.message ?? "Gagal menyimpan template.");
      setSubmitting(false);
      return;
    }
    setShowForm(false);
    location.reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Templates</h1>
        <Button variant={showForm ? "outline" : "default"} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Upload Template"}
        </Button>
      </div>

      {showForm && (
        <Card className="mt-6 space-y-4 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
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
              <textarea
                id="htmlBundle"
                name="htmlBundle"
                required
                rows={8}
                className={fieldCls}
              />
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
              {submitting ? "Menyimpan..." : "Upload"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Version</th>
              <th className="px-6 py-3 font-medium">Premium</th>
              <th className="px-6 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-dash-border last:border-0">
                <td className="px-6 py-3">{t.name}</td>
                <td className="px-6 py-3">{t.version}</td>
                <td className="px-6 py-3">
                  {t.isPremium ? <Badge variant="secondary">Premium</Badge> : <span className="text-dash-muted-foreground">No</span>}
                </td>
                <td className="px-6 py-3">
                  <Badge variant={t.isActive ? "success" : "destructive"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}