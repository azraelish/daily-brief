import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, ownerEmail } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/portfolio";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=missing_code", url.origin));
  }

  const sb = supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("exchangeCodeForSession failed:", error);
    return NextResponse.redirect(new URL("/auth/sign-in?error=exchange_failed", url.origin));
  }

  // Hard email allowlist — sign out anyone who isn't the owner.
  const email = (data.user.email ?? "").toLowerCase();
  if (email !== ownerEmail()) {
    await sb.auth.signOut();
    return NextResponse.redirect(new URL("/auth/sign-in?error=not_authorized", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
