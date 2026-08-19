"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function TemplateFrame({ title, html }: { title: string; html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return;
    setHeight(doc.body.scrollHeight);
  }, []);

  useEffect(() => {
    // ponytail: re-measure after load + resize; images finishing later may shift height slightly
    const timer = setTimeout(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [measure, html]);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      onLoad={measure}
      className="w-full border-0 bg-white"
      style={{ height: height ? `${height}px` : "100vh", minHeight: "100vh" }}
    />
  );
}

type WidgetsProps = {
  slug: string;
  apiUrl: string;
  guestToken: string | null;
  guestName: string | null;
};

type RsvpState = { status: "idle" | "submitting" | "done"; error: string };

export default function PublicWidgets({ slug, apiUrl, guestToken, guestName }: WidgetsProps) {
  const [attendance, setAttendance] = useState<boolean>(true);
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState("");
  const [rsvp, setRsvp] = useState<RsvpState>({ status: "idle", error: "" });

  const [entries, setEntries] = useState<
    { id: string; message: string; createdAt: string; guestName: string | null }[]
  >([]);
  const [bookMessage, setBookMessage] = useState("");
  const [bookState, setBookState] = useState<{ status: "idle" | "submitting" | "done"; error: string }>({
    status: "idle",
    error: "",
  });

  const [media, setMedia] = useState<{ objectKey: string; mediaType: string } | null>(null);
  const [mediaState, setMediaState] = useState<{ status: "idle" | "uploading" | "done"; error: string }>({
    status: "idle",
    error: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const mediaUrl = (objectKey: string) => `${apiUrl}/public/media/${objectKey}`;

  const loadGuestbook = useCallback(() => {
    fetch(`${apiUrl}/public/invitation/${slug}/guestbook`)
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => {});
  }, [apiUrl, slug]);

  useEffect(loadGuestbook, [loadGuestbook]);

  async function submitRsvp() {
    setRsvp({ status: "submitting", error: "" });
    const res = await fetch(`${apiUrl}/public/invitation/${slug}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: guestToken,
        attendance,
        guestCount,
        message: message.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setRsvp({ status: "idle", error: (body as { message?: string } | null)?.message ?? "RSVP failed." });
      return;
    }
    setRsvp({ status: "done", error: "" });
  }

  async function submitGuestbook() {
    setBookState({ status: "submitting", error: "" });
    const res = await fetch(`${apiUrl}/public/invitation/${slug}/guestbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestToken: guestToken ?? undefined, message: bookMessage }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setBookState({ status: "idle", error: (body as { message?: string } | null)?.message ?? "Failed to post." });
      return;
    }
    setBookMessage("");
    setBookState({ status: "done", error: "" });
    loadGuestbook();
  }

  async function uploadMedia(file: File) {
    setMediaState({ status: "uploading", error: "" });
    const form = new FormData();
    form.append("file", file);
    form.append("guestToken", guestToken ?? "");
    const res = await fetch(`${apiUrl}/public/invitation/${slug}/media`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMediaState({ status: "idle", error: (body as { message?: string } | null)?.message ?? "Upload failed." });
      return;
    }
    setMedia(await res.json());
    setMediaState({ status: "done", error: "" });
    if (fileRef.current) fileRef.current.value = "";
  }

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50";
  const cardCls = "rounded-2xl border border-white/10 bg-white/5 p-6";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <section className={cardCls}>
        <h2 className="font-display text-xl font-medium">RSVP</h2>
        {guestName && <p className="mt-1 text-sm text-text-secondary">Welcome, {guestName}.</p>}
        {!guestToken ? (
          <p className="mt-3 text-sm text-text-secondary">
            Open your personalized guest link to submit your RSVP.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              {[
                { value: true, label: "Attending" },
                { value: false, label: "Not attending" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setAttendance(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    attendance === opt.value
                      ? "bg-primary text-secondary"
                      : "border border-white/20 hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {attendance && (
              <label className="block text-sm">
                <span className="text-text-secondary">Number of guests</span>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className={`${inputCls} mt-1`}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message (optional)"
              rows={3}
              maxLength={1000}
              className={inputCls}
            />
            {rsvp.error && <p className="text-sm text-red-400">{rsvp.error}</p>}
            {rsvp.status === "done" ? (
              <p className="text-sm text-green-400">Thank you, your RSVP has been saved.</p>
            ) : (
              <button
                onClick={submitRsvp}
                disabled={rsvp.status === "submitting"}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary hover:opacity-90 disabled:opacity-50"
              >
                {rsvp.status === "submitting" ? "Submitting..." : "Submit RSVP"}
              </button>
            )}
          </div>
        )}
      </section>

      <section className={cardCls}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">Guestbook</h2>
          <button onClick={loadGuestbook} className="text-xs text-text-secondary hover:text-white">
            Refresh
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {entries.length === 0 && <p className="text-sm text-text-secondary">No messages yet. Be the first!</p>}
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm">{entry.message}</p>
              <p className="mt-2 text-xs text-text-secondary">
                {entry.guestName ?? "Guest"} · {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <textarea
            value={bookMessage}
            onChange={(e) => setBookMessage(e.target.value)}
            placeholder="Write a message..."
            rows={3}
            maxLength={1000}
            className={inputCls}
          />
          {bookState.error && <p className="mt-2 text-sm text-red-400">{bookState.error}</p>}
          {bookState.status === "done" && (
            <p className="mt-2 text-sm text-green-400">Message posted.</p>
          )}
          <button
            onClick={submitGuestbook}
            disabled={bookState.status === "submitting" || !bookMessage.trim()}
            className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary hover:opacity-90 disabled:opacity-50"
          >
            {bookState.status === "submitting" ? "Posting..." : "Post message"}
          </button>
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="font-display text-xl font-medium">Share your photos, video or voice note</h2>
        {!guestToken ? (
          <p className="mt-3 text-sm text-text-secondary">
            Open your personalized guest link to upload one media item.
          </p>
        ) : (
          <div className="mt-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,audio/mpeg,audio/wav,audio/webm"
              className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-secondary"
              onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])}
            />
            {mediaState.error && <p className="mt-2 text-sm text-red-400">{mediaState.error}</p>}
            {mediaState.status === "uploading" && <p className="mt-2 text-sm text-text-secondary">Uploading...</p>}
            {mediaState.status === "done" && (
              <p className="mt-2 text-sm text-green-400">Uploaded. One media item per guest.</p>
            )}
            {media && (
              <div className="mt-4">
                {media.mediaType === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(media.objectKey)} alt="Your upload" className="max-h-96 rounded-xl" />
                )}
                {media.mediaType === "video" && (
                  <video src={mediaUrl(media.objectKey)} controls className="max-h-96 w-full rounded-xl" />
                )}
                {media.mediaType === "voice_note" && (
                  <audio src={mediaUrl(media.objectKey)} controls className="w-full" />
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
