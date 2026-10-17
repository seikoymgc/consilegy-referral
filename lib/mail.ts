// メール送信（Resend）。差出人は Consilegy（no-reply）。
// 仕組みから自動で届くメールなので、個人の署名ではなく、サービス名と会社名だけを末尾に入れる。
// 返信は ADMIN_NOTIFY_EMAIL に届くようにする（no-reply に返信されても受け取れないため）。
export const MAIL_FOOTER = [
  "──────────",
  "Consilegy 紹介パートナー",
  "Consilegy合同会社",
  "https://referral.consilegy.com",
].join("\n");

export async function sendMail(opts: { to: string; subject: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Consilegy <no-reply@consilegy.com>";
  const text = `${opts.text}\n\n${MAIL_FOOTER}\n`;

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
      ...(process.env.ADMIN_NOTIFY_EMAIL ? { reply_to: process.env.ADMIN_NOTIFY_EMAIL } : {}),
    }),
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
