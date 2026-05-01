import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { fetchBitcoin, fetchCryptoHeadlines, fetchHeadlines } from "@/lib/sources";
import { pickSalads } from "@/lib/salads";
import { todayUTC, yesterdayUTC } from "@/lib/date";
import { refreshPortfolioPrices } from "@/lib/portfolio/refresh-prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function doRefresh() {
  const sb = serviceClient();
  const today = todayUTC();
  const yesterday = yesterdayUTC();

  const [{ price, change24h }, headlines, cryptoHeadlines, allSaladsRes, ySnap] = await Promise.all([
    fetchBitcoin(),
    fetchHeadlines(),
    fetchCryptoHeadlines(),
    sb.from("salads").select("id"),
    sb.from("brief_snapshots").select("salad_ids").eq("brief_date", yesterday).maybeSingle(),
  ]);

  if (allSaladsRes.error) throw new Error(`salads: ${allSaladsRes.error.message}`);
  const allIds = (allSaladsRes.data ?? []).map((r) => r.id as number);
  const exclude = (ySnap.data?.salad_ids ?? []) as number[];
  const saladIds = pickSalads(allIds, exclude, today);

  const { data, error } = await sb
    .from("brief_snapshots")
    .upsert(
      {
        brief_date: today,
        btc_price: price,
        btc_change_24h: change24h,
        headlines,
        crypto_headlines: cryptoHeadlines,
        salad_ids: saladIds,
      },
      { onConflict: "brief_date" },
    )
    .select()
    .single();

  if (error) throw new Error(`upsert: ${error.message}`);

  // Best-effort portfolio price refresh — log failures but don't fail the brief.
  try {
    await refreshPortfolioPrices();
  } catch (err) {
    console.error("portfolio price refresh failed (non-fatal):", err);
  }

  return data;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const data = await doRefresh();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("refresh failed:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-vercel-cron") === "1") return POST(req);
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
