import holidayJp from "@holiday-jp/holiday_jp";
const HOLIDAYS: Record<string, unknown> = holidayJp.holidays;
import { db } from "./db";

export const STATUS_LABEL: Record<string, string> = {
  pending: "受理待ち",
  accepted: "受理",
  existing_contact: "既存接点あり",
  out_of_scope: "対象外",
  confirmed: "紹介者確定",
  paying: "有料契約中",
  ended: "報酬期間終了",
  expired: "失効",
  cancelled: "解約",
};

export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  held: "保留",
  confirmed: "確定",
  paid: "支払済み",
  cancelled: "取消",
  offset: "相殺",
};

export const KIND_LABEL: Record<string, string> = {
  monthly_rate: "月額",
  service_rate: "導入支援",
  fixed: "定額",
};

// 営業日（土日を除く）を足す。祝日は考慮していない（管理画面の期限表示は目安）
// 営業日：土日・祝日（振替休日を含む）・年末年始（12/31〜1/3）を除く。日付は日本時間で数える。
const JST = 9 * 60 * 60 * 1000;
export function isBusinessDayJst(jst: Date): boolean {
  const w = jst.getUTCDay();
  if (w === 0 || w === 6) return false;
  const m = jst.getUTCMonth() + 1, day = jst.getUTCDate();
  if ((m === 12 && day === 31) || (m === 1 && day <= 3)) return false;
  const key = `${jst.getUTCFullYear()}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return !(key in HOLIDAYS);
}

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime() + JST); // 日本時間の暦で数える
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusinessDayJst(d)) added++;
  }
  return new Date(d.getTime() - JST);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function yen(n: number): string {
  return `${Math.trunc(n).toLocaleString("ja-JP")}円`;
}

export function ymd(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

// 受理時点の報酬ルールを固定するためのスナップショット
export async function snapshotRules(productId: string) {
  const { data } = await db()
    .from("reward_rules")
    .select("id, kind, label, rate, fixed_amount, fixed_months, period_months, once, excluded_plans, effective_from")
    .eq("product_id", productId)
    .lte("effective_from", new Date().toISOString().slice(0, 10))
    .order("effective_from", { ascending: false });
  // 種類ごとに一番新しいルールだけ
  const byKind = new Map<string, unknown>();
  for (const r of data ?? []) if (!byKind.has(r.kind)) byKind.set(r.kind, r);
  return Array.from(byKind.values());
}
