import { db, operatorId } from "@/lib/db";
import { clientIp, sendLoginLink } from "@/lib/auth";
import { readBody, respond, withParam } from "@/lib/http";
import { LOCALE_COOKIE, localeCookieOptions, localePath, toLocale } from "@/lib/i18n";

export async function POST(req: Request) {
  const b = await readBody(req);
  const locale = toLocale(b.locale); // ログイン画面の言語
  const email = (b.email ?? "").toLowerCase();

  if (email) {
    const op = await operatorId();
    const { data: p } = await db().from("partners")
      .select("id, status, locale").eq("operator_id", op).eq("email", email).maybeSingle();
    // メールは紹介者が選んでいる言語で送る
    if (p && p.status === "active") await sendLoginLink(p.id, email, await clientIp(), toLocale(p.locale));
  }
  // 応答は登録の有無にかかわらず同じ
  const res = respond(req, withParam(localePath(locale, "/login/"), "sent", "1"), { ok: true });
  res.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions());
  return res;
}
