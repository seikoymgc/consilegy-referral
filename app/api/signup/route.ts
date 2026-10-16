import { db, operatorId } from "@/lib/db";
import { referralCode } from "@/lib/crypto";
import { clientIp, sendLoginLink } from "@/lib/auth";
import { readBody, respond, withParam } from "@/lib/http";

const TERMS_VERSION = "2026-10"; // 紹介の決まりの版

export async function POST(req: Request) {
  const b = await readBody(req);
  const email = (b.email ?? "").toLowerCase();
  if (!email || !b.name) {
    return respond(req, withParam("/", "error", "お名前とメールアドレスを入れてください") + "#signup",
      { error: "name_and_email_required" }, 400);
  }
  if (b.terms !== "on" && b.terms !== "true") {
    return respond(req, withParam("/", "error", "紹介の決まりへの同意が必要です") + "#signup",
      { error: "terms_required" }, 400);
  }

  const op = await operatorId();
  const { data: existing } = await db().from("partners")
    .select("id, status").eq("operator_id", op).eq("email", email).maybeSingle();

  let partnerId = existing?.id as string | undefined;
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
      }).select("id").single();
      if (!error) partnerId = data.id;
      else if (!error.message.includes("referral_code")) break;
    }
  }

  if (partnerId && (existing?.status ?? "active") === "active") {
    await sendLoginLink(partnerId, email, await clientIp());
  }
  // 登録済みかどうかに関わらず同じ応答
  return respond(req, withParam("/login/", "sent", "1"), { ok: true });
}
