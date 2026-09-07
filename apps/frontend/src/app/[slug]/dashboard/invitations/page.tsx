"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Users, Copy, Archive, Trash2, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CardPreview } from "@/components/dash/card-preview";

type Invitation = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  publishedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  categoryName: string | null;
};

type Filter = "all" | "draft" | "published";

const filters: Filter[] = ["all", "draft", "published"];

export default function InvitationsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [openOverlay, setOpenOverlay] = useState<Set<string>>(new Set());

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

  function toggleOverlay(id: string) {
    setOpenOverlay((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runAction(e: React.MouseEvent, id: string, action: string) {
    e.preventDefault();
    e.stopPropagation();
    if (action === "delete" && !window.confirm("Delete this invitation permanently?")) return;
    const method = action === "duplicate" ? "POST" : action === "delete" ? "DELETE" : "PATCH";
    const url = action === "delete"
      ? `${apiUrl}/invitations/${id}`
      : `${apiUrl}/invitations/${id}/${action}`;
    const res = await fetch(url, { method, credentials: "include" });
    if (!res.ok) return;
    if (action === "duplicate") {
      load();
      return;
    }
    if (action === "delete") {
      load();
      return;
    }
    load();
  }

  return (
    <section className="dash-invitations">
      <div className="flex items-center justify-between gap-4">
        <h1 className="dash-invitations__heading text-2xl font-bold tracking-tight">My Invitations</h1>
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
        {invitations.map((inv) => {
          const isOpen = openOverlay.has(inv.id);
          return (
            <div key={inv.id} className="dash-invitations__card-link group">
              <Card className="dash-invitations__card h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-dash-ring group-hover:shadow-md">
                {/* Preview + Overlay */}
                <div className="dash-invitations__preview-wrapper relative overflow-hidden">
                  <CardPreview invitationId={inv.id} />

                  {/* More button — mobile/tablet only */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOverlay(inv.id); }}
                    className="dash-invitations__more-btn absolute right-2 top-2 z-10 rounded-md bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70 lg:hidden"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>

                  {/* Action overlay — slides up on hover (desktop) or toggle (mobile) */}
                  <div
                    className={cn(
                      "dash-invitations__overlay absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4",
                      "translate-y-full opacity-0 transition-all duration-300 ease-out",
                      "lg:group-hover:translate-y-0 lg:group-hover:opacity-100",
                      isOpen && "translate-y-0 opacity-100",
                    )}
                  >
                    <div className="flex w-full flex-wrap gap-2">
                      <Link
                        href={`/${slug}/dashboard/invitations/${inv.id}/editor`}
                        onClick={(e) => e.stopPropagation()}
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        <Pencil className="size-3.5" /> Edit Content
                      </Link>
                      <Link
                        href={`/${slug}/dashboard/invitations/${inv.id}/guests`}
                        onClick={(e) => e.stopPropagation()}
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        <Users className="size-3.5" /> Guests
                      </Link>
                      <button
                        onClick={(e) => runAction(e, inv.id, "duplicate")}
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        <Copy className="size-3.5" /> Duplicate
                      </button>
                      <button
                        onClick={(e) => runAction(e, inv.id, inv.deletedAt ? "restore" : "archive")}
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        <Archive className="size-3.5" /> {inv.deletedAt ? "Restore" : "Archive"}
                      </button>
                      <button
                        onClick={(e) => runAction(e, inv.id, "delete")}
                        className={buttonVariants({ variant: "destructive", size: "sm" })}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/${slug}/dashboard/invitations/${inv.id}/editor`}
                      className="dash-invitations__card-title font-medium hover:underline"
                    >
                      {inv.title}
                    </Link>
                    <Badge variant={inv.status === "published" ? "success" : "warning"}>
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="dash-invitations__card-meta mt-3 flex items-center justify-between text-sm text-dash-muted-foreground">
                    <span>
                      /{inv.slug}
                      {inv.publishedAt ? ` · Published ${new Date(inv.publishedAt).toLocaleDateString()}` : ""}
                    </span>
                    {inv.categoryName && (
                      <Badge variant="outline" className="text-xs">
                        {inv.categoryName}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
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
