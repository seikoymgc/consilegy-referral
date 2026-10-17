import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { apiPartner } from "@/lib/guard";
import { readBody, respond, withParam } from "@/lib/http";

async function save(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const b = await readBody(req);

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
    return respond(req, withParam("/my/settings/", "error",
      "銀行コード4桁・支店コード3桁・口座番号7桁・口座名義（カナ）を入れてください"),
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
      subject: "【Consilegy 紹介パートナー】振込先が変更されました",
      text: `${p.name} 様\n\n振込先が変更されました（口座番号 下4桁：${bank.account_number.slice(-4)}）。\nお心当たりのない場合は、お問い合わせフォームからご連絡ください。\nhttps://consilegy.com/contact/`,
    });
  }
  return respond(req, withParam("/my/settings/", "saved", "1"), { ok: true, last4: bank.account_number.slice(-4) });
}

export const PUT = save;
export const POST = save;
