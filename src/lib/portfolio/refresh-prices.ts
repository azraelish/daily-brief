import { serviceClient } from "@/lib/supabase";
import { fetchHistory, fetchSpotPrice } from "./prices-fetch";
import type { Asset } from "./types";

const HISTORY_BACKFILL_DAYS = 90;
const HISTORY_THRESHOLD = 30; // backfill if we have fewer than this many days

export type RefreshOutcome = {
  asset_id: string;
  ok: boolean;
  reason?: string;
  price?: number;
  source?: string;
  backfilled?: number;
};

export async function refreshPortfolioPrices(): Promise<RefreshOutcome[]> {
  const sb = serviceClient();

  const [{ data: assets, error: aErr }, { data: existing, error: eErr }] = await Promise.all([
    sb.from("assets").select("*"),
    sb.from("asset_prices").select("asset_id, manual_override"),
  ]);
  if (aErr) throw new Error(`assets: ${aErr.message}`);
  if (eErr) throw new Error(`asset_prices: ${eErr.message}`);

  const overrides = new Set(
    (existing ?? []).filter((p) => p.manual_override).map((p) => p.asset_id),
  );

  const today = new Date().toISOString().slice(0, 10);
  const out: RefreshOutcome[] = [];

  for (const a of (assets ?? []) as Asset[]) {
    if (overrides.has(a.id)) {
      out.push({ asset_id: a.id, ok: true, reason: "manual override" });
      continue;
    }

    const spot = await fetchSpotPrice(a);
    if (!spot) {
      out.push({ asset_id: a.id, ok: false, reason: "no fetcher returned a price" });
      continue;
    }

    // Update the live price cache.
    const upPrice = await sb.from("asset_prices").upsert(
      {
        asset_id: a.id,
        price: spot.price,
        currency: spot.currency,
        source: spot.source,
        manual_override: false,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "asset_id" },
    );
    if (upPrice.error) {
      out.push({ asset_id: a.id, ok: false, reason: `prices: ${upPrice.error.message}` });
      continue;
    }

    // Append today's snapshot to history (so charts have something).
    const upHist = await sb.from("asset_price_history").upsert(
      {
        asset_id: a.id,
        date: today,
        price: spot.price,
        currency: spot.currency,
      },
      { onConflict: "asset_id,date" },
    );
    if (upHist.error) {
      out.push({
        asset_id: a.id,
        ok: false,
        reason: `history today: ${upHist.error.message}`,
      });
      continue;
    }

    // Backfill history if we don't yet have enough.
    const { count } = await sb
      .from("asset_price_history")
      .select("*", { count: "exact", head: true })
      .eq("asset_id", a.id);
    let backfilled = 0;
    if ((count ?? 0) < HISTORY_THRESHOLD) {
      const hist = await fetchHistory(a, HISTORY_BACKFILL_DAYS);
      if (hist && hist.length > 0) {
        const rows = hist.map((p) => ({
          asset_id: a.id,
          date: p.date,
          price: p.price,
          currency: spot.currency,
        }));
        const upBackfill = await sb
          .from("asset_price_history")
          .upsert(rows, { onConflict: "asset_id,date" });
        if (!upBackfill.error) backfilled = rows.length;
      }
    }

    out.push({
      asset_id: a.id,
      ok: true,
      price: spot.price,
      source: spot.source,
      backfilled,
    });
  }

  return out;
}
