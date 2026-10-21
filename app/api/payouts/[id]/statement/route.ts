import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPartner } from "@/lib/auth";
import { STATEMENT_BUCKET, issueStatement } from "@/lib/statement";
import { messages } from "@/lib/i18n";

// 支払通知書PDF。紹介者は自分の支払いのものだけ。管理者は運営会社の支払いすべて。
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentPartner();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let q = db().from("payouts").select("id, status, statement_number, statement_pdf_path")
    .eq("id", id).eq("operator_id", me.operator_id);
  if (me.role !== "admin") q = q.eq("partner_id", me.id);
  const { data: payout } = await q.maybeSingle();
  if (!payout) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (payout.status !== "paid") {
    return NextResponse.json({ error: "not_paid", message: messages(me.locale).errors.statementNotPaid }, { status: 409 });
  }

  const key = payout.statement_pdf_path ?? (await issueStatement(payout.id));
  const { data: file, error } = await db().storage.from(STATEMENT_BUCKET).download(key);
  if (error || !file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (me.role === "admin") console.log(`[audit] statement ${payout.id} viewed by ${me.id} at ${new Date().toISOString()}`);
  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${payout.statement_number ?? "statement"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
