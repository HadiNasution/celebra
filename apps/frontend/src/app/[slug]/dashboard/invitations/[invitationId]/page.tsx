"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, Archive, RotateCcw, Pencil, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type InvitationDetail = {
  invitation: {
    id: string;
    slug: string;
    title: string;
    status: "draft" | "published";
    publishedAt: string | null;
    deletedAt: string | null;
  };
  templateName: string;
  templatePreviewImage: string | null;
};

export default function InvitationDetailPage() {
  const params = useParams<{ slug: string; invitationId: string }>();
  const slug = params.slug;
  const invitationId = params.invitationId;
  const router = useRouter();
  const [inv, setInv] = useState<InvitationDetail | null>(null);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  const load = useCallback(() => {
    fetch(`${apiUrl}/invitations/${invitationId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setInv(data))
      .catch(() => setError("Invitation not found."));
  }, [apiUrl, invitationId]);

  useEffect(load, [load]);

  async function runAction(action: string) {
    setError("");
    const res = await fetch(`${apiUrl}/invitations/${invitationId}/${action}`, {
      method: action === "duplicate" ? "POST" : "PATCH",
      credentials: "include",
    });
    if (!res.ok) {
      setError(`Action ${action} failed.`);
      return;
    }
    if (action === "duplicate") {
      router.push(`/${slug}/dashboard/invitations`);
      return;
    }
    load();
  }

  if (!inv && !error) {
    return <p className="animate-pulse text-sm text-dash-muted-foreground">Loading...</p>;
  }

  if (!inv) {
    return (
      <div>
        <p className="text-sm text-dash-destructive">{error}</p>
        <Link
          href={`/${slug}/dashboard/invitations`}
          className="mt-4 inline-flex items-center gap-1 text-sm text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
        >
          <ArrowLeft className="size-4" /> Back to invitations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/${slug}/dashboard/invitations`}
        className="inline-flex items-center gap-1 text-sm text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
      >
        <ArrowLeft className="size-4" /> Back to invitations
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{inv.invitation.title}</h1>
          <p className="mt-2 text-sm text-dash-muted-foreground">
            /{inv.invitation.slug} · {inv.templateName}
            {inv.invitation.publishedAt
              ? ` · Published ${new Date(inv.invitation.publishedAt).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <Badge
          variant={
            inv.invitation.deletedAt
              ? "secondary"
              : inv.invitation.status === "published"
                ? "success"
                : "warning"
          }
        >
          {inv.invitation.deletedAt ? "archived" : inv.invitation.status}
        </Badge>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/${slug}/dashboard/invitations/${invitationId}/editor`} className={buttonVariants()}>
          <Pencil /> Edit content
        </Link>
        <Link
          href={`/${slug}/dashboard/invitations/${invitationId}/guests`}
          className={buttonVariants({ variant: "secondary" })}
        >
          <Users /> Guests
        </Link>
        <button onClick={() => runAction("duplicate")} className={buttonVariants({ variant: "outline" })}>
          <Copy /> Duplicate
        </button>
        {inv.invitation.deletedAt ? (
          <button onClick={() => runAction("restore")} className={buttonVariants({ variant: "outline" })}>
            <RotateCcw /> Restore
          </button>
        ) : (
          <button onClick={() => runAction("archive")} className={buttonVariants({ variant: "destructive" })}>
            <Archive /> Archive
          </button>
        )}
      </div>

      {inv.invitation.status === "published" && !inv.invitation.deletedAt && (
        <Card className="mt-8 flex items-center gap-3 p-5 text-sm">
          <span className="text-dash-muted-foreground">Public URL:</span>
          <a
            href={`/${inv.invitation.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium underline-offset-4 transition-colors duration-200 hover:underline"
          >
            /{inv.invitation.slug} <ExternalLink className="size-4" />
          </a>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-dash-destructive">{error}</p>}
    </div>
  );
}