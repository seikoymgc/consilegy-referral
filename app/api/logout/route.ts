import { NextResponse } from "next/server";
import { SESSION_COOKIE, currentPartner, revokeCurrentSession } from "@/lib/auth";
import { LOCALE_COOKIE, cookieLocale, localeCookieOptions, localePath } from "@/lib/i18n";

export async function POST(req: Request) {
  const locale = (await currentPartner())?.locale ?? (await cookieLocale());
  await revokeCurrentSession();
  const res = NextResponse.redirect(new URL(localePath(locale, "/login/"), req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions());
  return res;
}
