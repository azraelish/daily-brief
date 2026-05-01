"use client";

import { useEffect, useState, useTransition } from "react";
import { importTransactions } from "./actions";
import type { Asset } from "@/lib/portfolio/types";

type ParsedRow = {
  asset_id: string;
  type: string;
  occurred_at: string;
  price: number;
  quantity: number;
  fees: number;
  notes: string | null;
  rowNumber: number;
  warning?: string;
};

export function ImportModal({
  open,
  onClose,
  assets,
}: {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setRows(null);
      setParseError(null);
      setSubmitError(null);
      setDone(null);
    }
  }, [open]);

  if (!open) return null;

  const knownIds = new Set(assets.map((a) => a.id));

  function handleFile(file: File) {
    setParseError(null);
    setSubmitError(null);
    setDone(null);
    file.text().then((text) => {
      try {
        const parsed = parseCsv(text, knownIds);
        setRows(parsed);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Parse error");
        setRows(null);
      }
    });
  }

  function handleConfirm() {
    if (!rows || rows.length === 0) return;
    const payload = rows.map((r) => ({
      asset_id: r.asset_id,
      type: r.type,
      occurred_at: r.occurred_at,
      price: r.price,
      quantity: r.quantity,
      fees: r.fees,
      notes: r.notes,
    }));
    startTransition(async () => {
      const result = await importTransactions(payload);
      if (result.ok) {
        setDone(`Imported ${result.inserted ?? payload.length} transactions.`);
        setRows(null);
      } else {
        setSubmitError(result.error ?? "Import failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Import transactions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-neutral-500 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs text-neutral-400">
          CSV with columns:{" "}
          <code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono">
            asset_id,type,occurred_at,price,quantity,fees,notes
          </code>
          .{" "}
          <code className="font-mono">type</code> is <code className="font-mono">buy</code> or{" "}
          <code className="font-mono">sell</code>;{" "}
          <code className="font-mono">occurred_at</code> is ISO 8601 (e.g.{" "}
          <code className="font-mono">2026-04-30T10:44:07+02:00</code>).
        </p>

        {!rows && !done ? (
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-900 hover:file:bg-white"
          />
        ) : null}

        {parseError ? (
          <div className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-200">
            {parseError}
          </div>
        ) : null}

        {rows ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
              <span>
                Parsed <span className="font-mono">{rows.length}</span> rows
                {rows.some((r) => r.warning) ? (
                  <span className="ml-2 text-amber-400">
                    {rows.filter((r) => r.warning).length} warning(s)
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => setRows(null)}
                className="text-neutral-500 hover:text-neutral-200"
              >
                Choose different file
              </button>
            </div>
            <div className="max-h-80 overflow-auto rounded-lg border border-neutral-800">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-neutral-900/90 text-neutral-500">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">#</th>
                    <th className="px-2 py-1 text-left font-medium">Asset</th>
                    <th className="px-2 py-1 text-left font-medium">Type</th>
                    <th className="px-2 py-1 text-right font-medium">Qty</th>
                    <th className="px-2 py-1 text-right font-medium">Price</th>
                    <th className="px-2 py-1 text-right font-medium">Fees</th>
                    <th className="px-2 py-1 text-left font-medium">Date</th>
                    <th className="px-2 py-1 text-left font-medium">!</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNumber} className="border-t border-neutral-800/60">
                      <td className="px-2 py-1 text-neutral-500">{r.rowNumber}</td>
                      <td className="px-2 py-1 font-mono">{r.asset_id}</td>
                      <td className="px-2 py-1">{r.type}</td>
                      <td className="px-2 py-1 text-right font-mono">{r.quantity}</td>
                      <td className="px-2 py-1 text-right font-mono">{r.price}</td>
                      <td className="px-2 py-1 text-right font-mono">{r.fees}</td>
                      <td className="px-2 py-1 font-mono text-neutral-500">{r.occurred_at}</td>
                      <td className="px-2 py-1 text-amber-400">{r.warning ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {submitError ? (
              <div className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-200">
                {submitError}
              </div>
            ) : null}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
              >
                {pending ? "Importing…" : `Import ${rows.length} transactions`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {done ? (
          <div className="mt-3 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">
            ✓ {done}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function parseCsv(text: string, knownIds: Set<string>): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV is empty");
  const header = splitCsvLine(lines[0]).map((s) => s.trim().toLowerCase());
  const idxOf = (name: string) => header.indexOf(name);
  const reqd = ["asset_id", "type", "occurred_at", "price", "quantity"];
  for (const r of reqd) {
    if (idxOf(r) === -1) throw new Error(`Missing required column: ${r}`);
  }
  const feesIdx = idxOf("fees");
  const notesIdx = idxOf("notes");

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const asset_id = (cols[idxOf("asset_id")] ?? "").trim();
    const type = (cols[idxOf("type")] ?? "").trim().toLowerCase();
    const occurred_at = (cols[idxOf("occurred_at")] ?? "").trim();
    const price = Number(cols[idxOf("price")]);
    const quantity = Number(cols[idxOf("quantity")]);
    const fees = feesIdx === -1 ? 0 : Number(cols[feesIdx] || 0);
    const notesRaw = notesIdx === -1 ? "" : (cols[notesIdx] ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;

    let warning: string | undefined;
    if (!knownIds.has(asset_id)) warning = `unknown asset_id`;
    else if (type !== "buy" && type !== "sell") warning = `bad type`;
    else if (!Number.isFinite(quantity) || quantity <= 0) warning = `bad quantity`;
    else if (!Number.isFinite(price) || price < 0) warning = `bad price`;
    else if (Number.isNaN(Date.parse(occurred_at))) warning = `bad date`;

    rows.push({
      rowNumber: i + 1,
      asset_id,
      type,
      occurred_at,
      price,
      quantity,
      fees,
      notes,
      warning,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') {
        inQ = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}
