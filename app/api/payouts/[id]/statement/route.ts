import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiPartner } from "@/lib/guard";

// 支払通知書PDF（自分の支払いのものだけ）。PDF生成は未実装。
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const { id } = await ctx.params;
  const { data: payout } = await db().from("payouts")
    .select("id, statement_pdf_path").eq("id", id).eq("partner_id", p.id).maybeSingle();
  if (!payout) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ error: "statement_not_ready", message: "支払通知書PDFは準備中です" }, { status: 501 });
}
