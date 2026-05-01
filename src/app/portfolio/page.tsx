import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerUser, supabaseServer } from "@/lib/auth/server";
import { loadPortfolio } from "@/lib/portfolio/queries";
import {
  EmptySection,
  HoldingHeader,
  SectionTitle,
  TotalsBar,
  TxTable,
} from "./_components";
import { PortfolioActions } from "./_toolbar";
import type { Asset, AssetSummary } from "@/lib/portfolio/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortfolioPage() {
  headers(); // pin into the dynamic path

  const user = await getOwnerUser();
  if (!user) {
    redirect("/auth/sign-in?next=/portfolio");
  }

  let portfolio;
  let allAssets: Asset[] = [];
  let loadError: string | null = null;
  try {
    portfolio = await loadPortfolio();
    const sb = supabaseServer();
    const { data, error } = await sb.from("assets").select("*").order("kind").order("symbol");
    if (error) throw new Error(error.message);
    allAssets = (data ?? []) as Asset[];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "unknown error";
  }

  const hasAnyPrice =
    portfolio &&
    [...portfolio.bySection.crypto, ...portfolio.bySection.etf].some((s) => s.price != null);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <header className="mb-6 border-b border-neutral-800 pb-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Portfolio</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Signed in as <span className="font-mono">{user.email}</span>
            </p>
          </div>
          <a
            href="/auth/sign-out"
            className="text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-200"
          >
            Sign out
          </a>
        </div>
        {allAssets.length > 0 ? (
          <div className="mt-4">
            <PortfolioActions assets={allAssets} />
          </div>
        ) : null}
      </header>

      {!hasAnyPrice ? (
        <div className="mb-8 rounded-lg border border-amber-900/40 bg-amber-950/20 px-5 py-3 text-xs text-amber-200/80">
          No live prices yet — click <span className="font-medium">Refresh prices</span> above to fetch them now. Daily auto-refresh runs alongside the morning cron.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-5 text-sm text-rose-200">
          <div className="font-medium">Couldn&apos;t load portfolio.</div>
          <div className="mt-1 font-mono text-xs text-rose-300/80">{loadError}</div>
        </div>
      ) : portfolio ? (
        <>
          <TotalsBar totalsByCurrency={portfolio.totalsByCurrency} />

          <section className="mb-12">
            <SectionTitle>Bitcoin</SectionTitle>
            {portfolio.bySection.crypto.length === 0 ? (
              <EmptySection>No crypto transactions yet.</EmptySection>
            ) : (
              portfolio.bySection.crypto.map((s: AssetSummary) => (
                <div key={s.asset.id} className="mb-8">
                  <HoldingHeader summary={s} />
                  <TxTable summary={s} assets={allAssets} />
                </div>
              ))
            )}
          </section>

          <section className="mb-12">
            <SectionTitle>ETFs (PEA)</SectionTitle>
            {portfolio.bySection.etf.length === 0 ? (
              <EmptySection>No ETF transactions yet.</EmptySection>
            ) : (
              portfolio.bySection.etf.map((s: AssetSummary) => (
                <div key={s.asset.id} className="mb-8">
                  <HoldingHeader summary={s} />
                  <TxTable summary={s} assets={allAssets} />
                </div>
              ))
            )}
          </section>
        </>
      ) : null}

      <footer className="mt-12 text-xs text-neutral-500">
        Prices · CoinGecko (BTC) and Yahoo Finance (ETFs). Refreshed daily with the
        morning cron, plus on-demand via the button above.
      </footer>
    </main>
  );
}
