"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
    return <p className="text-text-secondary">Loading...</p>;
  }

  if (!inv) {
    return (
      <div>
        <p className="text-red-400">{error}</p>
        <Link
          href={`/${slug}/dashboard/invitations`}
          className="mt-4 inline-block text-sm text-text-secondary hover:text-white"
        >
          ← Back to invitations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/${slug}/dashboard/invitations`}
        className="text-sm text-text-secondary hover:text-white"
      >
        ← Back to invitations
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium">{inv.invitation.title}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            /{inv.invitation.slug} · {inv.templateName}
            {inv.invitation.publishedAt
              ? ` · Published ${new Date(inv.invitation.publishedAt).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
            inv.invitation.deletedAt
              ? "bg-gray-500/20 text-gray-400"
              : inv.invitation.status === "published"
                ? "bg-green-500/20 text-green-400"
                : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {inv.invitation.deletedAt ? "archived" : inv.invitation.status}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/${slug}/dashboard/invitations/${invitationId}/editor`}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary hover:opacity-90"
        >
          Edit content
        </Link>
        <Link
          href={`/${slug}/dashboard/invitations/${invitationId}/guests`}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary hover:opacity-90"
        >
          Guests
        </Link>
        <button
          onClick={() => runAction("duplicate")}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary"
        >
          Duplicate
        </button>
        {inv.invitation.deletedAt ? (
          <button
            onClick={() => runAction("restore")}
            className="rounded-full border border-white/20 px-5 py-2 text-sm hover:bg-white/5"
          >
            Restore
          </button>
        ) : (
          <button
            onClick={() => runAction("archive")}
            className="rounded-full border border-red-400/40 px-5 py-2 text-sm text-red-400 hover:bg-red-400/10"
          >
            Archive
          </button>
        )}
      </div>

      {inv.invitation.status === "published" && !inv.invitation.deletedAt && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-text-secondary">
          <a
            href={`/${inv.invitation.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Open public invitation →
          </a>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
