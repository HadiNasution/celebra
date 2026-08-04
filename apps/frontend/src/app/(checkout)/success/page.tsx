import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
          <span className="text-3xl">&check;</span>
        </div>
        <h1 className="mt-6 font-display text-3xl font-medium">Payment Successful</h1>
        <p className="mt-4 text-text-secondary">
          Your account is being created. Check your email for login credentials and your dashboard link.
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Don&apos;t see the email? Check your spam folder.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-full bg-primary px-8 py-3 text-base font-semibold text-secondary transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
