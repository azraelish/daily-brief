"use server";

import { headers } from "next/headers";
import { supabaseServer, ownerEmail } from "@/lib/auth/server";

export type SignInState = { ok: boolean; message: string };

export async function sendMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  // Always return the same message — never reveal whether an email is the owner.
  const generic: SignInState = {
    ok: true,
    message: "If your email is authorized, a sign-in link is on its way. Check your inbox.",
  };

  if (email !== ownerEmail()) {
    // Silently no-op for non-owner emails to avoid spamming Supabase quota
    // and to avoid telling attackers which email is the right one.
    return generic;
  }

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const redirectTo = host ? `${proto}://${host}/auth/callback` : undefined;

  const sb = supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });

  if (error) {
    console.error("signInWithOtp failed:", error);
    // Show the rate-limit message specifically — it's a useful signal for the
    // owner without leaking which email is allowlisted.
    if (error.status === 429) {
      return {
        ok: false,
        message: "Email rate limit reached. Try again in about an hour.",
      };
    }
    return { ok: false, message: "Couldn't send the link. Try again in a moment." };
  }
  return generic;
}
