import { NextResponse } from "next/server";
import { cronAuthorized, unauthorized } from "@/lib/cron";
import { runDaily } from "@/lib/rewards";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return unauthorized();
  return NextResponse.json({ ok: true, ...(await runDaily()) });
}
