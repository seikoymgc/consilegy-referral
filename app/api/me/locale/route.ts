import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiPartner } from "@/lib/guard";
import { readBody } from "@/lib/http";
import { LOCALE_COOKIE, localeCookieOptions, toLocale } from "@/lib/i18n";

// ヘッダーの言語の切り替え（ログイン中）。紹介者の言語を保存して、元のページに戻る
export async function POST(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const b = await readBody(req);
  const locale = toLocale(b.locale);
  await db().from("partners").update({ locale }).eq("id", p.id);

  // 戻り先はこのサイトのパスだけ（外のURLへは飛ばさない）
  const back = /^\/(?!\/)[\w\-/?=&.%]*$/.test(b.back ?? "") ? b.back : "/my/";
  const res = NextResponse.redirect(new URL(back, req.url), 303);
  res.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions());
  return res;
}
