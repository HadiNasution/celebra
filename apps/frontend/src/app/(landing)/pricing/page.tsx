import Link from "next/link";

const plans = [
  {
    name: "1 Month",
    price: "$9",
    period: "month",
    features: ["1 invitation", "All templates", "Guest management", "RSVP tracking", "Basic support"],
    cta: "Start Trial",
    highlight: false,
  },
  {
    name: "3 Months",
    price: "$20",
    period: "3 months",
    features: [
      "Up to 3 invitations",
      "All templates",
      "Guest management",
      "RSVP tracking",
      "QR check-in",
      "Priority support",
    ],
    cta: "Start Trial",
    highlight: true,
  },
  {
    name: "6 Months",
    price: "$35",
    period: "6 months",
    features: [
      "Up to 10 invitations",
      "All templates + premium",
      "Guest management",
      "RSVP tracking",
      "QR check-in",
      "Priority support",
    ],
    cta: "Start Trial",
    highlight: false,
  },
  {
    name: "12 Months",
    price: "$59",
    period: "year",
    features: [
      "Unlimited invitations",
      "All templates + premium",
      "Guest management",
      "RSVP tracking",
      "QR check-in",
      "Dedicated support",
    ],
    cta: "Start Trial",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-center font-display text-4xl font-medium md:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-center text-text-secondary">
          Choose a plan that fits your event. Pay once, host as long as your plan covers.
        </p>
        <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-8 ${
                plan.highlight
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <h3 className="font-display text-xl font-medium">{plan.name}</h3>
              <div className="mt-4">
                <span className="font-display text-4xl font-medium">{plan.price}</span>
                <span className="text-text-secondary">/{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-primary">&check;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/checkout"
                className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 ${
                  plan.highlight
                    ? "bg-primary text-secondary"
                    : "border border-white/20 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
