"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Invitation = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  templatePreviewImage: string | null;
};

type Filter = "all" | "draft" | "published";

const filters: Filter[] = ["all", "draft", "published"];

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
    <section className="dash-invitations">
      <div className="flex items-center justify-between gap-4">
        <h1 className="dash-invitations__heading text-2xl font-bold tracking-tight">Invitations</h1>
        <Link href={`/${slug}/dashboard/invitations/new`} className={buttonVariants()}>
          <Plus /> New Invitation
        </Link>
      </div>

      <div className="dash-invitations__filters mt-6 flex flex-wrap items-center gap-2 text-sm">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 capitalize transition-all duration-200 active:scale-[0.97]",
              filter === f
                ? "bg-dash-primary text-dash-primary-foreground shadow-sm"
                : "text-dash-muted-foreground hover:bg-dash-accent hover:text-dash-foreground",
            )}
          >
            {f}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-dash-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="size-4 rounded border-dash-border"
          />
          Show archived
        </label>
      </div>

      <div className="dash-invitations__grid mt-6 flex flex-col gap-4">
        {invitations.map((inv) => (
          <Link
            key={inv.id}
            href={`/${slug}/dashboard/invitations/${inv.id}`}
            className="dash-invitations__card-link group"
          >
            <Card className="dash-invitations__card h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-dash-ring group-hover:shadow-md">
              {inv.templatePreviewImage ? (
                <div className="aspect-video w-full overflow-hidden bg-dash-muted lg:aspect-[3/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inv.templatePreviewImage}
                    alt={inv.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-dash-muted text-dash-muted-foreground lg:aspect-[3/1]">
                  <span className="text-3xl">👋</span>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="dash-invitations__card-title font-medium">{inv.title}</h2>
                  <Badge variant={inv.status === "published" ? "success" : "warning"}>
                    {inv.status}
                  </Badge>
                </div>
                <p className="dash-invitations__card-meta mt-3 text-sm text-dash-muted-foreground">
                  /{inv.slug}
                  {inv.publishedAt ? ` · Published ${new Date(inv.publishedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
            </Card>
          </Link>
        ))}
        {invitations.length === 0 && (
          <p className="dash-invitations__empty text-sm text-dash-muted-foreground">
            No invitations yet.{" "}
            <Link href={`/${slug}/dashboard/invitations/new`} className="font-medium underline-offset-4 hover:underline">
              Create your first one
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
