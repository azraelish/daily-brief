import { getBriefView } from "@/lib/brief";
import { formatLong, todayUTC } from "@/lib/date";
import type { BriefView } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  let brief: BriefView | null = null;
  let loadError: string | null = null;
  try {
    brief = await getBriefView();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "unknown error";
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <Header brief={brief} />
      {loadError ? (
        <ErrorState message={loadError} />
      ) : brief ? (
        <>
          <BitcoinCard price={brief.btcPrice} change24h={brief.btcChange24h} />
          <Headlines
            title="Bitcoin news"
            headlines={brief.cryptoHeadlines}
            empty="No Bitcoin headlines today."
          />
          <Headlines title="World headlines" headlines={brief.headlines} />
          <Salads brief={brief} />
        </>
      ) : (
        <Skeleton />
      )}
      <footer className="mt-14 text-xs text-neutral-500">
        Refreshed daily. Sources: CoinGecko · BBC · CoinDesk.
      </footer>
    </main>
  );
}

function Header({ brief }: { brief: BriefView | null }) {
  const dateStr = formatLong(brief?.briefDate ?? todayUTC());
  const refreshedAt = brief?.refreshedAt
    ? new Date(brief.refreshedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }) + " UTC"
    : "—";
  return (
    <header className="mb-10 border-b border-neutral-800 pb-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Daily Brief</h1>
      <p className="mt-2 text-sm text-neutral-400">
        <span>{dateStr}</span>
        <span className="mx-2 text-neutral-700">·</span>
        <span>last refreshed {refreshedAt}</span>
      </p>
    </header>
  );
}

function BitcoinCard({ price, change24h }: { price: number; change24h: number }) {
  const up = change24h >= 0;
  const fmtPrice = price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <section className="mb-10">
      <SectionTitle>Bitcoin</SectionTitle>
      <div className="flex items-baseline gap-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="font-mono text-3xl sm:text-4xl">{fmtPrice}</div>
        <div className={`text-sm font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
          {up ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}% / 24h
        </div>
      </div>
    </section>
  );
}

function Headlines({
  title,
  headlines,
  empty,
}: {
  title: string;
  headlines: BriefView["headlines"];
  empty?: string;
}) {
  return (
    <section className="mb-10">
      <SectionTitle>{title}</SectionTitle>
      {headlines.length === 0 && empty ? (
        <p className="text-sm text-neutral-500">{empty}</p>
      ) : null}
      <ol className="space-y-3">
        {headlines.map((h, i) => (
          <li key={`${h.url}-${i}`} className="flex gap-3 text-sm">
            <span className="w-6 shrink-0 font-mono text-neutral-500">{i + 1}.</span>
            <div>
              <a
                href={h.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-neutral-100 underline-offset-4 hover:underline"
              >
                {h.title}
              </a>
              <div className="mt-0.5 text-xs text-neutral-500">
                {h.source} · {timeAgo(h.publishedAt)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Salads({ brief }: { brief: BriefView }) {
  return (
    <section className="mb-10">
      <SectionTitle>Salads of the day</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {brief.salads.map((s) => (
          <article key={s.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <h3 className="font-medium">{s.name}</h3>
            <p className="mt-2 text-sm text-neutral-400">{s.description}</p>
            <ul className="mt-3 flex flex-wrap gap-1">
              {s.ingredients.map((ing) => (
                <li
                  key={ing}
                  className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-400"
                >
                  {ing}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
      {children}
    </h2>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-lg bg-neutral-900/60" />
      <div className="h-72 animate-pulse rounded-lg bg-neutral-900/60" />
      <div className="h-40 animate-pulse rounded-lg bg-neutral-900/60" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-5 text-sm text-rose-200">
      <div className="font-medium">Couldn&apos;t load today&apos;s brief.</div>
      <div className="mt-1 font-mono text-xs text-rose-300/80">{message}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMin = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d ago`;
}
