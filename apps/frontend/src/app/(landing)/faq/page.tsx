const faqs = [
  {
    q: "What is Celebra?",
    a: "Celebra is a platform for creating website-based digital invitations. You pick a template, fill in your event details, and publish — no coding or design skills needed.",
  },
  {
    q: "How do I get started?",
    a: "Choose a plan on the checkout page, fill in your details, and complete the payment. You will receive your login credentials immediately.",
  },
  {
    q: "Can I use my own domain?",
    a: "Custom domains are coming in a future update. For now, all invitations are published under celebra.com/your-slug.",
  },
  {
    q: "What types of events can I create invitations for?",
    a: "Weddings, birthdays, family gatherings, school events, corporate events, seminars, graduations, and more. We have templates for every occasion.",
  },
  {
    q: "Can guests RSVP online?",
    a: "Yes. Each guest receives a unique link. They can RSVP, leave a guestbook message, and even upload a photo or video.",
  },
  {
    q: "How does QR check-in work?",
    a: "Each guest gets a unique QR code. At the event, staff can scan the code with our PWA scanner. It works offline and syncs when internet is available.",
  },
  {
    q: "What happens when my subscription expires?",
    a: "Your public invitation becomes inactive, but your dashboard remains accessible so you can renew your subscription at any time.",
  },
  {
    q: "Can I customize the design?",
    a: "Yes. The visual editor lets you change colors, images, music, and all content. Templates define the layout; you fill in the details.",
  },
];

export default function FaqPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-center font-display text-4xl font-medium md:text-5xl">
          Frequently Asked Questions
        </h1>
        <div className="mt-14 space-y-6">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <summary className="cursor-pointer font-semibold list-none">
                {faq.q}
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
