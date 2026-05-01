import type { Asset, AssetPrice, AssetSummary, Transaction } from "./types";

/**
 * Per-transaction PNL at the current price:
 *   pnl = qty * (currentPrice - txPrice) - fees   (buy)
 *   pnl = qty * (txPrice - currentPrice) + fees   (sell, locked-in)
 * Returns null when no current price is available.
 */
export function txPnl(tx: Transaction, currentPrice: number | null): number | null {
  if (currentPrice == null) return null;
  if (tx.type === "buy") {
    return tx.quantity * (currentPrice - tx.price) - tx.fees;
  }
  return tx.quantity * (tx.price - currentPrice) + tx.fees;
}

export function summarise(
  asset: Asset,
  transactions: Transaction[],
  price: AssetPrice | null,
  history: { date: string; price: number }[] = [],
): AssetSummary {
  let holdings = 0;
  let totalCost = 0;
  let totalProceeds = 0;

  for (const tx of transactions) {
    if (tx.type === "buy") {
      holdings += Number(tx.quantity);
      totalCost += Number(tx.quantity) * Number(tx.price) + Number(tx.fees);
    } else {
      holdings -= Number(tx.quantity);
      totalProceeds += Number(tx.quantity) * Number(tx.price) - Number(tx.fees);
    }
  }

  const avgNetCost = holdings > 0 ? totalCost / holdings : null;
  const currentValue = price ? holdings * Number(price.price) : null;
  const unrealisedPnl = currentValue != null ? currentValue - totalCost : null;
  const unrealisedPnlPct =
    unrealisedPnl != null && totalCost > 0 ? (unrealisedPnl / totalCost) * 100 : null;

  return {
    asset,
    price,
    history,
    transactions,
    holdings,
    totalCost,
    totalProceeds,
    avgNetCost,
    currentValue,
    unrealisedPnl,
    unrealisedPnlPct,
  };
}

export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: opts.compact ? 0 : 2,
  }).format(amount);
}

export function formatQty(qty: number, kind: "crypto" | "etf"): string {
  if (kind === "crypto") {
    return qty.toLocaleString("en-US", { maximumFractionDigits: 8 });
  }
  return qty.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
