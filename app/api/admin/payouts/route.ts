import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { appUrl } from "@/lib/db";
import { issueStatement } from "@/lib/statement";
import { formatDate, formatMonth, formatYen, messages, toLocale } from "@/lib/i18n";

export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/payouts/";
  const e = messages(admin.locale).admin.errors;

  const { data: payout } = await db().from("payouts")
    .select("id, partner_id, month, amount, status")
    .eq("id", b.id ?? "").eq("operator_id", admin.operator_id).maybeSingle();
  if (!payout) return respond(req, withParam(back, "error", e.payoutNotFound), { error: "not_found" }, 404);

  if (b.action === "approve" && payout.status === "draft") {
    await db().from("payouts").update({ status: "approved" }).eq("id", payout.id);
  } else if (b.action === "mark_paid" && payout.status === "approved") {
    const paidOn = b.paid_on || new Date().toISOString().slice(0, 10);
    const number = `RP-${payout.month.slice(0, 7).replace("-", "")}-${payout.id.slice(0, 8).toUpperCase()}`;
    await db().from("payouts").update({ status: "paid", paid_on: paidOn, statement_number: number }).eq("id", payout.id);
    await db().from("commissions").update({ status: "paid" }).eq("payout_id", payout.id).eq("status", "confirmed");
    await issueStatement(payout.id); // 支払通知書PDF（7年保存）

    const { data: p } = await db().from("partners").select("email, name, locale").eq("id", payout.partner_id).single();
    if (p) {
      // 紹介者の言語で知らせる（日本語は従来どおり「2026-10分」「5,000円」「2026-10-31」の形）
      const locale = toLocale(p.locale);
      const t = messages(locale).mail;
      await sendMail({
        to: p.email,
        locale,
        subject: t.paidSubject,
        text: t.paidBody(
          p.name,
          locale === "en" ? formatMonth(payout.month, "en") : payout.month.slice(0, 7),
          formatYen(payout.amount, locale),
          locale === "en" ? formatDate(`${paidOn}T00:00:00+09:00`, "en") : paidOn,
          `${appUrl()}/my/rewards/`,
        ),
      });
    }
  } else if (b.action === "reissue_statement" && payout.status === "paid") {
    await issueStatement(payout.id);
  } else {
    return respond(req, withParam(back, "error", e.invalidState), { error: "invalid_state" }, 400);
  }
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
