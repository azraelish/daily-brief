export type AssetKind = "crypto" | "etf";
export type TxType = "buy" | "sell";

export type Asset = {
  id: string;
  kind: AssetKind;
  symbol: string;
  name: string;
  currency: string;
  yahoo_ticker: string | null;
  coingecko_id: string | null;
  pea_eligible: boolean;
};

export type AssetPrice = {
  asset_id: string;
  price: number;
  currency: string;
  source: string;
  fetched_at: string;
  manual_override: boolean;
};

export type Transaction = {
  id: string;
  asset_id: string;
  type: TxType;
  quantity: number;
  price: number;
  fees: number;
  occurred_at: string;
  notes: string | null;
};

export type AssetSummary = {
  asset: Asset;
  price: AssetPrice | null;
  transactions: Transaction[];
  holdings: number;
  totalCost: number;       // Σ(qty*price + fees) for buys, minus proceeds from sells
  totalProceeds: number;   // Σ(qty*price - fees) for sells
  avgNetCost: number | null; // null if holdings = 0
  currentValue: number | null; // null if no price
  unrealisedPnl: number | null;
  unrealisedPnlPct: number | null;
};

export type PortfolioView = {
  bySection: {
    crypto: AssetSummary[];
    etf: AssetSummary[];
  };
  totalsByCurrency: Record<string, { totalCost: number; currentValue: number | null }>;
};
