"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE = "celebra_session";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function loginAction(
  email: string,
  password: string,
): Promise<{ error?: string; role?: string }> {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 429) return { error: "Too many attempts. Try again later." };
    return { error: "Invalid email or password." };
  }

  const data = await res.json();
  const store = await cookies();
  store.set(AUTH_COOKIE, data.token as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return { role: data.user.role as string };
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}
