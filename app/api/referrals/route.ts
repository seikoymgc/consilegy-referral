import { NextResponse } from "next/server";
import { appUrl, db } from "@/lib/db";
import { notifyAdmin } from "@/lib/mail";
import { apiPartner } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { listReferrals } from "@/lib/queries";
import { messages } from "@/lib/i18n";

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
  const t = messages(p.locale).errors;

  if (!b.product || !b.company_name) {
    return respond(req, withParam(back, "error", t.referralRequired), { error: "required" }, 400);
  }
  if (b.consent !== "on" && b.consent !== "true") {
    return respond(req, withParam(back, "error", t.consent), { error: "consent_required" }, 400);
  }

  if (b.connection_method === "contact_ok" && !b.contact_info) {
    return respond(req, withParam(back, "error", t.contactRequired), { error: "contact_required" }, 400);
  }

  const { data: product } = await db().from("products")
    .select("id, name, status").eq("operator_id", p.operator_id).eq("slug", b.product).maybeSingle();
  if (!product || product.status !== "public") {
    return respond(req, withParam(back, "error", t.productUnavailable), { error: "product_unavailable" }, 400);
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
    `紹介者：${p.name}${p.locale === "en" ? "（英語で表示している紹介者。英語で対応）" : ""}\n紹介先：${b.company_name}\n3営業日以内に「受理／既存接点あり／対象外」を返してください。\n${appUrl()}/admin/referrals/`);

  return respond(req, withParam(back, "saved", "1"), { ok: true }, 201);
}
