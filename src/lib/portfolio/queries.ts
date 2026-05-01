import { supabaseServer } from "@/lib/auth/server";
import { summarise } from "./calc";
import type { Asset, AssetPrice, PortfolioView, Transaction, AssetSummary } from "./types";

export async function loadPortfolio(): Promise<PortfolioView> {
  const sb = supabaseServer();

  const [txRes, assetsRes, pricesRes] = await Promise.all([
    sb
      .from("transactions")
      .select("id, asset_id, type, quantity, price, fees, occurred_at, notes")
      .order("occurred_at", { ascending: false }),
    sb.from("assets").select("*"),
    sb.from("asset_prices").select("*"),
  ]);

  if (txRes.error) throw new Error(`transactions: ${txRes.error.message}`);
  if (assetsRes.error) throw new Error(`assets: ${assetsRes.error.message}`);
  if (pricesRes.error) throw new Error(`asset_prices: ${pricesRes.error.message}`);

  const transactions = (txRes.data ?? []) as Transaction[];
  const assets = (assetsRes.data ?? []) as Asset[];
  const prices = (pricesRes.data ?? []) as AssetPrice[];

  const priceByAsset = new Map(prices.map((p) => [p.asset_id, p]));
  const txByAsset = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = txByAsset.get(tx.asset_id);
    if (list) list.push(tx);
    else txByAsset.set(tx.asset_id, [tx]);
  }

  // Only include assets that have transactions, ordered by total cost desc
  // within each section.
  const summaries: AssetSummary[] = [];
  for (const asset of assets) {
    const txs = txByAsset.get(asset.id);
    if (!txs || txs.length === 0) continue;
    summaries.push(summarise(asset, txs, priceByAsset.get(asset.id) ?? null));
  }

  summaries.sort((a, b) => b.totalCost - a.totalCost);

  const crypto = summaries.filter((s) => s.asset.kind === "crypto");
  const etf = summaries.filter((s) => s.asset.kind === "etf");

  const totalsByCurrency: PortfolioView["totalsByCurrency"] = {};
  for (const s of summaries) {
    const cur = s.asset.currency;
    const slot = totalsByCurrency[cur] ?? { totalCost: 0, currentValue: 0 as number | null };
    slot.totalCost += s.totalCost;
    if (slot.currentValue != null && s.currentValue != null) {
      slot.currentValue += s.currentValue;
    } else {
      slot.currentValue = null; // missing price for any holding → can't aggregate
    }
    totalsByCurrency[cur] = slot;
  }

  return {
    bySection: { crypto, etf },
    totalsByCurrency,
  };
}
