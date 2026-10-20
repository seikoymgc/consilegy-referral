import Link from "next/link";
import { Header } from "@/components/Header";
import { AutoSubmit } from "@/components/AutoSubmit";
import { localePath, messages, type Locale } from "@/lib/i18n";

// ログイン画面（/login/ と /en/login/）
export function LoginView({
  locale,
  sent,
  expired,
}: {
  locale: Locale;
  sent?: string;
  expired?: string;
}) {
  const t = messages(locale).login;
  const other: Locale = locale === "en" ? "ja" : "en";
  return (
    <div lang={locale}>
      <Header partner={null} locale={locale} switchHref={localePath(other, "/login/")} />
      <main className="narrow">
        <h1>{t.title}</h1>
        {sent && <p className="alert ok">{t.sent}</p>}
        {expired && <p className="alert error">{t.expired}</p>}
        <form action="/api/login/" method="post" className="card stack">
          <input type="hidden" name="locale" value={locale} />
          <label>
            {t.email}
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <button type="submit">{t.submit}</button>
        </form>
        <p>
          {t.notRegistered} <Link href={`${localePath(locale, "/")}#signup`}>{t.signupLink}</Link>
        </p>
      </main>
    </div>
  );
}

// メールのリンクを開いた画面。開くとそのままマイページへ進む（自動で動かないときだけボタンを押してもらう）
export function VerifyView({ locale, token }: { locale: Locale; token?: string }) {
  const t = messages(locale).verify;
  return (
    <div lang={locale}>
      <Header partner={null} locale={locale} />
      <main className="narrow">
        <h1>{t.title}</h1>
        {token ? (
          <form id="verify-form" action="/api/auth/verify/" method="post" className="card stack">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="locale" value={locale} />
            <p>{t.moving}</p>
            <p className="label">{t.fallback}</p>
            <button type="submit">{t.button}</button>
            <AutoSubmit formId="verify-form" />
          </form>
        ) : (
          <p className="alert error">
            {t.invalid}
            {locale === "en" ? " " : ""}
            <a href={localePath(locale, "/login/")}>{t.resend}</a>
          </p>
        )}
      </main>
    </div>
  );
}
