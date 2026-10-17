import { NextResponse } from "next/server";
import { apiAdmin } from "@/lib/guard";
import { respond, withParam } from "@/lib/http";
import { runDaily, runMonthly } from "@/lib/rewards";

// 定期処理を管理画面から手で動かす（Cronと同じ処理。何度動かしても二重にならない）
export async function POST(req: Request) {
  const admin = await apiAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const daily = await runDaily();
  const monthly = await runMonthly();
  const d = daily as Record<string, number>, m = monthly as Record<string, number>;
  const msg = [
    `自動受理 ${d.autoAccepted ?? 0}件`, `受理の期限切れの通知 ${d.formOverdue ?? 0}件`, `90日で失効 ${d.expired90 ?? 0}件`,
    `12か月で見送り ${d.expired12m ?? 0}件`, `報酬期間終了 ${d.ended ?? 0}件`,
    `支払いの下書き ${m.drafts ?? 0}件`, `繰り越し ${m.carriedOver ?? 0}人`, `振込先の登録待ち ${m.needBank ?? 0}人`, `士業の確認待ち ${m.professionalHold ?? 0}人`,
  ].join(" / ");
  return respond(req, withParam("/admin/payouts/", "saved", msg), { ok: true, daily, monthly });
}
