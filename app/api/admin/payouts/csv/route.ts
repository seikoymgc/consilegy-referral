import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { apiAdmin } from "@/lib/guard";
import { messages } from "@/lib/i18n";

// 承認済みの支払いの振込リスト（CSV）。?method=paypal で PayPal の支払い一覧（メールアドレスと金額）。
// 全銀協形式（固定長）は委託者コードなど当社の口座情報が必要なため、未対応。いまは振込に必要な項目をCSVで出す。
export async function GET(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const paypal = new URL(req.url).searchParams.get("method") === "paypal";
  const { data: payouts } = await db().from("payouts")
    .select("id, month, amount, bank_snapshot_encrypted, paypal_email_snapshot, partners(name)")
    .eq("operator_id", admin.operator_id).eq("status", "approved").eq("method", paypal ? "paypal" : "bank").order("month");

  const t = messages(admin.locale).admin.payouts;
  const quote = (vals: unknown[]) => vals.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",");
  if (paypal) {
    const rows = [t.csvHeaderPaypal, ...(payouts ?? []).map((p) => quote([
      p.month.slice(0, 7), (p.partners as unknown as { name: string } | null)?.name ?? "", p.paypal_email_snapshot, p.amount, "JPY",
    ]))];
    console.log(`[audit] paypal payouts csv exported by ${admin.id} at ${new Date().toISOString()}`);
    return new NextResponse("\ufeff" + rows.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="paypal-payouts-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const lines = [t.csvHeader];
  for (const p of payouts ?? []) {
    if (!p.bank_snapshot_encrypted) continue;
    const bank = JSON.parse(decrypt(p.bank_snapshot_encrypted)) as Record<string, string>;
    const name = (p.partners as unknown as { name: string } | null)?.name ?? "";
    lines.push([
      p.month.slice(0, 7), name, bank.bank_code, bank.branch_code,
      bank.account_type === "checking" ? t.checking : t.ordinary, bank.account_number, bank.holder_kana, p.amount,
    ].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
  }
  // 口座情報の閲覧は記録を残す
  console.log(`[audit] payouts csv exported by ${admin.id} at ${new Date().toISOString()}`);

  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payouts-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
