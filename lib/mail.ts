// メール送信（Resend）。差出人は Consilegy（no-reply）。
// 仕組みから自動で届くメールなので、個人の署名ではなく、サービス名と会社名だけを末尾に入れる。
// お問い合わせは consilegy.com のお問い合わせフォームで受ける。
// 紹介者に送るメールは紹介者の言語（locale）で、フッターもその言語にする。
import { messages, type Locale } from "./i18n";

export function mailFooter(locale: Locale = "ja"): string {
  return messages(locale).mail.footer.join("\n");
}

export async function sendMail(opts: { to: string; subject: string; text: string; locale?: Locale }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Consilegy <no-reply@consilegy.com>";
  const text = `${opts.text}\n\n${mailFooter(opts.locale)}\n`;

  if (!apiKey) {
    // 開発中：送らずにログへ出す
    console.log(`[mail:dev] to=${opts.to} subject=${opts.subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [opts.to], subject: opts.subject, text,
    }),
  });
  if (!res.ok) {
    throw new Error(`メール送信に失敗しました（${res.status}）: ${await res.text()}`);
  }
}

// 運営（管理者）への通知は日本語のまま
export async function notifyAdmin(subject: string, text: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    console.log(`[mail:admin-dev] ${subject}\n${text}`);
    return;
  }
  await sendMail({ to, subject, text });
}
