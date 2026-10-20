import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { apiAdmin } from "@/lib/guard";
import { withParam } from "@/lib/http";
import { messages } from "@/lib/i18n";
import { buildZengin, settingsComplete, type TransferRow, type TransferSettings } from "@/lib/zengin";

// 承認済みの支払いの振込データ（全銀協形式・総合振込）。?date=YYYY-MM-DD で振込指定日
export async function GET(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const back = "/admin/payouts/";
  const e = messages(admin.locale).admin.errors;

  const { data: op } = await db().from("operators").select("transfer_settings").eq("id", admin.operator_id).single();
  const settings = (op?.transfer_settings ?? null) as TransferSettings | null;
  if (!settingsComplete(settings)) {
    return NextResponse.redirect(new URL(withParam(back, "error", e.transferSettingsFirst), req.url), 303);
  }

  const { data: payouts } = await db().from("payouts")
    .select("id, amount, bank_snapshot_encrypted")
    .eq("operator_id", admin.operator_id).eq("status", "approved").order("month");
  const rows: TransferRow[] = [];
  for (const p of payouts ?? []) {
    if (!p.bank_snapshot_encrypted) continue;
    const bank = JSON.parse(decrypt(p.bank_snapshot_encrypted)) as Record<string, string>;
    rows.push({
      bank_code: bank.bank_code, branch_code: bank.branch_code,
      account_type: bank.account_type === "checking" ? "checking" : "ordinary",
      account_number: bank.account_number, holder_kana: bank.holder_kana, amount: p.amount,
    });
  }
  if (rows.length === 0) {
    return NextResponse.redirect(new URL(withParam(back, "error", e.noApproved), req.url), 303);
  }

  const dateParam = new URL(req.url).searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(`${dateParam}T00:00:00+09:00`) : new Date();
  const data = buildZengin(settings, date, rows);
  console.log(`[audit] zengin exported by ${admin.id} at ${new Date().toISOString()} (${rows.length}件)`);

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "text/plain; charset=Shift_JIS",
      "Content-Disposition": `attachment; filename="zengin-${(dateParam ?? new Date().toISOString().slice(0, 10)).replaceAll("-", "")}.txt"`,
      "Cache-Control": "no-store",
    },
  });
}
