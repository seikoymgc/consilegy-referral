import { db, operatorId } from "@/lib/db";
import { referralCode } from "@/lib/crypto";
import { clientIp, sendLoginLink } from "@/lib/auth";
import { readBody, respond, withParam } from "@/lib/http";
import { LOCALE_COOKIE, localeCookieOptions, localePath, messages, toLocale, type Locale } from "@/lib/i18n";

const TERMS_VERSION = "2026-10"; // 紹介の決まりの版

export async function POST(req: Request) {
  const b = await readBody(req);
  const locale = toLocale(b.locale); // 申し込んだページの言語（/ か /en/）
  const t = messages(locale);
  const email = (b.email ?? "").toLowerCase();
  const home = localePath(locale, "/");
  if (!email || !b.name) {
    return respond(req, withParam(home, "error", t.errors.nameEmail) + "#signup",
      { error: "name_and_email_required" }, 400);
  }
  if (b.terms !== "on" && b.terms !== "true") {
    return respond(req, withParam(home, "error", t.errors.terms) + "#signup",
      { error: "terms_required" }, 400);
  }

  const op = await operatorId();
  const { data: existing } = await db().from("partners")
    .select("id, status, locale").eq("operator_id", op).eq("email", email).maybeSingle();

  let partnerId = existing?.id as string | undefined;
  // 登録済みの人は、保存してある言語でログインリンクを送る
  const mailLocale: Locale = existing ? toLocale(existing.locale) : locale;
  if (!partnerId) {
    // 紹介コードは1人1つ（重複したら作り直す）
    for (let i = 0; i < 5 && !partnerId; i++) {
      const { data, error } = await db().from("partners").insert({
        operator_id: op,
        email,
        name: b.name,
        company: b.company || null,
        phone: b.phone || null,
        referral_code: referralCode(),
        is_professional: b.is_professional === "on",
        terms_version: TERMS_VERSION,
        terms_agreed_at: new Date().toISOString(),
        marketing_opt_in: b.marketing === "on",
        locale,
      }).select("id").single();
      if (!error) partnerId = data.id;
      else if (!error.message.includes("referral_code")) break;
    }
  }

  if (partnerId && (existing?.status ?? "active") === "active") {
    await sendLoginLink(partnerId, email, await clientIp(), mailLocale);
  }
  // 登録済みかどうかに関わらず同じ応答（どちらの言語で申し込んだかだけで決まる）
  const res = respond(req, withParam(localePath(locale, "/login/"), "sent", "1"), { ok: true });
  res.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions());
  return res;
}
