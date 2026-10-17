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
  const msg = `毎日の処理 ${JSON.stringify(daily)} / 締め ${JSON.stringify(monthly)}`;
  return respond(req, withParam("/admin/payouts/", "saved", msg), { ok: true, daily, monthly });
}
