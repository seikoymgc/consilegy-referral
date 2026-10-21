import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, randomToken } from "@/lib/crypto";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { messages } from "@/lib/i18n";

// 製品の追加・更新・公開状態の変更・通知キーの発行
export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/products/";
  const e = messages(admin.locale).admin.errors;

  if (b.action === "create") {
    if (!/^[a-z0-9-]+$/.test(b.slug ?? "") || !b.name) {
      return respond(req, withParam(back, "error", e.productInvalid), { error: "invalid" }, 400);
    }
    const { error } = await db().from("products").insert({
      operator_id: admin.operator_id, slug: b.slug, name: b.name,
      status: ["public", "preparing", "hidden"].includes(b.status) ? b.status : "hidden",
      destination_url: b.destination_url || null, fit_summary: b.fit_summary || null,
      fit_summary_en: b.fit_summary_en || null,
      sort_order: Number(b.sort_order || 0),
    });
    if (error) return respond(req, withParam(back, "error", error.message), { error: error.message }, 400);
    return respond(req, withParam(back, "saved", "1"), { ok: true });
  }

  if (b.action === "update" && b.id) {
    await db().from("products").update({
      name: b.name, status: b.status, destination_url: b.destination_url || null,
      fit_summary: b.fit_summary || null, fit_summary_en: b.fit_summary_en || null,
      sort_order: Number(b.sort_order || 0),
    }).eq("id", b.id).eq("operator_id", admin.operator_id);
    return respond(req, withParam(back, "saved", "1"), { ok: true });
  }

  if (b.action === "issue_key" && b.id) {
    // 生のキーはこの1回だけ表示。保存は暗号化した値だけ
    const key = randomToken(32);
    await db().from("products").update({ signing_key_encrypted: encrypt(key) })
      .eq("id", b.id).eq("operator_id", admin.operator_id);
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      const res = NextResponse.redirect(new URL(back, req.url), 303);
      res.cookies.set("admin_flash_key", key, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
        path: "/admin/products", maxAge: 60,
      });
      return res;
    }
    return NextResponse.json({ ok: true, key });
  }

  return respond(req, withParam(back, "error", e.unknownAction), { error: "unknown_action" }, 400);
}
