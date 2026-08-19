import PublicWidgets, { TemplateFrame } from "./widgets";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ponytail: force-dynamic for MVP; move to ISR (revalidate 60s) once the publish flow is stable
export const dynamic = "force-dynamic";

type PublicInvitationData = {
  title: string;
  html: string;
  guest: { name: string } | null;
};

export default async function PublicInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ guest?: string }>;
}) {
  const { slug } = await params;
  const { guest } = await searchParams;

  const res = await fetch(
    `${apiUrl}/public/invitation/${slug}${guest ? `?guest=${encodeURIComponent(guest)}` : ""}`,
    { cache: "no-store" },
  );
  const data: PublicInvitationData | null = res.ok ? await res.json() : null;

  if (!data) {
    const message =
      res.status === 403
        ? "This invitation is no longer available. Please contact the host."
        : res.status === 410
          ? "This invitation has been archived."
          : "Invitation not found.";
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-medium">Invitation unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TemplateFrame title={data.title} html={data.html} />
      <PublicWidgets
        slug={slug}
        apiUrl={apiUrl}
        guestToken={guest ?? null}
        guestName={data.guest?.name ?? null}
      />
    </div>
  );
}
