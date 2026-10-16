import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, verifyLoginToken } from "@/lib/auth";
import { readBody } from "@/lib/http";

// ログインリンクの画面の「ログインする」ボタンから呼ぶ（メールの安全確認でトークンを使い切らないため）
export async function POST(req: Request) {
  const b = await readBody(req);
  const session = b.token ? await verifyLoginToken(b.token) : null;
  if (!session) {
    return NextResponse.redirect(new URL("/login/?expired=1", req.url), 303);
  }
  const res = NextResponse.redirect(new URL("/my/", req.url), 303);
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
  return res;
}
