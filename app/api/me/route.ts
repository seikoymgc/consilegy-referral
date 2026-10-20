import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, revokeAllSessions } from "@/lib/auth";
import { apiPartner } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { LOCALE_COOKIE, localeCookieOptions, localePath, messages, toLocale } from "@/lib/i18n";

export async function GET(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  return NextResponse.json({ me: p }); // 振込先は下4桁（bank_last4）だけ
}

async function update(req: Request, b: Record<string, string>) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const invoice = (b.invoice_number ?? "").toUpperCase();
  if (invoice && !/^T\d{13}$/.test(invoice)) {
    return respond(req, withParam("/my/settings/", "error", messages(p.locale).errors.invoice),
      { error: "invalid_invoice_number" }, 400);
  }
  const { error } = await db().from("partners").update({
    name: b.name || p.name,
    company: b.company || null,
    phone: b.phone || null,
    invoice_number: invoice || null,
    payout_method: b.payout_method === "none" ? "none" : "bank",
    marketing_opt_in: b.marketing === "on" || b.marketing === "true",
    locale: b.locale ? toLocale(b.locale) : p.locale, // 表示とメールの言語
  }).eq("id", p.id);
  if (error) throw new Error(error.message);
  const res = respond(req, withParam("/my/settings/", "saved", "1"), { ok: true });
  if (b.locale) res.cookies.set(LOCALE_COOKIE, toLocale(b.locale), localeCookieOptions());
  return res;
}

// 退会：新しい紹介を止め、個人情報を消す。確定済み未払いの報酬は次の支払日に払う
async function withdraw(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  await db().from("partners").update({
    status: "withdrawn",
    withdrawn_at: new Date().toISOString(),
    name: "退会済み",
    company: null,
    phone: null,
    marketing_opt_in: false,
    // 未払いの報酬を払うため、振込先は支払いが済むまで残す（支払い後に消す）
  }).eq("id", p.id);
  await revokeAllSessions(p.id);
  const res = respond(req, `${localePath(p.locale, "/")}?withdrawn=1`, { ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function PATCH(req: Request) {
  return update(req, await readBody(req));
}

export async function DELETE(req: Request) {
  return withdraw(req);
}

// 画面のフォーム用（_method=PATCH / DELETE）
export async function POST(req: Request) {
  const b = await readBody(req);
  if (b._method === "DELETE") return withdraw(req);
  return update(req, b);
}
