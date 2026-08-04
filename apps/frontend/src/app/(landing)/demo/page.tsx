import Link from "next/link";

export default function DemoPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-display text-4xl font-medium md:text-5xl">See Celebra in Action</h1>
        <p className="mt-4 text-text-secondary">
          Watch how easy it is to create and publish a digital invitation.
        </p>
        <div className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="flex aspect-video items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/20">
                <svg
                  className="size-8 text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-text-secondary">
                Demo video coming soon. Create your first invitation today.
              </p>
              <Link
                href="/checkout"
                className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
