import { NextResponse } from "next/server";
import { db, operatorId } from "@/lib/db";
import { decrypt, hmacHex, safeEqualHex } from "@/lib/crypto";
import { applyPayment, applyRefund, applySignup } from "@/lib/rewards";

// 製品からの通知（申込・入金・取消/返金）
// ヘッダー: X-Product: 製品の識別名 / X-Signature: 本文のHMAC-SHA256（製品ごとのキー、hex）
// 本文(JSON): { type: "signup"|"payment"|"refund", id, referral_code?, contract_id, charge_type?, amount_excl_tax?,
//              plan?, occurred_at, in_product_referral?, company_name?, refund_of? }
// 製品が送るのは契約ID・金額・プラン・日付まで。顧客の連絡先や利用内容は送らない。
export async function POST(req: Request) {
  const slug = req.headers.get("x-product") ?? "";
  const signature = (req.headers.get("x-signature") ?? "").toLowerCase();
  const raw = await req.text();

  const op = await operatorId();
  const { data: product } = await db().from("products")
    .select("id, signing_key_encrypted").eq("operator_id", op).eq("slug", slug).maybeSingle();
  if (!product?.signing_key_encrypted) {
    return NextResponse.json({ error: "unknown_product" }, { status: 401 });
  }
  const expected = hmacHex(decrypt(product.signing_key_encrypted), raw);
  if (!safeEqualHex(signature, expected)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const kind = String(body.type ?? "");
  if (!["signup", "payment", "refund"].includes(kind) || !body.id || !body.occurred_at) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const row = {
    operator_id: op,
    product_id: product.id,
    kind,
    external_id: String(body.id),
    referral_code: body.referral_code ? String(body.referral_code) : null,
    product_contract_id: body.contract_id ? String(body.contract_id) : null,
    charge_type: body.charge_type === "service" ? "service" : kind === "payment" ? "monthly" : null,
    amount_excl_tax: body.amount_excl_tax == null ? null : Math.trunc(Number(body.amount_excl_tax)),
    plan: body.plan ? String(body.plan) : null,
    has_in_product_referral: body.in_product_referral === true,
    company_name: body.company_name ? String(body.company_name) : null,
    occurred_at: new Date(String(body.occurred_at)).toISOString(),
  };

  // 製品側のIDで二重受信を防ぐ
  const { data: ev, error } = await db().from("product_events").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    throw new Error(error.message);
  }

  let result: "applied" | "held" | "ignored";
  if (kind === "signup") result = await applySignup(ev);
  else if (kind === "payment") result = await applyPayment(ev);
  else result = await applyRefund(ev, body.refund_of ? String(body.refund_of) : null);

  await db().from("product_events").update({ result }).eq("id", ev.id);
  return NextResponse.json({ ok: true, result });
}
