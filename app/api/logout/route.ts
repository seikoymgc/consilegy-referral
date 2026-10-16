import { NextResponse } from "next/server";
import { SESSION_COOKIE, revokeCurrentSession } from "@/lib/auth";

export async function POST(req: Request) {
  await revokeCurrentSession();
  const res = NextResponse.redirect(new URL("/login/", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
