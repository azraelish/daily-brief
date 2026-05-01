import { NextResponse, type NextRequest } from "next/server";
import { getOwnerUser } from "@/lib/auth/server";
import { refreshPortfolioPrices } from "@/lib/portfolio/refresh-prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized(req: NextRequest): Promise<boolean> {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Owner session is also allowed (used by the in-app "Refresh prices" button).
  const user = await getOwnerUser();
  return Boolean(user);
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const outcomes = await refreshPortfolioPrices();
    const ok = outcomes.filter((o) => o.ok).length;
    return NextResponse.json({ ok: true, fetched: ok, outcomes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("refresh-prices failed:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-vercel-cron") === "1") return POST(req);
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
