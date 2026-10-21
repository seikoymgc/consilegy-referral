import Image from "next/image";
import Link from "next/link";
import type { Partner } from "@/lib/auth";
import type { ProductCard } from "@/lib/queries";
import { localePath, messages, type Locale } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { productOffers, productKitPath } from "@/lib/product-editions";

// 案内・申込ページ。日本語（/）と英語（/en/）で同じ作り。
// 紹介の決まりの原文：consilegy-astro/src/pages/crm/referral/index.astro（全製品共通）
export function Landing({
  locale,
  partner,
  products,
  error,
  withdrawn,
}: {
  locale: Locale;
  partner: Partner | null;
  products: ProductCard[];
  error?: string;
  withdrawn?: string;
}) {
  const t = messages(locale);
  const l = t.landing;
  const other: Locale = locale === "en" ? "ja" : "en";
  const home = localePath(locale, "/");

  return (
    <div lang={locale}>
      <Header partner={partner} locale={locale} switchHref={localePath(other, "/")} />
      <main className="landing">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> CONSILEGY PARTNER PROGRAM
            </p>
            <h1>
              {l.heroTitle1}
              <br />
              <span>{l.heroTitle2}</span>
              {l.heroTitle3}
            </h1>
            <p className="hero-description">
              {l.heroDescription1}
              <br />
              {l.heroDescription2}
            </p>
            <div className="actions">
              <a href="#signup" className="button action-primary">
                {l.heroCta} <span aria-hidden="true">↗</span>
              </a>
              <a href="#how-it-works" className="text-link">
                {l.heroHow} <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="hero-note">
              {l.heroNote1} <span>／</span> {l.heroNote2}
            </p>
          </div>
          <div className="connection-art" role="img" aria-label={l.artAria}>
            <div className="art-grid" />
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <div className="art-caption">
              A LITTLE INTRODUCTION.
              <br />
              <strong>A NEW POSSIBILITY.</strong>
            </div>
            <svg
              className="connection-lines"
              viewBox="0 0 500 430"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M125 160C125 255 365 155 365 275"
                stroke="#93c5fd"
                strokeWidth="2"
                strokeDasharray="5 7"
              />
              <path
                d="M135 170C135 310 270 340 340 285"
                stroke="#93c5fd"
                strokeWidth="2"
              />
              <path d="m327 282 14 2-5 13" stroke="#93c5fd" strokeWidth="2" />
            </svg>
            <div className="person-card person-you">
              <span className="avatar">
                Y<span>●</span>
              </span>
              <div>
                <small>{l.artYouSmall}</small>
                <strong>{l.artYou}</strong>
              </div>
              <span className="mini-star">✳</span>
            </div>
            <div className="intro-message">
              <span className="mail-icon">↗</span>
              <div>
                {l.artMessage1}
                <br />
                <strong>{l.artMessage2}</strong>
              </div>
            </div>
            <div className="person-card person-friend">
              <span className="avatar friend-avatar">↗</span>
              <div>
                <small>{l.artFriendSmall}</small>
                <strong>{l.artFriend}</strong>
              </div>
            </div>
            <div className="reward-chip">
              <span>✧</span> {l.artReward}
            </div>
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">＋</span>
            <span className="art-bottom">GOOD CONNECTIONS GO A LONG WAY.</span>
          </div>
          {withdrawn && <p className="alert ok">{l.withdrawn}</p>}
        </section>

        <div className="benefit-strip">
          <p>
            <span>01</span> {l.benefit1} <strong>{l.benefit1Value}</strong>
          </p>
          <p>
            <span>02</span> {l.benefit2} <strong>{l.benefit2Value}</strong>
          </p>
          <p>
            <span>03</span> {l.benefit3} <strong>{l.benefit3Value}</strong>
          </p>
        </div>

        <section id="products" className="landing-section products-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OUR PRODUCTS</p>
              <h2>{l.productsTitle}</h2>
            </div>
            <p>
              {l.productsLead1}
              <br />
              {l.productsLead2}
            </p>
          </div>
          <div className="product-grid">
            {productOffers(products, locale).map((p, i) => (
              <article
                key={p.key}
                className={`product-card ${p.status === "preparing" ? "product-preparing" : ""}`}
              >
                <div className="product-top">
                  <span className="product-icon" aria-hidden="true">
                    {i % 2 === 0 ? "↗" : "✳"}
                  </span>
                  <span
                    className={`product-status ${p.status === "public" ? "is-public" : ""}`}
                  >
                    <span />
                    {p.status === "public" ? l.statusPublic : l.statusPreparing}
                  </span>
                </div>
                <h3>{p.name}</h3>
                {p.audience && <p className="product-audience">{p.audience}</p>}
                <p className="product-description">
                  {p.fit_summary ||
                    (p.status === "preparing" ? l.preparingDescription : l.publicDescription)}
                </p>
                {p.status === "public" && p.rules.length > 0 && (
                  <div className="reward-info">
                    <p className="eyebrow">{l.rewardTitle}</p>
                    <ul>
                      {p.rules.map((r) => (
                        <li key={r.kind}>{r.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.status === "public" ? (
                  <a
                    className="product-link"
                    href={partner ? productKitPath(p.slug, p.edition) : "#signup"}
                  >
                    {l.referThis} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <p className="coming-soon">{l.comingSoon}</p>
                )}
              </article>
            ))}
            {products.length === 0 && <p className="card">{l.noProducts}</p>}
          </div>
        </section>

        <section className="promise-section">
          <div>
            <p className="eyebrow">OUR PROMISE</p>
            <h2>
              {l.promiseTitle1}
              <br />
              {l.promiseTitle2}
            </h2>
            <p>{l.promiseLead}</p>
            <span className="promise-flower" aria-hidden="true">
              ✳
            </span>
          </div>
          <ul>
            {l.promises.map((text, i) => (
              <li key={text}>
                <span>0{i + 1}</span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HOW IT WORKS</p>
              <h2>{l.howTitle}</h2>
            </div>
            <p>{l.howLead}</p>
          </div>
          <ol className="steps">
            <li>
              <span className="step-number">
                01 <span aria-hidden="true">↗</span>
              </span>
              <h3>{l.step1Title}</h3>
              <p>{l.step1Text}</p>
            </li>
            <li>
              <span className="step-number">
                02 <span aria-hidden="true">↗</span>
              </span>
              <h3>{l.step2Title}</h3>
              <p>{l.step2Text}</p>
            </li>
            <li>
              <span className="step-number">
                03 <span aria-hidden="true">✧</span>
              </span>
              <h3>{l.step3Title}</h3>
              <p>{l.step3Text}</p>
            </li>
          </ol>
          <div className="payout-note">
            <span className="payout-symbol" aria-hidden="true">
              ¥
            </span>
            <div>
              <h3>{l.payoutTitle}</h3>
              <p>{l.payoutText}</p>
            </div>
          </div>
        </section>

        <section className="rules-section" id="rules">
          <div>
            <p className="eyebrow">PARTNER GUIDELINES</p>
            <h2>{l.rulesTitle}</h2>
            <p>{l.rulesLead}</p>
          </div>
          <details>
            <summary>
              {l.rulesSummary}
              <span aria-hidden="true">＋</span>
            </summary>
            <ul>
              {l.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="label">{l.rulesAcceptance}</p>
          </details>
        </section>

        <section id="signup" className="signup-section">
          <div className="signup-intro">
            <p className="eyebrow">LET’S CONNECT</p>
            <h2>
              {l.signupTitle1}
              <br />
              {l.signupTitle2}
            </h2>
            <p>
              {l.signupLead.map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
            <div className="signup-free">
              <span>0</span>
              <div>
                {l.signupFreeUnit}
                <small>{l.signupFreeLabel}</small>
              </div>
            </div>
            <p className="signup-login">
              {l.signupLoggedIn}{" "}
              <a href={localePath(locale, "/login/")}>
                {l.signupLogin} <span aria-hidden="true">↗</span>
              </a>
            </p>
          </div>
          <div className="signup-form">
            <h3>{l.signupFormTitle}</h3>
            <p className="label">{l.signupFormNote}</p>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <form action="/api/signup/" method="post" className="stack">
              <input type="hidden" name="locale" value={locale} />
              <div className="form-grid">
                <label>
                  {l.fieldName} <span className="required">{l.required}</span>
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    placeholder={l.fieldNamePlaceholder}
                  />
                </label>
                <label>
                  {l.fieldCompany} <span className="optional">{l.optional}</span>
                  <input
                    name="company"
                    autoComplete="organization"
                    placeholder={l.fieldCompanyPlaceholder}
                  />
                </label>
              </div>
              <label>
                {l.fieldEmail} <span className="required">{l.required}</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                {l.fieldPhone} <span className="optional">{l.optional}</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder={l.fieldPhonePlaceholder}
                />
              </label>
              <div className="form-checks">
                <label className="check">
                  <input type="checkbox" name="is_professional" />{" "}
                  {l.checkProfessional}
                </label>
                <label className="check">
                  <input type="checkbox" name="terms" required />{" "}
                  <span>
                    <a href="#rules">{l.checkTerms1}</a>
                    {l.checkTerms2}{" "}
                    <span className="required">{l.required}</span>
                  </span>
                </label>
                <label className="check">
                  <input type="checkbox" name="marketing" defaultChecked />{" "}
                  {l.checkMarketing}
                </label>
              </div>
              <button type="submit" className="action-primary">
                {l.signupSubmit} <span aria-hidden="true">↗</span>
              </button>
            </form>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Link href={home} className="footer-brand">
          <Image
            src="/images/consilegy-logo.svg"
            alt="Consilegy"
            width={155}
            height={28}
            className="brand-logo"
          />
          <span>{l.footerTagline}</span>
        </Link>
        <p>© {new Date().getFullYear()} Consilegy</p>
        <span className="footer-links">
          <a href={t.common.privacyUrl} target="_blank" rel="noreferrer">
            {t.common.privacy} ↗
          </a>
          <a href="#rules">{l.footerRules}</a>
        </span>
      </footer>
    </div>
  );
}
