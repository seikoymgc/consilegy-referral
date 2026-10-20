import { NextResponse } from "next/server";
import { currentPartner, type Partner } from "./auth";
import { isForm } from "./http";
import { cookieLocale, localePath } from "./i18n";

// API用：紹介者IDは必ずセッションから取る（リクエストのIDは信用しない）
export async function apiPartner(req: Request): Promise<Partner | NextResponse> {
  const p = await currentPartner();
  if (p) return p;
  if (isForm(req) && req.method !== "GET") {
    return NextResponse.redirect(new URL(localePath(await cookieLocale(), "/login/"), req.url), 303);
  }
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function apiAdmin(req: Request): Promise<Partner | NextResponse> {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  if (p.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return p;
}
