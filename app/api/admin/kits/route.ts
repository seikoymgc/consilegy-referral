import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { messages } from "@/lib/i18n";

// 「タイトル|URL」を1行ずつ
function parsePairs(text: string, keys: [string, string]) {
  return (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [a, ...rest] = l.split("|");
    return { [keys[0]]: a.trim(), [keys[1]]: rest.join("|").trim() };
  });
}

export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/products/";
  if (!b.product_id) return respond(req, withParam(back, "error", messages(admin.locale).admin.errors.productRequired), { error: "invalid" }, 400);

  // 英語のキット（lang=en）は content_en に、項目の形は日本語と同じで保存する
  if (b.lang === "en") {
    const content = {
      tagline: b.tagline || null,
      forward_message: b.forward_message || null,
      fit: b.fit || null,
      pricing: b.pricing || null,
      materials: parsePairs(b.materials, ["title", "url"]),
      screens: parsePairs(b.screens, ["title", "url"]),
      faq: parsePairs(b.faq, ["q", "a"]),
    };
    const { data: existing } = await db().from("product_kits")
      .select("id").eq("product_id", b.product_id).eq("operator_id", admin.operator_id).maybeSingle();
    const { error } = existing
      ? await db().from("product_kits").update({ content_en: content, updated_at: new Date().toISOString() }).eq("id", existing.id)
      : await db().from("product_kits").insert({ operator_id: admin.operator_id, product_id: b.product_id, content_en: content });
    if (error) return respond(req, withParam(back, "error", error.message), { error: error.message }, 400);
    return respond(req, withParam(back, "saved", "1"), { ok: true });
  }

  const { error } = await db().from("product_kits").upsert({
    operator_id: admin.operator_id,
    product_id: b.product_id,
    tagline: b.tagline || null,
    forward_message: b.forward_message || null,
    fit: b.fit || null,
    pricing: b.pricing || null,
    materials: parsePairs(b.materials, ["title", "url"]),
    screens: parsePairs(b.screens, ["title", "url"]),
    faq: parsePairs(b.faq, ["q", "a"]),
    updated_at: new Date().toISOString(),
  }, { onConflict: "product_id" });
  if (error) return respond(req, withParam(back, "error", error.message), { error: error.message }, 400);
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
