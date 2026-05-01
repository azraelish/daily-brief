import type { Asset } from "./types";

const YAHOO_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export type SpotPrice = {
  price: number;
  currency: string;
  source: string;
};

export type HistoryPoint = {
  date: string; // YYYY-MM-DD
  price: number;
};

async function fetchYahooSpot(ticker: string): Promise<SpotPrice | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; currency?: string } }> };
    };
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;
    return {
      price: meta.regularMarketPrice,
      currency: String(meta.currency || "USD").toUpperCase(),
      source: "yahoo",
    };
  } catch {
    return null;
  }
}

async function fetchCoinGeckoSpot(coinId: string, vs = "usd"): Promise<SpotPrice | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${vs}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, Record<string, number>>;
    const p = json?.[coinId]?.[vs];
    if (typeof p !== "number") return null;
    return { price: p, currency: vs.toUpperCase(), source: "coingecko" };
  } catch {
    return null;
  }
}

export async function fetchSpotPrice(asset: Asset): Promise<SpotPrice | null> {
  if (asset.coingecko_id) {
    const r = await fetchCoinGeckoSpot(asset.coingecko_id, asset.currency.toLowerCase());
    if (r) return r;
  }
  if (asset.yahoo_ticker) {
    return fetchYahooSpot(asset.yahoo_ticker);
  }
  return null;
}

async function fetchYahooHistory(ticker: string, days: number): Promise<HistoryPoint[] | null> {
  try {
    const range =
      days <= 5 ? "5d" : days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 180 ? "6mo" : "1y";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const r = json.chart?.result?.[0];
    const stamps = r?.timestamp ?? [];
    const closes = r?.indicators?.quote?.[0]?.close ?? [];
    const points: HistoryPoint[] = [];
    for (let i = 0; i < stamps.length; i++) {
      const ts = stamps[i];
      const c = closes[i];
      if (typeof ts !== "number" || c == null || !Number.isFinite(c)) continue;
      const d = new Date(ts * 1000).toISOString().slice(0, 10);
      points.push({ date: d, price: Number(c) });
    }
    return points;
  } catch {
    return null;
  }
}

async function fetchCoinGeckoHistory(
  coinId: string,
  days: number,
  vs = "usd",
): Promise<HistoryPoint[] | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=${vs}&days=${days}&interval=daily`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { prices?: Array<[number, number]> };
    const arr = json.prices ?? [];
    const map = new Map<string, number>();
    // CoinGecko returns one snapshot per day; if duplicates, keep the last.
    for (const [ts, p] of arr) {
      const d = new Date(ts).toISOString().slice(0, 10);
      map.set(d, Number(p));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, price]) => ({ date, price }));
  } catch {
    return null;
  }
}

export async function fetchHistory(asset: Asset, days: number): Promise<HistoryPoint[] | null> {
  if (asset.coingecko_id) {
    return fetchCoinGeckoHistory(asset.coingecko_id, days, asset.currency.toLowerCase());
  }
  if (asset.yahoo_ticker) {
    return fetchYahooHistory(asset.yahoo_ticker, days);
  }
  return null;
}
