import Link from "next/link";

const features = [
  {
    title: "No-Code Editor",
    description:
      "Fill in a simple form and see your invitation update live. No drag-and-drop, just results.",
  },
  {
    title: "Beautiful Templates",
    description:
      "Professionally designed templates for weddings, birthdays, graduations, and more.",
  },
  {
    title: "Guest Management",
    description: "Import guests via CSV, track RSVPs, generate QR codes. Everything in one place.",
  },
  {
    title: "Publish Instantly",
    description: "Your invitation goes live as a real website. Share the link anywhere.",
  },
  {
    title: "QR Check-in",
    description: "Scan guests at the door. Works offline. Syncs when you're back online.",
  },
  {
    title: "Multi-language",
    description: "Support for multiple languages so every guest feels welcome.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden px-6 pb-20 pt-24 md:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="font-display text-5xl leading-tight font-medium tracking-tight md:text-7xl">
            Beautiful Invitations
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-text-secondary md:text-xl">
            Create stunning website-based digital invitations for any event. No code, no
            design skills — just fill a form and publish.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/checkout"
              className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-secondary transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-white/20 px-8 py-3 text-base font-medium transition-colors hover:bg-white/5"
            >
              See Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-text-secondary">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-medium md:text-4xl">
            Everything You Need
          </h2>
          <p className="mt-4 text-center text-text-secondary">
            All the tools to create, manage, and share your invitations.
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-display text-xl font-medium">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-primary/10 p-10 text-center">
          <h2 className="font-display text-3xl font-medium md:text-4xl">
            Ready to create your invitation?
          </h2>
          <p className="mt-4 text-text-secondary">
            Start your 14-day free trial. No credit card required.
          </p>
          <Link
            href="/checkout"
            className="mt-8 inline-block rounded-full bg-primary px-8 py-3 text-base font-semibold text-secondary transition-opacity hover:opacity-90"
          >
            Start Free Trial
          </Link>
        </div>
      </section>
    </>
  );
}
