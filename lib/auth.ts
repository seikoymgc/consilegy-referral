import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { appUrl, db, operatorId } from "./db";
import { randomToken, sha256 } from "./crypto";
import { sendMail } from "./mail";
import { cookieLocale, localePath, messages, type Locale } from "./i18n";

export const SESSION_COOKIE = "rp_session";
const TOKEN_TTL_MIN = 15;
const SESSION_TTL_DAYS = 30;
const LIMIT_PER_EMAIL_HOUR = 5;
const LIMIT_PER_IP_HOUR = 20;

export type Partner = {
  id: string;
  operator_id: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  referral_code: string;
  payout_method: "bank" | "none";
  invoice_number: string | null;
  is_professional: boolean;
  bank_last4: string | null;
  marketing_opt_in: boolean;
  role: "partner" | "admin";
  status: "active" | "suspended" | "withdrawn";
  locale: Locale;
};

const PARTNER_COLUMNS =
  "id, operator_id, email, name, company, phone, referral_code, payout_method, invoice_number, is_professional, bank_last4, marketing_opt_in, role, status, locale";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

// ログインリンクを送る。上限に達していたら送らない（応答は呼び出し側で常に同じにする）
// メールは紹介者の言語で送る
export async function sendLoginLink(partnerId: string, email: string, ip: string, locale: Locale): Promise<void> {
  const op = await operatorId();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ count: byEmail }, { count: byIp }] = await Promise.all([
    db().from("login_tokens").select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId).gte("created_at", since),
    db().from("login_tokens").select("id", { count: "exact", head: true })
      .eq("request_ip", ip).gte("created_at", since),
  ]);
  if ((byEmail ?? 0) >= LIMIT_PER_EMAIL_HOUR || (byIp ?? 0) >= LIMIT_PER_IP_HOUR) return;

  const token = randomToken();
  const { error } = await db().from("login_tokens").insert({
    operator_id: op,
    partner_id: partnerId,
    token_hash: sha256(token),
    request_ip: ip,
    expires_at: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(error.message);

  const t = messages(locale);
  const link = `${appUrl()}${localePath(locale, "/auth/verify/")}?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    locale,
    subject: t.mail.loginSubject,
    text: t.mail.loginBody(link, TOKEN_TTL_MIN),
  });
}

// トークンを確かめてセッションを作る。成功したらセッションの生値を返す
export async function verifyLoginToken(token: string): Promise<string | null> {
  const now = new Date().toISOString();
  const { data: row } = await db()
    .from("login_tokens")
    .select("id, partner_id, operator_id, expires_at, used_at")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!row || row.used_at || row.expires_at < now) return null;

  // 1回きり：未使用のときだけ使用済みにする
  const { data: used } = await db()
    .from("login_tokens")
    .update({ used_at: now })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!used || used.length === 0) return null;

  const { data: partner } = await db()
    .from("partners").select("status").eq("id", row.partner_id).single();
  if (!partner || partner.status !== "active") return null;

  return createSession(row.partner_id as string, row.operator_id as string);
}

async function createSession(partnerId: string, op: string): Promise<string> {
  const session = randomToken();
  const { error } = await db().from("sessions").insert({
    operator_id: op,
    partner_id: partnerId,
    session_hash: sha256(session),
    expires_at: new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return session;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  };
}

// 現在の紹介者（セッションが有効で、状態が有効なときだけ）
export async function currentPartner(): Promise<Partner | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const now = new Date();
  const { data: s } = await db()
    .from("sessions")
    .select("id, partner_id, expires_at, revoked_at")
    .eq("session_hash", sha256(raw))
    .maybeSingle();
  if (!s || s.revoked_at || new Date(s.expires_at) < now) return null;

  const { data: p } = await db()
    .from("partners").select(PARTNER_COLUMNS).eq("id", s.partner_id).single();
  if (!p || p.status !== "active") return null;

  // 使うたびに30日延長（1時間に1回まで書き込む）
  const newExpiry = new Date(now.getTime() + SESSION_TTL_DAYS * 86400 * 1000);
  if (newExpiry.getTime() - new Date(s.expires_at).getTime() > 3600 * 1000) {
    await db().from("sessions").update({ expires_at: newExpiry.toISOString() }).eq("id", s.id);
  }
  return p as Partner;
}

export async function requirePartner(): Promise<Partner> {
  const p = await currentPartner();
  if (!p) redirect(localePath(await cookieLocale(), "/login/"));
  return p;
}

export async function requireAdmin(): Promise<Partner> {
  const p = await requirePartner();
  if (p.role !== "admin") redirect("/my/");
  return p;
}

export async function revokeCurrentSession(): Promise<void> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return;
  await db().from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("session_hash", sha256(raw));
}

export async function revokeAllSessions(partnerId: string): Promise<void> {
  await db().from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("partner_id", partnerId)
    .is("revoked_at", null);
}
