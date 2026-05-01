"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { addAsset, createTransaction, updateTransaction } from "./actions";
import type { Asset, Transaction, TxType } from "@/lib/portfolio/types";

type Mode = { kind: "add" } | { kind: "edit"; tx: Transaction };

export function TxModal({
  open,
  onClose,
  mode,
  assets,
  defaultAssetId,
}: {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  assets: Asset[];
  defaultAssetId?: string;
}) {
  const [type, setType] = useState<TxType>(mode.kind === "edit" ? mode.tx.type : "buy");
  const [assetId, setAssetId] = useState<string>(
    mode.kind === "edit" ? mode.tx.asset_id : defaultAssetId ?? assets[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState<string>(
    mode.kind === "edit" ? String(mode.tx.quantity) : "",
  );
  const [price, setPrice] = useState<string>(mode.kind === "edit" ? String(mode.tx.price) : "");
  const [fees, setFees] = useState<string>(
    mode.kind === "edit" ? String(mode.tx.fees ?? 0) : "0",
  );
  const [notes, setNotes] = useState<string>(mode.kind === "edit" ? mode.tx.notes ?? "" : "");
  const [occurredLocal, setOccurredLocal] = useState<string>(() =>
    mode.kind === "edit" ? toLocalInput(mode.tx.occurred_at) : toLocalInput(new Date().toISOString()),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset state when modal re-opens with a new mode.
  useEffect(() => {
    if (!open) return;
    if (mode.kind === "edit") {
      setType(mode.tx.type);
      setAssetId(mode.tx.asset_id);
      setQuantity(String(mode.tx.quantity));
      setPrice(String(mode.tx.price));
      setFees(String(mode.tx.fees ?? 0));
      setNotes(mode.tx.notes ?? "");
      setOccurredLocal(toLocalInput(mode.tx.occurred_at));
    } else {
      setType("buy");
      setAssetId(defaultAssetId ?? assets[0]?.id ?? "");
      setQuantity("");
      setPrice("");
      setFees("0");
      setNotes("");
      setOccurredLocal(toLocalInput(new Date().toISOString()));
    }
    setError(null);
  }, [open, mode, assets, defaultAssetId]);

  const asset = assets.find((a) => a.id === assetId);
  const totalSpent = (Number(quantity) || 0) * (Number(price) || 0) + (Number(fees) || 0);

  if (!open) return null;

  function submit(formData: FormData) {
    formData.set("type", type);
    formData.set("asset_id", assetId);
    // Convert datetime-local (interpreted in browser TZ) to ISO with TZ.
    const iso = occurredLocal ? new Date(occurredLocal).toISOString() : "";
    formData.set("occurred_at", iso);
    formData.set("notes", notes);

    startTransition(async () => {
      setError(null);
      const result =
        mode.kind === "edit"
          ? await updateTransaction(mode.tx.id, formData)
          : await createTransaction(formData);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error ?? "Failed");
      }
    });
  }

  return (
    <ModalShell title={mode.kind === "edit" ? "Edit transaction" : "Add transaction"} onClose={onClose}>
      <form action={submit} className="space-y-5">
        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-neutral-800">
          <TabButton active={type === "buy"} onClick={() => setType("buy")} accent="emerald">
            Buy
          </TabButton>
          <TabButton active={type === "sell"} onClick={() => setType("sell")} accent="rose">
            Sell
          </TabButton>
        </div>

        <Field label={asset?.kind === "crypto" ? "Select coin" : "Select asset"}>
          <AssetPicker assets={assets} value={assetId} onChange={setAssetId} />
        </Field>

        <Field label="Total spent">
          <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="font-mono text-lg">
              {totalSpent.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-neutral-500">{asset?.currency ?? "—"}</span>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <NumberInput
              name="quantity"
              value={quantity}
              onChange={setQuantity}
              suffix={asset?.symbol ?? ""}
              step="any"
              required
              autoFocus
            />
          </Field>
          <Field label={asset?.kind === "crypto" ? "Price per coin" : "Price per share"}>
            <NumberInput
              name="price"
              value={price}
              onChange={setPrice}
              suffix={asset?.currency ?? ""}
              step="any"
              required
            />
          </Field>
        </div>

        <Field label="Date & time">
          <input
            type="datetime-local"
            name="occurred_at_local"
            value={occurredLocal}
            onChange={(e) => setOccurredLocal(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-600"
            required
          />
        </Field>

        <details className="rounded-lg border border-neutral-800 bg-neutral-950">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200">
            Fees &amp; Notes (optional)
          </summary>
          <div className="space-y-3 border-t border-neutral-800 px-3 py-3">
            <Field label="Fees" small>
              <NumberInput
                name="fees"
                value={fees}
                onChange={setFees}
                suffix={asset?.currency ?? ""}
                step="any"
              />
            </Field>
            <Field label="Notes" small>
              <input
                type="text"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
                placeholder="optional"
              />
            </Field>
          </div>
        </details>

        {error ? (
          <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={`w-full rounded-lg px-4 py-3 text-sm font-medium text-neutral-900 transition disabled:opacity-50 ${type === "buy" ? "bg-emerald-400 hover:bg-emerald-300" : "bg-rose-400 hover:bg-rose-300"}`}
        >
          {pending
            ? "Saving…"
            : mode.kind === "edit"
              ? "Save changes"
              : type === "buy"
                ? "Add Buy"
                : "Add Sell"}
        </button>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-neutral-500 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent: "emerald" | "rose";
  children: React.ReactNode;
}) {
  const color = accent === "emerald" ? "border-emerald-400 text-emerald-300" : "border-rose-400 text-rose-300";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${active ? color : "border-transparent text-neutral-500 hover:text-neutral-200"}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
  small,
}: {
  label: string;
  children: React.ReactNode;
  small?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span
        className={`mb-1.5 block ${small ? "text-[10px]" : "text-xs"} uppercase tracking-widest text-neutral-500`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  name,
  value,
  onChange,
  suffix,
  step,
  required,
  autoFocus,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 focus-within:border-neutral-600">
      <input
        name={name}
        type="number"
        inputMode="decimal"
        step={step}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        className="w-full bg-transparent font-mono text-sm outline-none"
        placeholder="0.00"
      />
      {suffix ? <span className="ml-2 shrink-0 text-xs uppercase tracking-widest text-neutral-500">{suffix}</span> : null}
    </div>
  );
}

function AssetPicker({
  assets,
  value,
  onChange,
}: {
  assets: Asset[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const grouped = {
    crypto: assets.filter((a) => a.kind === "crypto"),
    etf: assets.filter((a) => a.kind === "etf"),
  };
  return (
    <>
      <div className="rounded-lg border border-neutral-800 bg-neutral-950">
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              setShowAdd(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full appearance-none bg-transparent px-3 py-2 text-sm outline-none"
        >
          {grouped.crypto.length > 0 && (
            <optgroup label="Crypto">
              {grouped.crypto.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.symbol})
                </option>
              ))}
            </optgroup>
          )}
          {grouped.etf.length > 0 && (
            <optgroup label="ETFs (PEA-eligible)">
              {grouped.etf.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol} — {a.name}
                </option>
              ))}
            </optgroup>
          )}
          <option value="__new__">＋ Add a new asset…</option>
        </select>
      </div>
      {showAdd ? <AddAssetInline onDone={(id) => { setShowAdd(false); if (id) onChange(id); }} /> : null}
    </>
  );
}

function AddAssetInline({ onDone }: { onDone: (newId?: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="mb-2 text-xs uppercase tracking-widest text-neutral-500">Add a custom ETF</div>
      <form
        action={(fd) => {
          startTransition(async () => {
            setError(null);
            const result = await addAsset(fd);
            if (result.ok) {
              const id = String(fd.get("id") ?? "").trim().toUpperCase();
              onDone(id);
            } else {
              setError(result.error ?? "Failed");
            }
          });
        }}
        className="space-y-2"
      >
        <input type="hidden" name="kind" value="etf" />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="id"
            placeholder="ISIN (e.g. FR0011550185)"
            required
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs outline-none focus:border-neutral-600"
          />
          <input
            name="symbol"
            placeholder="Symbol (PANX)"
            required
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs outline-none focus:border-neutral-600"
          />
        </div>
        <input
          name="name"
          placeholder="Full name (Amundi PEA …)"
          required
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs outline-none focus:border-neutral-600"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="yahoo_ticker"
            placeholder="Yahoo ticker (PANX.PA)"
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs outline-none focus:border-neutral-600"
          />
          <select
            name="currency"
            defaultValue="EUR"
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs outline-none focus:border-neutral-600"
          >
            <option>EUR</option>
            <option>USD</option>
            <option>GBP</option>
            <option>CHF</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          <input type="checkbox" name="pea_eligible" defaultChecked /> PEA-eligible
        </label>
        {error ? <div className="text-xs text-rose-400">{error}</div> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add asset"}
          </button>
          <button
            type="button"
            onClick={() => onDone()}
            className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function toLocalInput(iso: string): string {
  // Convert ISO timestamp to "YYYY-MM-DDTHH:mm" in the browser's local TZ.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
