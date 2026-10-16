import { NextResponse } from "next/server";

// フォーム（画面から）とJSON（API）の両方を受ける
export async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = (await req.json()) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v == null ? "" : String(v)]));
  }
  const fd = await req.formData();
  const out: Record<string, string> = {};
  fd.forEach((v, k) => { out[k] = typeof v === "string" ? v.trim() : ""; });
  return out;
}

export function isForm(req: Request): boolean {
  return !(req.headers.get("content-type") ?? "").includes("application/json");
}

// 画面からのフォームは303で戻す。APIはJSON
export function respond(req: Request, to: string, json: unknown, status = 200) {
  if (isForm(req)) return NextResponse.redirect(new URL(to, req.url), 303);
  return NextResponse.json(json, { status });
}

export function withParam(path: string, key: string, value: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}
