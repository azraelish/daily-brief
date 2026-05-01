import { NextResponse } from "next/server";
import { getOwnerUser, supabaseServer } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvField(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const user = await getOwnerUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("transactions")
    .select("asset_id, type, occurred_at, price, quantity, fees, notes, created_at")
    .order("occurred_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ["asset_id", "type", "occurred_at", "price", "quantity", "fees", "notes"].join(",");
  const lines = (data ?? []).map((r) =>
    [
      csvField(r.asset_id),
      csvField(r.type),
      csvField(r.occurred_at),
      csvField(r.price),
      csvField(r.quantity),
      csvField(r.fees),
      csvField(r.notes ?? ""),
    ].join(","),
  );
  const body = [header, ...lines].join("\n") + "\n";

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="portfolio-${today}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
