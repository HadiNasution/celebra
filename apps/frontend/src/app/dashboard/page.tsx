"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (!user) return <p className="p-8 text-text-secondary">Loading...</p>;

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="font-display text-2xl font-medium">Dashboard</h1>
      <p className="mt-4 text-text-secondary">
        Logged in as <span className="text-white">{user.email}</span>
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Customer dashboard tersedia di Step 5.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/admin" className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-secondary">
          Admin Panel
        </Link>
        <Link href="/checkout" className="rounded-full border border-white/20 px-6 py-2 text-sm">
          New Invitation
        </Link>
      </div>
    </div>
  );
}
