"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  }, [apiUrl]);

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
      <h1 className="text-xl font-semibold tracking-tight">Categories</h1>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap gap-3">
        <Input name="name" required placeholder="Category name" className="max-w-xs" />
        <Input name="slug" required placeholder="slug" className="w-40" />
        <Button type="submit">Add</Button>
      </form>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Slug</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-b border-dash-border last:border-0">
                <td className="px-6 py-3">{c.name}</td>
                <td className="px-6 py-3 text-dash-muted-foreground">{c.slug}</td>
                <td className="px-6 py-3">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}