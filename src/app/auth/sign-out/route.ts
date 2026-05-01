import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

async function signOut(req: NextRequest) {
  const sb = supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(req.url).origin));
}

export async function POST(req: NextRequest) {
  return signOut(req);
}

// Allow GET for convenience (clicking a link).
export async function GET(req: NextRequest) {
  return signOut(req);
}
