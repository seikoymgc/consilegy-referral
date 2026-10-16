import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { acceptReferral, applyPayment, reprocessHeld } from "@/lib/rewards";

export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/referrals/";

  const { data: ref } = await db().from("referrals")
    .select("id, product_id, product_contract_id, status, operator_id")
    .eq("id", b.id ?? "").eq("operator_id", admin.operator_id).maybeSingle();
  if (!ref) return respond(req, withParam(back, "error", "紹介案件が見つかりません"), { error: "not_found" }, 404);

  const now = new Date().toISOString();
  switch (b.action) {
    case "accept":
      await acceptReferral(ref.id, false);
      break;
    case "confirm":
      if (ref.status === "pending") await acceptReferral(ref.id, true);
      else await db().from("referrals").update({ status: "confirmed", confirmed_at: now, updated_at: now }).eq("id", ref.id);
      await reprocessHeld(ref.product_id, ref.product_contract_id);
      break;
    case "existing_contact":
    case "out_of_scope":
    case "cancelled":
      await db().from("referrals").update({ status: b.action, updated_at: now }).eq("id", ref.id);
      break;
    case "link_contract": {
      const contractId = (b.contract_id ?? "").trim();
      if (!contractId) return respond(req, withParam(back, "error", "契約IDを入れてください"), { error: "invalid" }, 400);
      // 製品内の紹介が付いた契約は紐づけ不可（値引きと現金の二重を防ぐ）
      const { count } = await db().from("product_events").select("id", { count: "exact", head: true })
        .eq("product_id", ref.product_id).eq("product_contract_id", contractId).eq("has_in_product_referral", true);
      if ((count ?? 0) > 0) {
        return respond(req, withParam(back, "error", "この契約には製品内の紹介が付いているため紐づけできません"),
          { error: "in_product_referral" }, 400);
      }
      const { error } = await db().from("referrals")
        .update({ product_contract_id: contractId, updated_at: now }).eq("id", ref.id);
      if (error) return respond(req, withParam(back, "error", "この契約IDは別の紹介に紐づいています"), { error: error.message }, 400);
      await reprocessHeld(ref.product_id, contractId);
      break;
    }
    case "manual_service_payment": {
      // 製品から通知が来ない入金（請求書・振込の導入支援など）の手入力
      const amount = Math.trunc(Number(b.amount_excl_tax));
      if (!ref.product_contract_id || !(amount > 0)) {
        return respond(req, withParam(back, "error", "契約IDの紐づけと、税抜の金額が必要です"), { error: "invalid" }, 400);
      }
      const { data: ev, error } = await db().from("product_events").insert({
        operator_id: ref.operator_id, product_id: ref.product_id, kind: "payment",
        external_id: `manual-${randomUUID()}`, product_contract_id: ref.product_contract_id,
        charge_type: "service", amount_excl_tax: amount,
        occurred_at: b.paid_on ? new Date(b.paid_on).toISOString() : now,
      }).select("*").single();
      if (error) throw new Error(error.message);
      const result = await applyPayment(ev);
      await db().from("product_events").update({ result }).eq("id", ev.id);
      break;
    }
    default:
      return respond(req, withParam(back, "error", "不明な操作です"), { error: "unknown_action" }, 400);
  }
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
