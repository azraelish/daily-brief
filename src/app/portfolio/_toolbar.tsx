"use client";

import { useEffect, useState, useTransition } from "react";
import { TxModal } from "./_modal";
import { ImportModal } from "./_import";
import {
  deleteTransaction,
  setManualPrice,
  triggerRefreshPrices,
} from "./actions";
import type { Asset, AssetPrice, Transaction } from "@/lib/portfolio/types";

export function PortfolioActions({ assets }: { assets: Asset[] }) {
  const [add, setAdd] = useState(false);
  const [imp, setImp] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function refresh() {
    setFeedback(null);
    startTransition(async () => {
      const r = await triggerRefreshPrices();
      setFeedback(
        r.ok
          ? `✓ Refreshed ${r.fetched ?? 0} prices`
          : `✗ ${r.error ?? "refresh failed"}`,
      );
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAdd(true)}
          className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-emerald-300"
        >
          + Add transaction
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
        >
          {pending ? "Refreshing…" : "Refresh prices"}
        </button>
        <button
          type="button"
          onClick={() => setImp(true)}
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
        >
          Import CSV
        </button>
        <a
          href="/api/portfolio/export"
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
        >
          Export CSV
        </a>
        {feedback ? <span className="text-xs text-neutral-500">{feedback}</span> : null}
      </div>
      <TxModal open={add} onClose={() => setAdd(false)} mode={{ kind: "add" }} assets={assets} />
      <ImportModal open={imp} onClose={() => setImp(false)} assets={assets} />
    </>
  );
}

export function PriceOverrideButton({
  asset,
  price,
}: {
  asset: Asset;
  price: AssetPrice | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Override price manually"
        className="rounded p-1 text-neutral-600 hover:bg-neutral-800 hover:text-neutral-200"
        aria-label="Edit price"
      >
        ✎
      </button>
      {open ? (
        <PriceOverrideModal asset={asset} price={price} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function PriceOverrideModal({
  asset,
  price,
  onClose,
}: {
  asset: Asset;
  price: AssetPrice | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState(price ? String(price.price) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold tracking-tight">
            Override price · {asset.symbol}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-neutral-400">
          Use when the auto-fetched price is wrong or unavailable. Sticks until you clear it.
        </p>

        <form
          action={(fd) => {
            startTransition(async () => {
              setError(null);
              fd.set("asset_id", asset.id);
              fd.set("price", value);
              const r = await setManualPrice(fd);
              if (r.ok) onClose();
              else setError(r.error ?? "Failed");
            });
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
              Price ({asset.currency})
            </span>
            <input
              name="price"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-600"
            />
          </label>
          {error ? <div className="text-xs text-rose-400">{error}</div> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Set price"}
            </button>
            {price?.manual_override ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    setError(null);
                    const fd = new FormData();
                    fd.set("asset_id", asset.id);
                    fd.set("clear", "1");
                    const r = await setManualPrice(fd);
                    if (r.ok) onClose();
                    else setError(r.error ?? "Failed");
                  });
                }}
                className="rounded-lg border border-neutral-800 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900"
              >
                Clear override
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

export function RowActions({ tx, assets }: { tx: Transaction; assets: Asset[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
          title="Edit"
          aria-label="Edit transaction"
        >
          ✎
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this transaction? This cannot be undone.")) return;
            startTransition(async () => {
              await deleteTransaction(tx.id);
            });
          }}
          className="rounded p-1 text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300 disabled:opacity-40"
          title="Delete"
          aria-label="Delete transaction"
        >
          ✕
        </button>
      </div>
      <TxModal
        open={editing}
        onClose={() => setEditing(false)}
        mode={{ kind: "edit", tx }}
        assets={assets}
      />
    </>
  );
}
