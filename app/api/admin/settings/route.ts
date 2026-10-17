import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { settingsComplete, toZenginKana } from "@/lib/zengin";

// 振込元の口座（全銀データ用）
export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/payouts/";
  const digits = (v: string | undefined) => (v ?? "").replace(/\D/g, "");
  const s = {
    consignor_code: digits(b.consignor_code),
    consignor_name: toZenginKana(b.consignor_name ?? ""),
    bank_code: digits(b.bank_code),
    bank_name: toZenginKana(b.bank_name ?? ""),
    branch_code: digits(b.branch_code),
    branch_name: toZenginKana(b.branch_name ?? ""),
    account_type: b.account_type === "2" ? "2" : "1",
    account_number: digits(b.account_number),
  };
  if (!settingsComplete(s)) {
    return respond(req, withParam(back, "error", "委託者コード10桁・委託者名（カナ）・銀行番号4桁・支店番号3桁・口座番号7桁を入れてください"), { error: "invalid" }, 400);
  }
  await db().from("operators").update({ transfer_settings: s }).eq("id", admin.operator_id);
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
