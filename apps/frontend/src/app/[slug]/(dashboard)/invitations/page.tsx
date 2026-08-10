"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Invitation = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
};

type Filter = "all" | "draft" | "published";

export default function InvitationsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [showArchived, setShowArchived] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  const load = useCallback(() => {
    const query = new URLSearchParams();
    if (filter !== "all") query.set("status", filter);
    if (showArchived) query.set("includeArchived", "true");
    fetch(`${apiUrl}/invitations?${query}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setInvitations);
  }, [apiUrl, filter, showArchived]);

  useEffect(load, [load]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium">Invitations</h1>
        <Link
          href={`/${slug}/dashboard/invitations/new`}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-secondary"
        >
          New Invitation
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-3 text-sm">
        {(["all", "draft", "published"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 capitalize transition-colors ${
              filter === f
                ? "bg-primary/20 text-primary"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-text-secondary">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {invitations.map((inv) => (
          <Link
            key={inv.id}
            href={`/${slug}/dashboard/invitations/${inv.id}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium">{inv.title}</h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  inv.status === "published"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {inv.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              /{inv.slug}
              {inv.publishedAt ? ` · Published ${new Date(inv.publishedAt).toLocaleDateString()}` : ""}
            </p>
          </Link>
        ))}
        {invitations.length === 0 && (
          <p className="text-sm text-text-secondary">
            No invitations yet.{" "}
            <Link href={`/${slug}/dashboard/invitations/new`} className="text-primary hover:underline">
              Create your first one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
