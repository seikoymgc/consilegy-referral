import holidayJp from "@holiday-jp/holiday_jp";
const HOLIDAYS: Record<string, unknown> = holidayJp.holidays;
import { db } from "./db";
import { formatDate, formatYen, messages, type Locale } from "./i18n";

// 状態・種類・つなぎ方の表示名は lib/messages（日本語・英語）にある

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

// リンク経由の申込で会社名が分からないときに入れる名前（データベースには日本語で入る）
export const LINK_SIGNUP_COMPANY = "（リンク経由の申込）";

export function displayCompany(name: string, locale: Locale = "ja"): string {
  return name === LINK_SIGNUP_COMPANY ? messages(locale).referrals.linkSignup : name;
}

// 金額・日付の表示（言語ごと）。中身は lib/i18n
export function yen(n: number, locale: Locale = "ja"): string {
  return formatYen(n, locale);
}

export function ymd(d: Date | string | null | undefined, locale: Locale = "ja"): string {
  return formatDate(d, locale);
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
