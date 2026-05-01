import { publicClient } from "./supabase";
import type { BriefSnapshot, BriefView, Salad } from "./types";
import { todayUTC } from "./date";
import { headers } from "next/headers";

async function loadLatestSnapshot(): Promise<BriefSnapshot | null> {
  const sb = publicClient();
  const { data, error } = await sb
    .from("brief_snapshots")
    .select("*")
    .order("brief_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BriefSnapshot | null) ?? null;
}

async function loadSalads(ids: number[]): Promise<Salad[]> {
  if (ids.length === 0) return [];
  const sb = publicClient();
  const { data, error } = await sb.from("salads").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  const byId = new Map<number, Salad>((data ?? []).map((s) => [s.id, s as Salad]));
  return ids.map((id) => byId.get(id)).filter((s): s is Salad => Boolean(s));
}

async function triggerRefresh(): Promise<void> {
  const secret = process.env.CRON_SECRET;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host || !secret) return;
  try {
    await fetch(`${proto}://${host}/api/refresh`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("render-time refresh failed:", err);
  }
}

export async function getBriefView(): Promise<BriefView | null> {
  let snap = await loadLatestSnapshot();
  if (!snap || snap.brief_date !== todayUTC()) {
    await triggerRefresh();
    snap = await loadLatestSnapshot();
  }
  if (!snap) return null;
  const salads = await loadSalads(snap.salad_ids);
  return {
    briefDate: snap.brief_date,
    btcPrice: Number(snap.btc_price),
    btcChange24h: Number(snap.btc_change_24h),
    headlines: snap.headlines,
    cryptoHeadlines: snap.crypto_headlines ?? [],
    salads,
    refreshedAt: snap.created_at,
  };
}
