// メール送信（Resend）。差出人はConsilegy、本文の末尾に署名を入れる。
// 署名は2026-10-15にSeikoさんが確定したものをそのまま使う（勝手に変えない）。
export const MAIL_SIGNATURE = [
  "━━━━━━━━━━━━━━━━━━━━",
  "山口 聖子 | Seiko Yamaguchi",
  "Consilegy合同会社 代表 | CEO",
  "使われていない顧客データを、売上が動く仕組みへ。",
  "",
  "Tel / WhatsApp：+81 80-4596-5021",
  "Mail：seiko.yamaguchi@consilegy.com",
  "Web：https://consilegy.com",
  "LinkedIn：https://www.linkedin.com/in/seiko-yamaguchi",
  "",
  "▼ニュースレター登録（無料）",
  "日本語：https://consilegy.com/newsletter/#signup",
  "English：https://consilegy.com/en/newsletter/#signup",
  "━━━━━━━━━━━━━━━━━━━━",
].join("\n");

export async function sendMail(opts: { to: string; subject: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Consilegy <no-reply@consilegy.com>";
  const text = `${opts.text}\n\n${MAIL_SIGNATURE}\n`;

  if (!apiKey) {
    // 開発中：送らずにログへ出す
    console.log(`[mail:dev] to=${opts.to} subject=${opts.subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, text }),
  });
  if (!res.ok) {
    throw new Error(`メール送信に失敗しました（${res.status}）: ${await res.text()}`);
  }
}

export async function notifyAdmin(subject: string, text: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    console.log(`[mail:admin-dev] ${subject}\n${text}`);
    return;
  }
  await sendMail({ to, subject, text });
}
