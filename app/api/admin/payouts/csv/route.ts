import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { apiAdmin } from "@/lib/guard";

// 承認済みの支払いの振込リスト（CSV）。
// 全銀協形式（固定長）は委託者コードなど当社の口座情報が必要なため、未対応。いまは振込に必要な項目をCSVで出す。
export async function GET(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { data: payouts } = await db().from("payouts")
    .select("id, month, amount, bank_snapshot_encrypted, partners(name)")
    .eq("operator_id", admin.operator_id).eq("status", "approved").order("month");

  const lines = ["対象月,紹介者,銀行コード,支店コード,口座種別,口座番号,口座名義カナ,金額"];
  for (const p of payouts ?? []) {
    if (!p.bank_snapshot_encrypted) continue;
    const bank = JSON.parse(decrypt(p.bank_snapshot_encrypted)) as Record<string, string>;
    const name = (p.partners as unknown as { name: string } | null)?.name ?? "";
    lines.push([
      p.month.slice(0, 7), name, bank.bank_code, bank.branch_code,
      bank.account_type === "checking" ? "当座" : "普通", bank.account_number, bank.holder_kana, p.amount,
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
