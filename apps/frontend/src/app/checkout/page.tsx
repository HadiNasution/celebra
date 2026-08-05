"use client";

import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    value: "1_month",
    name: "1 Month",
    price: "$9",
    period: "month",
    features: ["1 invitation", "All templates", "Guest management", "RSVP tracking", "Basic support"],
    highlight: false,
  },
  {
    value: "3_months",
    name: "3 Months",
    price: "$20",
    period: "3 months",
    features: ["Up to 3 invitations", "All templates", "Guest management", "RSVP tracking", "QR check-in", "Priority support"],
    highlight: true,
  },
  {
    value: "6_months",
    name: "6 Months",
    price: "$35",
    period: "6 months",
    features: ["Up to 10 invitations", "All templates + premium", "Guest management", "RSVP tracking", "QR check-in", "Priority support"],
    highlight: false,
  },
  {
    value: "12_months",
    name: "12 Months",
    price: "$59",
    period: "year",
    features: ["Unlimited invitations", "All templates + premium", "Guest management", "RSVP tracking", "QR check-in", "Dedicated support"],
    highlight: false,
  },
];

export default function CheckoutPage() {
  const [plan, setPlan] = useState("3_months");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
      const res = await fetch(`${apiUrl}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // ponytail: auto-confirm payment in mock mode
      if (data.invoiceUrl.includes("mock=1")) {
        await fetch(`${apiUrl}/checkout/mock-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: data.paymentId }),
        });
        window.location.href = "/checkout/success";
        return;
      }

      window.location.href = data.invoiceUrl;
    } catch {
      setError("Could not connect to server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <Link href="/pricing" className="text-sm text-text-secondary hover:text-white">
          &larr; Back to pricing
        </Link>
        <h1 className="mt-6 font-display text-3xl font-medium md:text-4xl">Checkout</h1>
        <p className="mt-2 text-text-secondary">Select your plan and complete your details.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlan(p.value)}
                className={`flex flex-col items-start rounded-2xl border p-5 text-left transition-colors ${
                  plan === p.value
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="mt-2 font-display text-2xl font-medium">{p.price}</span>
                <span className="text-xs text-text-secondary">/{p.period}</span>
                <ul className="mt-3 space-y-1">
                  {p.features.slice(0, 3).map((f) => (
                    <li key={f} className="text-xs text-text-secondary">&bull; {f}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">Full Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/50"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium">Phone (optional)</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary/50"
                placeholder="+628123456789"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name || !email}
            className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
