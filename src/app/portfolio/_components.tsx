import { formatMoney, formatPct, formatQty, txPnl } from "@/lib/portfolio/calc";
import type { Asset, AssetSummary, Transaction } from "@/lib/portfolio/types";
import { PriceOverrideButton, RowActions } from "./_toolbar";
import { Sparkline } from "./_sparkline";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
      {children}
    </h2>
  );
}

export function TotalsBar({
  totalsByCurrency,
}: {
  totalsByCurrency: Record<string, { totalCost: number; currentValue: number | null }>;
}) {
  const entries = Object.entries(totalsByCurrency);
  if (entries.length === 0) return null;
  return (
    <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([cur, t]) => {
        const pnl = t.currentValue != null ? t.currentValue - t.totalCost : null;
        const pnlPct = pnl != null && t.totalCost > 0 ? (pnl / t.totalCost) * 100 : null;
        return (
          <div key={cur} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="text-xs uppercase tracking-widest text-neutral-500">
              {cur === "USD" ? "Crypto (USD)" : cur === "EUR" ? "ETFs (EUR)" : `Total (${cur})`}
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-mono text-2xl">
                {t.currentValue != null ? formatMoney(t.currentValue, cur) : "—"}
              </span>
              {pnl != null ? (
                <span
                  className={`text-sm font-medium ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {pnl >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(pnl), cur)}{" "}
                  {pnlPct != null ? `(${formatPct(pnlPct)})` : null}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Total cost: {formatMoney(t.totalCost, cur)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HoldingHeader({ summary }: { summary: AssetSummary }) {
  const { asset, price, history, holdings, totalCost, avgNetCost, currentValue, unrealisedPnl, unrealisedPnlPct } =
    summary;
  const cur = asset.currency;
  const sparkPositive =
    history.length >= 2 ? history[history.length - 1].price >= history[0].price : undefined;
  const fetchedAt = price
    ? new Date(price.fetched_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;
  return (
    <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl font-semibold">{asset.name}</h3>
            <span className="text-xs text-neutral-500">{asset.symbol}</span>
            {asset.pea_eligible ? (
              <span className="rounded-full border border-emerald-700/50 px-2 py-0.5 text-[10px] uppercase tracking-widest text-emerald-300/80">
                PEA
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-sm text-neutral-400">
            {price ? (
              <>
                <span>{formatMoney(Number(price.price), cur)} / unit</span>
                <PriceOverrideButton asset={asset} price={price} />
                <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                  {price.manual_override ? "manual" : price.source} · {fetchedAt}
                </span>
              </>
            ) : (
              <>
                <span>price not fetched yet</span>
                <PriceOverrideButton asset={asset} price={null} />
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl">
            {currentValue != null ? formatMoney(currentValue, cur) : "—"}
          </div>
          {unrealisedPnl != null ? (
            <div
              className={`text-sm ${unrealisedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {unrealisedPnl >= 0 ? "▲" : "▼"}{" "}
              {formatMoney(Math.abs(unrealisedPnl), cur)}{" "}
              {unrealisedPnlPct != null ? `(${formatPct(unrealisedPnlPct)})` : null}
            </div>
          ) : null}
        </div>
      </div>
      {history.length >= 2 ? (
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-neutral-800 pt-3">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">
            Last 30 days
          </span>
          <Sparkline history={history} positive={sparkPositive} />
        </div>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Stat label="Holdings" value={`${formatQty(holdings, asset.kind)} ${asset.symbol}`} />
        <Stat label="Total cost" value={formatMoney(totalCost, cur)} />
        <Stat
          label="Avg net cost"
          value={avgNetCost != null ? formatMoney(avgNetCost, cur) : "—"}
        />
        <Stat
          label="P/L"
          value={
            unrealisedPnl != null
              ? `${unrealisedPnl >= 0 ? "+" : "-"}${formatMoney(Math.abs(unrealisedPnl), cur)}`
              : "—"
          }
        />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

export function TxTable({ summary, assets }: { summary: AssetSummary; assets: Asset[] }) {
  const { asset, price, transactions } = summary;
  const cur = asset.currency;
  const currentPrice = price ? Number(price.price) : null;
  const count = transactions.length;
  return (
    <details className="group rounded-lg border border-neutral-800 bg-neutral-900/20">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-900/40">
        <span className="flex items-center gap-2">
          <span className="text-neutral-500 transition-transform group-open:rotate-90">▸</span>
          <span>
            <span className="font-medium">Transactions</span>{" "}
            <span className="text-neutral-500">({count})</span>
          </span>
        </span>
        <span className="text-xs uppercase tracking-widest text-neutral-500 group-open:hidden">
          Show
        </span>
        <span className="hidden text-xs uppercase tracking-widest text-neutral-500 group-open:inline">
          Hide
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-neutral-800">
        <table className="min-w-full text-sm">
        <thead className="bg-neutral-900/60 text-xs uppercase tracking-widest text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-right font-medium">Price</th>
            <th className="px-3 py-2 text-right font-medium">Quantity</th>
            <th className="px-3 py-2 text-right font-medium">Date</th>
            <th className="px-3 py-2 text-right font-medium">Fees</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
            <th className="px-3 py-2 text-right font-medium">P/L</th>
            <th className="px-3 py-2 text-right font-medium" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              currentPrice={currentPrice}
              cur={cur}
              kind={asset.kind}
              assets={assets}
            />
          ))}
        </tbody>
      </table>
      </div>
    </details>
  );
}

function TxRow({
  tx,
  currentPrice,
  cur,
  kind,
  assets,
}: {
  tx: Transaction;
  currentPrice: number | null;
  cur: string;
  kind: "crypto" | "etf";
  assets: Asset[];
}) {
  const pnl = txPnl(tx, currentPrice);
  const cost = Number(tx.quantity) * Number(tx.price) + Number(tx.fees);
  const date = new Date(tx.occurred_at).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const sign = tx.type === "buy" ? "+" : "-";
  return (
    <tr className="border-t border-neutral-800/60">
      <td className="px-3 py-2">
        <span
          className={`text-xs uppercase tracking-widest ${tx.type === "buy" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {tx.type}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-mono">{formatMoney(Number(tx.price), cur)}</td>
      <td
        className={`px-3 py-2 text-right font-mono ${tx.type === "buy" ? "text-emerald-400" : "text-rose-400"}`}
      >
        {sign}
        {formatQty(Number(tx.quantity), kind)}
      </td>
      <td className="px-3 py-2 text-right text-neutral-400">{date}</td>
      <td className="px-3 py-2 text-right font-mono text-neutral-400">
        {Number(tx.fees) > 0 ? formatMoney(Number(tx.fees), cur) : "—"}
      </td>
      <td className="px-3 py-2 text-right font-mono">{formatMoney(cost, cur)}</td>
      <td
        className={`px-3 py-2 text-right font-mono ${pnl == null ? "text-neutral-500" : pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
      >
        {pnl == null ? "—" : `${pnl >= 0 ? "+" : "-"}${formatMoney(Math.abs(pnl), cur)}`}
      </td>
      <td className="px-3 py-2 text-right">
        <RowActions tx={tx} assets={assets} />
      </td>
    </tr>
  );
}

export function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/20 p-6 text-sm text-neutral-500">
      {children}
    </p>
  );
}
