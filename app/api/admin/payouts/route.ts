import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { appUrl } from "@/lib/db";

export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/payouts/";

  const { data: payout } = await db().from("payouts")
    .select("id, partner_id, month, amount, status")
    .eq("id", b.id ?? "").eq("operator_id", admin.operator_id).maybeSingle();
  if (!payout) return respond(req, withParam(back, "error", "支払いが見つかりません"), { error: "not_found" }, 404);

  if (b.action === "approve" && payout.status === "draft") {
    await db().from("payouts").update({ status: "approved" }).eq("id", payout.id);
  } else if (b.action === "mark_paid" && payout.status === "approved") {
    const paidOn = b.paid_on || new Date().toISOString().slice(0, 10);
    const number = `RP-${payout.month.slice(0, 7).replace("-", "")}-${payout.id.slice(0, 8).toUpperCase()}`;
    await db().from("payouts").update({ status: "paid", paid_on: paidOn, statement_number: number }).eq("id", payout.id);
    await db().from("commissions").update({ status: "paid" }).eq("payout_id", payout.id).eq("status", "confirmed");

    const { data: p } = await db().from("partners").select("email, name").eq("id", payout.partner_id).single();
    if (p) {
      await sendMail({
        to: p.email,
        subject: "【Consilegy 紹介パートナー】報酬をお振込みしました",
        text: `${p.name} 様\n\n${payout.month.slice(0, 7)}分の報酬 ${payout.amount.toLocaleString("ja-JP")}円 をお振込みしました（${paidOn}）。\n明細はマイページの「報酬・支払い」でご確認いただけます。\n${appUrl()}/my/rewards/`,
      });
    }
  } else {
    return respond(req, withParam(back, "error", "この状態ではその操作はできません"), { error: "invalid_state" }, 400);
  }
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
