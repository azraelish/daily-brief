"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer, getOwnerUser } from "@/lib/auth/server";

export type ActionResult = { ok: boolean; error?: string };

function pickFields(formData: FormData) {
  const asset_id = String(formData.get("asset_id") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));
  const feesRaw = formData.get("fees");
  const fees = feesRaw === null || feesRaw === "" ? 0 : Number(feesRaw);
  const occurred_at = String(formData.get("occurred_at") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;
  return { asset_id, type, quantity, price, fees, occurred_at, notes };
}

function validate(f: ReturnType<typeof pickFields>): string | null {
  if (!f.asset_id) return "Asset is required";
  if (f.type !== "buy" && f.type !== "sell") return "Type must be buy or sell";
  if (!Number.isFinite(f.quantity) || f.quantity <= 0) return "Quantity must be > 0";
  if (!Number.isFinite(f.price) || f.price < 0) return "Price must be ≥ 0";
  if (!Number.isFinite(f.fees) || f.fees < 0) return "Fees must be ≥ 0";
  if (!f.occurred_at || Number.isNaN(Date.parse(f.occurred_at))) return "Date is invalid";
  return null;
}

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { ok: false, error: "Not authorized" };
  const f = pickFields(formData);
  const err = validate(f);
  if (err) return { ok: false, error: err };

  const sb = supabaseServer();
  const { error } = await sb.from("transactions").insert({
    user_id: user.id,
    asset_id: f.asset_id,
    type: f.type,
    quantity: f.quantity,
    price: f.price,
    fees: f.fees,
    occurred_at: f.occurred_at,
    notes: f.notes,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portfolio");
  return { ok: true };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { ok: false, error: "Not authorized" };
  if (!id) return { ok: false, error: "Missing id" };
  const f = pickFields(formData);
  const err = validate(f);
  if (err) return { ok: false, error: err };

  const sb = supabaseServer();
  const { error } = await sb
    .from("transactions")
    .update({
      asset_id: f.asset_id,
      type: f.type,
      quantity: f.quantity,
      price: f.price,
      fees: f.fees,
      occurred_at: f.occurred_at,
      notes: f.notes,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portfolio");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { ok: false, error: "Not authorized" };
  if (!id) return { ok: false, error: "Missing id" };
  const sb = supabaseServer();
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portfolio");
  return { ok: true };
}

/** Adds a custom ETF (or other asset) to the catalog. Owner-only.
 *  Uses the service role to bypass RLS, since the assets table is read-only
 *  for authenticated users by design. */
export async function addAsset(formData: FormData): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { ok: false, error: "Not authorized" };

  const id = String(formData.get("id") ?? "").trim().toUpperCase();
  const kind = String(formData.get("kind") ?? "etf").trim();
  const symbol = String(formData.get("symbol") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase();
  const yahooRaw = String(formData.get("yahoo_ticker") ?? "").trim();
  const yahoo_ticker = yahooRaw.length > 0 ? yahooRaw : null;
  const peaEligible = formData.get("pea_eligible") === "on" || formData.get("pea_eligible") === "true";

  if (!id || !symbol || !name) return { ok: false, error: "ID, symbol and name are required" };
  if (kind !== "etf" && kind !== "crypto") return { ok: false, error: "Kind must be etf or crypto" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, error: "Server misconfigured" };
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { error } = await admin.from("assets").insert({
    id,
    kind,
    symbol,
    name,
    currency,
    yahoo_ticker,
    coingecko_id: null,
    pea_eligible: peaEligible,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portfolio");
  return { ok: true };
}

type CsvRow = {
  asset_id: string;
  type: string;
  occurred_at: string;
  price: number;
  quantity: number;
  fees: number;
  notes: string | null;
};

export async function importTransactions(rows: CsvRow[]): Promise<ActionResult & { inserted?: number }> {
  const user = await getOwnerUser();
  if (!user) return { ok: false, error: "Not authorized" };
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "No rows" };
  if (rows.length > 1000) return { ok: false, error: "Max 1000 rows per import" };

  const validated = rows.map((r) => ({
    user_id: user.id,
    asset_id: r.asset_id,
    type: r.type,
    quantity: Number(r.quantity),
    price: Number(r.price),
    fees: Number(r.fees ?? 0),
    occurred_at: r.occurred_at,
    notes: r.notes ?? null,
  }));

  // Reject anything malformed before round-tripping to DB.
  for (const r of validated) {
    if (!r.asset_id) return { ok: false, error: "Row missing asset_id" };
    if (r.type !== "buy" && r.type !== "sell") return { ok: false, error: `Bad type: ${r.type}` };
    if (!Number.isFinite(r.quantity) || r.quantity <= 0) return { ok: false, error: "Bad quantity" };
    if (!Number.isFinite(r.price) || r.price < 0) return { ok: false, error: "Bad price" };
    if (!Number.isFinite(r.fees) || r.fees < 0) return { ok: false, error: "Bad fees" };
    if (Number.isNaN(Date.parse(r.occurred_at))) return { ok: false, error: "Bad occurred_at" };
  }

  const sb = supabaseServer();
  const { error, count } = await sb.from("transactions").insert(validated, { count: "exact" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portfolio");
  return { ok: true, inserted: count ?? validated.length };
}
