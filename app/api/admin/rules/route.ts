import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { messages } from "@/lib/i18n";

// 報酬ルールの追加。ルールを変えても、受理済みの紹介は受理時点のルール（rule_snapshot）を使う
export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const b = await readBody(req);
  const back = "/admin/products/";

  if (!b.product_id || !["monthly_rate", "service_rate", "fixed"].includes(b.kind) || !b.label) {
    return respond(req, withParam(back, "error", messages(admin.locale).admin.errors.ruleRequired), { error: "invalid" }, 400);
  }
  const ratePct = b.rate_percent ? Number(b.rate_percent) : null;
  const { error } = await db().from("reward_rules").insert({
    operator_id: admin.operator_id,
    product_id: b.product_id,
    kind: b.kind,
    label: b.label,
    label_en: b.label_en || null,
    rate: ratePct == null ? null : ratePct / 100,
    fixed_amount: b.fixed_amount ? Math.trunc(Number(b.fixed_amount)) : null,
    fixed_months: b.fixed_months ? Number(b.fixed_months) : null,
    period_months: b.period_months ? Math.trunc(Number(b.period_months)) : null,
    once: b.once === "on",
    excluded_plans: (b.excluded_plans ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    effective_from: b.effective_from || new Date().toISOString().slice(0, 10),
  });
  if (error) return respond(req, withParam(back, "error", error.message), { error: error.message }, 400);
  return respond(req, withParam(back, "saved", "1"), { ok: true });
}
