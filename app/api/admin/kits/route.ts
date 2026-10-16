import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";

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
  if (!b.product_id) return respond(req, withParam(back, "error", "製品が必要です"), { error: "invalid" }, 400);

  const { error } = await db().from("product_kits").upsert({
    operator_id: admin.operator_id,
    product_id: b.product_id,
    tagline: b.tagline || null,
    forward_message: b.forward_message || null,
    fit: b.fit || null,
    materials: parsePairs(b.materials, ["title", "url"]),
    screens: parsePairs(b.screens, ["title", "url"]),
    faq: parsePairs(b.faq, ["q", "a"]),
    updated_at: new Date().toISOString(),
  }, { onConflict: "product_id" });
  if (error) return respond(req, withParam(back, "error", error.message), { error: error.message }, 400);
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
