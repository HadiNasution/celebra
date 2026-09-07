"use client";

import { useEffect, useMemo, useState } from "react";
import { renderTemplate, assembleHtml } from "@/lib/render";

export function CardPreview({ invitationId }: { invitationId: string }) {
  const [html, setHtml] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/invitations/${invitationId}/content`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setHtml(assembleHtml(renderTemplate(d.htmlBundle, d.contentJson ?? {}), d.cssBundle, d.jsBundle) +
          "<style>html,body{overflow:hidden!important;margin:0!important;padding:0!important;height:100%!important}</style>");
      })
      .catch(() => {});
  }, [apiUrl, invitationId]);

  if (!html) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-dash-muted text-dash-muted-foreground lg:aspect-[3/1]">
        <span className="animate-pulse text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden bg-white lg:aspect-[3/1]">
      <iframe
        title="Template preview"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={html}
        className="pointer-events-none h-full w-full border-0"
      />
    </div>
  );
}
