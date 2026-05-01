import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getOwnerUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortfolioPage() {
  // Force the page into the dynamic path so we never serve a cached shell.
  headers();

  const user = await getOwnerUser();
  if (!user) {
    redirect("/auth/sign-in?next=/portfolio");
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-10 flex items-baseline justify-between border-b border-neutral-800 pb-6">
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

      <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Phase 1 verified
        </h2>
        <p className="mt-3 text-sm text-neutral-300">
          Auth wall is up. Bitcoin and ETF tracking land in Phase 2.
        </p>
      </section>
    </main>
  );
}
