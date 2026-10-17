import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revokeAllSessions } from "@/lib/auth";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";

export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/partners/";
  if (!b.id) return respond(req, withParam(back, "error", "紹介者が必要です"), { error: "invalid" }, 400);

  if (b.action === "suspend") {
    await db().from("partners").update({ status: "suspended" }).eq("id", b.id).eq("operator_id", admin.operator_id);
    await revokeAllSessions(b.id); // 停止したらセッションをすべて失効
  } else if (b.action === "activate") {
    await db().from("partners").update({ status: "active" }).eq("id", b.id).eq("operator_id", admin.operator_id);
  } else if (b.action === "professional") {
    await db().from("partners").update({ is_professional: b.value === "true" })
      .eq("id", b.id).eq("operator_id", admin.operator_id);
  } else if (b.action === "tax_checked") {
    // 士業の紹介者：源泉徴収の要否を顧問税理士に確認済み
    await db().from("partners").update({ tax_checked_at: new Date().toISOString() })
      .eq("id", b.id).eq("operator_id", admin.operator_id);
  } else {
    return respond(req, withParam(back, "error", "不明な操作です"), { error: "unknown_action" }, 400);
  }
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
