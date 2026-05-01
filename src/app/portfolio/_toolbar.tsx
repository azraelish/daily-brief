"use client";

import { useState, useTransition } from "react";
import { TxModal } from "./_modal";
import { ImportModal } from "./_import";
import { deleteTransaction } from "./actions";
import type { Asset, Transaction } from "@/lib/portfolio/types";

export function PortfolioActions({ assets }: { assets: Asset[] }) {
  const [add, setAdd] = useState(false);
  const [imp, setImp] = useState(false);
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
      </div>
      <TxModal open={add} onClose={() => setAdd(false)} mode={{ kind: "add" }} assets={assets} />
      <ImportModal open={imp} onClose={() => setImp(false)} assets={assets} />
    </>
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
