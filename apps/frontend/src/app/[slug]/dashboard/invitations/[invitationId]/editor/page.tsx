"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Monitor, Smartphone, X } from "lucide-react";
import { renderTemplate, setInPath, assembleHtml } from "@/lib/render";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormPanel } from "./form-panel";

type EditorData = {
  invitation: {
    id: string;
    slug: string;
    title: string;
    status: "draft" | "published";
    deletedAt: string | null;
  };
  contentJson: Record<string, unknown>;
  schema: Record<string, unknown>;
  htmlBundle: string;
  cssBundle: string;
  jsBundle: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function EditorPage() {
  const params = useParams<{ slug: string; invitationId: string }>();
  const slug = params.slug;
  const invitationId = params.invitationId;

  const [data, setData] = useState<EditorData | null>(null);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ url: string; version: number } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef<Record<string, unknown>>(content);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/invitations/${invitationId}/content`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d: EditorData) => {
        setData(d);
        setContent(d.contentJson ?? {});
      })
      .catch(() => setError("Failed to load editor."));
  }, [apiUrl, invitationId]);

  const flushSave = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const body = latestContent.current;
    setSaveState("saving");
    const res = await fetch(`${apiUrl}/invitations/${invitationId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ contentJson: body }),
    });
    setSaveState(res.ok ? "saved" : "error");
  }, [apiUrl, invitationId]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        void flushSave();
      }
    };
  }, [flushSave]);

  function handleChange(path: string[], value: unknown) {
    const next = setInPath(content, path, value);
    latestContent.current = next;
    setContent(next);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushSave(), 2000);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`${apiUrl}/invitations/${invitationId}/publish`, {
      method: "POST",
      credentials: "include",
    });
    setPublishing(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError((body as { message?: string } | null)?.message ?? "Publish failed.");
      return;
    }
    setPublished(await res.json());
  }

  const renderedHtml = useMemo(
    () =>
      data
        ? assembleHtml(
            renderTemplate(data.htmlBundle, content),
            data.cssBundle ?? null,
            data.jsBundle ?? null,
          )
        : "",
    [data, content],
  );

  if (error && !data) {
    return (
      <div>
        <p className="text-sm text-dash-destructive">{error}</p>
        <Link
          href={`/${slug}/dashboard/invitations`}
          className="mt-4 inline-flex items-center gap-1 text-sm text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
      </div>
    );
  }

  if (!data) {
    return <p className="animate-pulse text-sm text-dash-muted-foreground">Loading...</p>;
  }

  const isPublished = data.invitation.status === "published";

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col lg:h-[calc(100vh-4rem)]">
      <header className="flex items-center gap-4 border-b border-dash-border bg-dash-card px-4 py-3 lg:px-6">
        <Link
          href={`/${slug}/dashboard/invitations`}
          className="inline-flex items-center gap-1 text-sm text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <h1 className="truncate text-sm font-semibold tracking-tight lg:text-base">
          {data.invitation.title}
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={cn(
              "text-xs",
              saveState === "error"
                ? "text-dash-destructive"
                : saveState === "saving"
                  ? "text-dash-muted-foreground"
                  : "text-emerald-700",
            )}
          >
            {saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Save failed"
                  : ""}
          </span>
          <button
            onClick={() => setPreviewOpen(true)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Preview
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || isPublished}
            className={buttonVariants({ size: "sm" })}
          >
            {isPublished ? "Published" : publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </header>

      {isPublished && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
          This invitation is published and locked. Duplicate it to edit and publish a new version.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full shrink-0 overflow-y-auto border-r border-dash-border lg:w-80">
          <FormPanel schema={data.schema} content={content} onChange={handleChange} />
        </div>
        <iframe
          title="Template preview"
          sandbox="allow-scripts allow-same-origin"
          srcDoc={renderedHtml}
          className="hidden flex-1 border-0 bg-white lg:block"
        />
      </div>

      {error && <p className="px-6 py-2 text-sm text-dash-destructive">{error}</p>}

      {published && (
        <div className="flex flex-wrap items-center gap-4 border-t border-dash-border bg-dash-card px-6 py-3 text-sm">
          <span className="text-emerald-700">Published version {published.version}.</span>
          <span className="text-dash-muted-foreground">Public URL: /{data.invitation.slug}</span>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-dash-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-dash-border bg-dash-card px-6 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Preview</h2>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setPreviewMobile(false)}
                className={buttonVariants({ variant: !previewMobile ? "default" : "ghost", size: "sm" })}
              >
                <Monitor /> Desktop
              </button>
              <button
                onClick={() => setPreviewMobile(true)}
                className={buttonVariants({ variant: previewMobile ? "default" : "ghost", size: "sm" })}
              >
                <Smartphone /> Mobile
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <X /> Close
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-auto p-6">
            <iframe
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              srcDoc={renderedHtml}
              className="border-0 bg-white shadow-2xl transition-all duration-300"
              style={{ width: previewMobile ? 375 : 1440, height: 900 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}