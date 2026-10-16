import { NextResponse } from "next/server";

// Vercel Cron は Authorization: Bearer <CRON_SECRET> を付けて呼ぶ
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
