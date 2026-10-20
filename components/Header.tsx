import Image from "next/image";
import Link from "next/link";
import type { Partner } from "@/lib/auth";
import { localePath, messages, type Locale } from "@/lib/i18n";

// ヘッダーには常に「ログイン」（ログイン中は「マイページ」）と、言語の切り替え。
// 公開ページ（案内・ログイン）の切り替えは同じページの別の言語へのリンク（switchHref）。
// マイページ・管理画面の切り替えは紹介者の言語を保存して、同じページ（back）に戻る。
export function Header({
  partner,
  locale,
  switchHref,
  back,
}: {
  partner: Partner | null;
  locale: Locale;
  switchHref?: string;
  back?: string;
}) {
  const t = messages(locale);
  const other: Locale = locale === "en" ? "ja" : "en";
  const home = localePath(locale, "/");
  return (
    <header className="topbar">
      <Link href={home} className="brand" aria-label={t.brand.homeAria}>
        <Image
          src="/images/consilegy-logo.svg"
          alt="Consilegy"
          width={155}
          height={28}
          className="brand-logo"
        />
        <span className="brand-caption">{t.brand.caption}</span>
      </Link>
      <nav>
        {partner ? (
          <>
            <Link href="/my/">{t.header.mypage}</Link>
            {partner.role === "admin" && <Link href="/admin/">{t.header.admin}</Link>}
          </>
        ) : (
          <>
            <Link href={`${home}#products`} className="header-product-link">
              {t.header.products}
            </Link>
            <Link href={localePath(locale, "/login/")}>{t.header.login}</Link>
            <Link href={`${home}#signup`} className="button action-primary header-cta">
              {t.header.signup} <span aria-hidden="true">↗</span>
            </Link>
          </>
        )}
        {switchHref || !partner ? (
          <Link
            href={switchHref ?? localePath(other, "/")}
            hrefLang={other}
            lang={other}
            aria-label={t.lang.switchAria}
            className="lang-switch"
          >
            <span className="lang-full">{t.lang.switchLabel}</span>
            <span className="lang-short" aria-hidden="true">{t.lang.switchShort}</span>
          </Link>
        ) : (
          <form action="/api/me/locale/" method="post" className="lang-switch-form">
            <input type="hidden" name="locale" value={other} />
            <input type="hidden" name="back" value={back ?? "/my/"} />
            <button type="submit" className="lang-switch" lang={other} aria-label={t.lang.switchAria}>
              <span className="lang-full">{t.lang.switchLabel}</span>
              <span className="lang-short" aria-hidden="true">{t.lang.switchShort}</span>
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}

export function MyNav({ current, locale }: { current: string; locale: Locale }) {
  const t = messages(locale).nav;
  const items = [
    ["/my/", t.home],
    ["/my/products/", t.products],
    ["/my/referrals/", t.referrals],
    ["/my/rewards/", t.rewards],
    ["/my/settings/", t.settings],
  ];
  return (
    <nav className="subnav partner-nav" aria-label={t.aria}>
      {items.map(([href, label], index) => (
        <Link
          key={href}
          aria-label={label}
          className={href === "/my/products/" ? "nav-primary" : undefined}
          href={href}
          aria-current={current === href ? "page" : undefined}
        >
          <span className="nav-number" aria-hidden="true">
            0{index + 1}
          </span>
          <span className="nav-label-full">{label}</span>
          <span className="nav-label-short">{t.short[index]}</span>
          <span className="nav-arrow" aria-hidden="true">
            ↗
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function AdminNav({ current, locale }: { current: string; locale: Locale }) {
  const t = messages(locale).adminNav;
  const items = [
    ["/admin/", t.overview],
    ["/admin/products/", t.products],
    ["/admin/partners/", t.partners],
    ["/admin/referrals/", t.referrals],
    ["/admin/payouts/", t.payouts],
  ];
  return (
    <nav className="subnav">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

// 管理画面の共通の枠（ヘッダー・ナビ・言語）
export function AdminFrame({
  admin,
  current,
  children,
}: {
  admin: Partner;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div lang={admin.locale}>
      <Header partner={admin} locale={admin.locale} back={current} />
      <main>
        <AdminNav current={current} locale={admin.locale} />
        {children}
      </main>
    </div>
  );
}

export function Notice({
  params,
  locale,
}: {
  params: { error?: string; saved?: string };
  locale: Locale;
}) {
  return (
    <>
      {params.error && <p className="alert error">{params.error}</p>}
      {params.saved && (
        <p className="alert ok">
          {params.saved === "1" ? messages(locale).common.saved : params.saved}
        </p>
      )}
    </>
  );
}
