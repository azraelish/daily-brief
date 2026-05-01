import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/auth/server";
import { loadPortfolio } from "@/lib/portfolio/queries";
import {
  EmptySection,
  HoldingHeader,
  SectionTitle,
  TotalsBar,
  TxTable,
} from "./_components";
import type { AssetSummary } from "@/lib/portfolio/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortfolioPage() {
  headers(); // pin into the dynamic path

  const user = await getOwnerUser();
  if (!user) {
    redirect("/auth/sign-in?next=/portfolio");
  }

  let portfolio;
  let loadError: string | null = null;
  try {
    portfolio = await loadPortfolio();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "unknown error";
  }

  const hasAnyPrice =
    portfolio &&
    [...portfolio.bySection.crypto, ...portfolio.bySection.etf].some((s) => s.price != null);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <header className="mb-8 flex items-baseline justify-between border-b border-neutral-800 pb-6">
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
      </header>

      {!hasAnyPrice ? (
        <div className="mb-8 rounded-lg border border-amber-900/40 bg-amber-950/20 px-5 py-3 text-xs text-amber-200/80">
          Live prices arrive in Phase 5. Until then, current value and P/L show <span className="font-mono">—</span>.
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
                  <TxTable summary={s} />
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
                  <TxTable summary={s} />
                </div>
              ))
            )}
          </section>
        </>
      ) : null}

      <footer className="mt-12 text-xs text-neutral-500">
        Phase 4 will add: add / edit / delete transactions, CSV import & export, ETF picker.
      </footer>
    </main>
  );
}
