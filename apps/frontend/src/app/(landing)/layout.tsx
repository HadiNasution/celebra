import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/demo", label: "Demo" },
  { href: "/contact", label: "Contact" },
];

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-secondary/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-2xl font-medium text-primary">
            Celebra
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/login"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary transition-opacity hover:opacity-90"
          >
            Login
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/10 py-8 text-center">
        <p className="text-sm text-text-secondary">
          &copy; {new Date().getFullYear()} Celebra. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
