import { cookies } from "next/headers";
import { ja } from "./messages/ja";
import { en } from "./messages/en";

// 画面・メール・支払通知書の言語。
// ログイン前の画面は URL（/en/ で始まるか）で、ログイン後は紹介者ごとに保存した言語で決める。
export type Locale = "ja" | "en";
export type Messages = typeof ja;

export const LOCALE_COOKIE = "rp_locale"; // ログアウト中にどちらのログイン画面へ戻すかに使う

export function toLocale(value: unknown): Locale {
  return value === "en" ? "en" : "ja";
}

export function messages(locale: Locale): Messages {
  return locale === "en" ? en : ja;
}

// "/login/" → 英語なら "/en/login/"。紹介者向けの公開ページ（案内・ログイン）だけに使う
export function localePath(locale: Locale, path: string): string {
  if (locale !== "en") return path;
  return path === "/" ? "/en/" : `/en${path}`;
}

export async function cookieLocale(): Promise<Locale> {
  return toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export function localeCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 365 * 86400,
  };
}

// 金額：ja「5,000円」／en「¥5,000」
export function formatYen(n: number, locale: Locale = "ja"): string {
  const v = Math.trunc(n);
  if (locale === "en") {
    return `${v < 0 ? "-" : ""}¥${Math.abs(v).toLocaleString("en-US")}`;
  }
  return `${v.toLocaleString("ja-JP")}円`;
}

// 日付（日本時間）：ja「2026/10/21」／en「Oct 21, 2026」
export function formatDate(d: Date | string | null | undefined, locale: Locale = "ja"): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  if (locale === "en") {
    return x.toLocaleDateString("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return x.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

// 対象月（"2026-10-01" など）：ja「2026-10」／en「Oct 2026」
export function formatMonth(month: string, locale: Locale = "ja"): string {
  const ym = month.slice(0, 7);
  if (locale !== "en") return ym;
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
  });
}
