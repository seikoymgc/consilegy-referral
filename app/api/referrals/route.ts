import { NextResponse } from "next/server";
import { appUrl, db } from "@/lib/db";
import { notifyAdmin } from "@/lib/mail";
import { apiPartner } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { listReferrals } from "@/lib/queries";

export async function GET(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const product = new URL(req.url).searchParams.get("product") ?? undefined;
  return NextResponse.json({ referrals: await listReferrals(p.id, product) });
}

// 紹介先の登録（フォーム）
export async function POST(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const b = await readBody(req);
  const back = "/my/referrals/";

  if (!b.product || !b.company_name) {
    return respond(req, withParam(back, "error", "製品と会社名を入れてください"), { error: "required" }, 400);
  }
  if (b.consent !== "on" && b.consent !== "true") {
    return respond(req, withParam(back, "error", "紹介先の同意の確認が必要です"), { error: "consent_required" }, 400);
  }

  const { data: product } = await db().from("products")
    .select("id, name, status").eq("operator_id", p.operator_id).eq("slug", b.product).maybeSingle();
  if (!product || product.status !== "public") {
    return respond(req, withParam(back, "error", "この製品は今は紹介を受け付けていません"), { error: "product_unavailable" }, 400);
  }

  const { error } = await db().from("referrals").insert({
    operator_id: p.operator_id,
    partner_id: p.id,
    product_id: product.id,
    company_name: b.company_name,
    contact_name: b.contact_name || null,
    contact_title: b.contact_title || null,
    contact_info: b.contact_info || null,
    note: b.note || null,
    connection_method: b.connection_method || null,
    consent_at: new Date().toISOString(),
    channel: "form",
    status: "pending",
  });
  if (error) throw new Error(error.message);

  await notifyAdmin(`【紹介】${product.name}に紹介先の登録がありました`,
    `紹介者：${p.name}\n紹介先：${b.company_name}\n3営業日以内に「受理／既存接点あり／対象外」を返してください。\n${appUrl()}/admin/referrals/`);

  return respond(req, withParam(back, "saved", "1"), { ok: true }, 201);
}
