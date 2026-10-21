import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { apiPartner } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { messages } from "@/lib/i18n";

// PayPalのメールアドレスの登録・変更。保存すると受け取り方を PayPal にする
async function save(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const b = await readBody(req);
  const t = messages(p.locale);
  const email = (b.paypal_email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return respond(req, withParam("/my/settings/", "error", t.errors.paypalEmail), { error: "invalid_paypal_email" }, 400);
  }

  const changed = !!p.paypal_email && p.paypal_email !== email;
  const { error } = await db().from("partners")
    .update({ paypal_email: email, payout_method: "paypal" }).eq("id", p.id);
  if (error) throw new Error(error.message);

  if (changed) {
    // 乗っ取り対策：変更したことを登録メールに知らせる
    await sendMail({
      to: p.email,
      locale: p.locale,
      subject: t.mail.paypalChangedSubject,
      text: t.mail.paypalChangedBody(p.name, email),
    });
  }
  return respond(req, withParam("/my/settings/", "saved", "1"), { ok: true });
}

export const PUT = save;
export const POST = save;
