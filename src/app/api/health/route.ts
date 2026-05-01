import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase";
import { todayUTC } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = publicClient();
  const { data, error } = await sb
    .from("brief_snapshots")
    .select("brief_date,created_at,btc_price,salad_ids")
    .order("brief_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, reason: "no snapshot in db" }, { status: 200 });
  }

  const today = todayUTC();
  const ageHours =
    (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60);
  const isToday = data.brief_date === today;
  const stale = !isToday;

  return NextResponse.json({
    ok: !stale,
    today,
    latestBriefDate: data.brief_date,
    isToday,
    stale,
    ageHours: Math.round(ageHours * 10) / 10,
    lastRefreshedAt: data.created_at,
    btcPrice: Number(data.btc_price),
    saladIds: data.salad_ids,
  });
}
