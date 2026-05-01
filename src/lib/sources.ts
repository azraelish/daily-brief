import { XMLParser } from "fast-xml-parser";
import type { Headline } from "./types";

const UA = "DailyBrief/1.0 (+https://github.com/)";

export async function fetchBitcoin(): Promise<{ price: number; change24h: number }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
    { headers: { "User-Agent": UA }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = (await res.json()) as { bitcoin?: { usd?: number; usd_24h_change?: number } };
  const price = json.bitcoin?.usd;
  const change24h = json.bitcoin?.usd_24h_change;
  if (typeof price !== "number" || typeof change24h !== "number") {
    throw new Error("CoinGecko returned malformed payload");
  }
  return { price, change24h };
}

type GNewsResponse = {
  articles?: Array<{
    title: string;
    url: string;
    publishedAt: string;
    source?: { name?: string };
  }>;
};

async function fetchGNews(apiKey: string): Promise<Headline[]> {
  const url = new URL("https://gnews.io/api/v4/top-headlines");
  url.searchParams.set("category", "world");
  url.searchParams.set("lang", "en");
  url.searchParams.set("max", "10");
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GNews ${res.status}`);
  const json = (await res.json()) as GNewsResponse;
  const arts = json.articles ?? [];
  return arts.slice(0, 10).map((a) => ({
    title: a.title,
    source: a.source?.name ?? "Unknown",
    url: a.url,
    publishedAt: a.publishedAt,
  }));
}

async function fetchBBCRSS(): Promise<Headline[]> {
  const res = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml", {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BBC RSS ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: Array<{ title: string; link: string; pubDate: string }> } };
  };
  const items = parsed.rss?.channel?.item ?? [];
  return items.slice(0, 10).map((it) => ({
    title: it.title,
    source: "BBC News",
    url: it.link,
    publishedAt: new Date(it.pubDate).toISOString(),
  }));
}

export async function fetchHeadlines(): Promise<Headline[]> {
  const key = process.env.NEWS_API_KEY;
  if (key) {
    try {
      const out = await fetchGNews(key);
      if (out.length > 0) return out;
    } catch (err) {
      console.error("GNews failed, falling back to BBC RSS:", err);
    }
  }
  return fetchBBCRSS();
}
