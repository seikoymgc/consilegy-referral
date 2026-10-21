import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { apiPartner } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";
import { messages } from "@/lib/i18n";

async function save(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const b = await readBody(req);
  const t = messages(p.locale);

  const bank = {
    bank_code: (b.bank_code ?? "").replace(/\D/g, ""),
    branch_code: (b.branch_code ?? "").replace(/\D/g, ""),
    account_type: b.account_type === "checking" ? "checking" : "ordinary",
    account_number: (b.account_number ?? "").replace(/\D/g, ""),
    holder_kana: (b.holder_kana ?? "").trim(),
  };
  const valid = /^\d{4}$/.test(bank.bank_code) && /^\d{3}$/.test(bank.branch_code)
    && /^\d{7}$/.test(bank.account_number) && bank.holder_kana.length > 0;
  if (!valid) {
    return respond(req, withParam("/my/settings/", "error", t.errors.bank),
      { error: "invalid_bank" }, 400);
  }

  const hadBank = !!p.bank_last4;
  await db().from("partners").update({
    bank_encrypted: encrypt(JSON.stringify(bank)),
    bank_last4: bank.account_number.slice(-4),
  }).eq("id", p.id);

  if (hadBank) {
    await sendMail({
      to: p.email,
      locale: p.locale,
      subject: t.mail.bankChangedSubject,
      text: t.mail.bankChangedBody(p.name, bank.account_number.slice(-4)),
    });
  }
  return respond(req, withParam("/my/settings/", "saved", "1"), { ok: true, last4: bank.account_number.slice(-4) });
}

export const PUT = save;
export const POST = save;
