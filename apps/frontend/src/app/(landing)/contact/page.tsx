"use client";

import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(formData: FormData) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        message: formData.get("message"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <section className="flex-1 px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-4xl font-medium md:text-5xl">Thank You!</h1>
          <p className="mt-4 text-text-secondary">We will get back to you shortly.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-lg">
        <h1 className="text-center font-display text-4xl font-medium md:text-5xl">
          Get in Touch
        </h1>
        <p className="mt-4 text-center text-text-secondary">
          Have a question? Send us a message and we will reply within 24 hours.
        </p>
        <form action={handleSubmit} className="mt-10 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/50"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/50"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/50"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90"
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}
