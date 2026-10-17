import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { currentPartner } from "@/lib/auth";
import { listProducts } from "@/lib/queries";
import { Header } from "@/components/Header";

export const instant = false;

// 紹介の決まり：consilegy-astro/src/pages/crm/referral/index.astro の原文（全製品共通にする）
const RULES = [
  "報酬の対象は、当社が受理した紹介だけです。紹介先のご担当者が、紹介してくださった方を通じた当社からの連絡に応じた時点で受理します。",
  "当社がすでに接点を持っている会社は、対象外です。確認の連絡の際にお知らせします。",
  "同じ会社を複数の方が紹介した場合は、先に受理した方の紹介とします。",
  "紹介先の役員・従業員とそのご家族は、報酬の対象外です。",
  "報酬を紹介先と分け合うこと、当社の了承なく値引きを約束することはできません。",
  "士業・コンサルタントなど、紹介先から報酬を受けて助言する立場の方は、紹介先に報酬があることをお伝えください。紹介キットに開示文のひな形があります。",
  "紹介してくださった方に、当社を代理して契約を結ぶ権限はありません。",
  "SNSやブログで紹介する場合は、「広告」「PR」など、報酬を受けていることが分かる表示を入れてください。",
  "紹介先の情報は、紹介先の同意を得てから登録してください。当社は、商談のご案内以外の目的に使いません。",
  "紹介先の契約が取り消された場合、取り消しに対応する報酬は、次回以降の報酬と相殺します。",
  "反社会的勢力との関係がないこと、紹介を通じて知った情報を外に出さないことを、お互いに約束します。",
];

// 同ページの「お約束」の原文
const PROMISES = [
  "製品の知識は要りません。",
  "営業やクロージングも要りません。",
  "紹介先の同意がない限り、こちらから連絡はしません。",
  "紹介先に無理な営業はしません。合わない会社には、合わないと正直に伝えます。",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; withdrawn?: string }>;
}) {
  await connection(); // 製品の一覧は毎回DBから読む
  const [{ error, withdrawn }, partner, products] = await Promise.all([
    searchParams,
    currentPartner(),
    listProducts(),
  ]);

  return (
    <>
      <Header partner={partner} />
      <main className="landing">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> CONSILEGY PARTNER PROGRAM
            </p>
            <h1>
              いいつながりが、
              <br />
              次の<span>きっかけ</span>に。
            </h1>
            <p className="hero-description">
              「この人に合いそう」を、一通の転送で。
              <br />
              あなたの紹介が、誰かの仕事を前に進めます。
              <br />
              そのきっかけに、私たちから報酬を。
            </p>
            <div className="actions">
              <a href="#signup" className="button">
                紹介パートナーになる <span aria-hidden="true">↗</span>
              </a>
              <a href="#how-it-works" className="text-link">
                しくみを見る <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="hero-note">
              登録・利用無料 <span>／</span> 製品の知識・営業経験は不要
            </p>
          </div>
          <div
            className="connection-art"
            role="img"
            aria-label="あなたの紹介が、知り合いとConsilegyをつなぐイメージ"
          >
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
                <small>きっかけを届ける</small>
                <strong>あなた</strong>
              </div>
              <span className="mini-star">✳</span>
            </div>
            <div className="intro-message">
              <span className="mail-icon">↗</span>
              <div>
                このサービス、
                <br />
                <strong>あなたに合いそう。</strong>
              </div>
            </div>
            <div className="person-card person-friend">
              <span className="avatar friend-avatar">↗</span>
              <div>
                <small>新しい可能性に出会う</small>
                <strong>お知り合い</strong>
              </div>
            </div>
            <div className="reward-chip">
              <span>✧</span> つながりが、報酬に。
            </div>
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">＋</span>
            <span className="art-bottom">GOOD CONNECTIONS GO A LONG WAY.</span>
          </div>
          {withdrawn && (
            <p className="alert ok">退会の手続きが完了しました。</p>
          )}
        </section>

        <div className="benefit-strip">
          <p>
            <span>01</span> 登録・利用料 <strong>0円</strong>
          </p>
          <p>
            <span>02</span> 営業・クロージング <strong>不要</strong>
          </p>
          <p>
            <span>03</span> 紹介後の対応は <strong>Consilegyにおまかせ</strong>
          </p>
        </div>

        <section id="products" className="landing-section products-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OUR PRODUCTS</p>
              <h2>あの人に、合いそうなものを。</h2>
            </div>
            <p>
              仕事の困りごとを解決する、Consilegyの製品。
              <br />
              身近な方の顔を思い浮かべながら、ご覧ください。
            </p>
          </div>
          <div className="product-grid">
            {products.map((p, i) => (
              <article
                key={p.id}
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
                    {p.status === "public" ? "紹介受付中" : "COMING SOON"}
                  </span>
                </div>
                <h3>{p.name}</h3>
                <p className="product-description">
                  {p.fit_summary ||
                    (p.status === "preparing"
                      ? "新しい製品を準備しています。公開まで、もうしばらくお待ちください。"
                      : "製品の紹介キットや詳しい情報は、登録後のマイページでご覧いただけます。")}
                </p>
                {p.status === "public" && p.rules.length > 0 && (
                  <div className="reward-info">
                    <p className="eyebrow">紹介パートナーへの報酬</p>
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
                    href={partner ? "/my/products/" : "#signup"}
                  >
                    この製品を紹介する <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <p className="coming-soon">
                    もうすぐ、つながりの選択肢が増えます。
                  </p>
                )}
              </article>
            ))}
            {products.length === 0 && (
              <p className="card">現在、紹介できる製品を準備しています。</p>
            )}
          </div>
        </section>

        <section className="promise-section">
          <div>
            <p className="eyebrow">OUR PROMISE</p>
            <h2>
              あなたがするのは、
              <br />
              つなぐだけ。
            </h2>
            <p>大切なつながりを、私たちも大切にします。</p>
            <span className="promise-flower" aria-hidden="true">
              ✳
            </span>
          </div>
          <ul>
            {PROMISES.map((t, i) => (
              <li key={t}>
                <span>0{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HOW IT WORKS</p>
              <h2>小さな紹介から、はじまります。</h2>
            </div>
            <p>登録から報酬の受け取りまで、3ステップ。</p>
          </div>
          <ol className="steps">
            <li>
              <span className="step-number">
                01 <span aria-hidden="true">↗</span>
              </span>
              <h3>パートナーに登録する</h3>
              <p>
                申込後、メールでログインリンクをお届け。そのままマイページを使えます。
              </p>
            </li>
            <li>
              <span className="step-number">
                02 <span aria-hidden="true">↗</span>
              </span>
              <h3>合いそうな人に紹介する</h3>
              <p>
                紹介リンクを送るか、同意を得た紹介先を登録。ご案内や商談は私たちが担当します。
              </p>
            </li>
            <li>
              <span className="step-number">
                03 <span aria-hidden="true">✧</span>
              </span>
              <h3>報酬を受け取る</h3>
              <p>
                紹介先が有料で契約すると、入金ごとに報酬が確定。銀行振込でお支払いします。
              </p>
            </li>
          </ol>
          <div className="payout-note">
            <span className="payout-symbol" aria-hidden="true">
              ¥
            </span>
            <div>
              <h3>報酬は、毎月まとめてお届け。</h3>
              <p>
                全製品の合計が5,000円以上の月にお支払い（月末締め・翌月末払い）。5,000円未満は翌月以降に繰り越します。振込手数料は当社負担。報酬条件は製品ごとに異なります。
              </p>
            </div>
          </div>
        </section>

        <section className="rules-section" id="rules">
          <div>
            <p className="eyebrow">PARTNER GUIDELINES</p>
            <h2>気持ちよく、つながるために。</h2>
            <p>申し込みの前に、紹介の決まりをご確認ください。</p>
          </div>
          <details>
            <summary>
              紹介の決まり（全製品共通）<span aria-hidden="true">＋</span>
            </summary>
            <ul>
              {RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="label">
              紹介の受理：リンク経由の申込は3営業日、フォームで登録された紹介も3営業日以内に結果をお知らせします。受理から90日以内に初回の商談（または無料期間の開始）があると紹介者が確定し、その後12か月以内の有料契約が報酬の対象です。
            </p>
          </details>
        </section>

        <section id="signup" className="signup-section">
          <div className="signup-intro">
            <p className="eyebrow">LET’S CONNECT</p>
            <h2>
              あなたのつながりに、
              <br />
              新しい可能性を。
            </h2>
            <p>
              まずは、紹介パートナーへの登録から。
              <br />
              「あの人に合いそう」と思ったときに、
              <br />
              いつでも紹介をはじめられます。
            </p>
            <div className="signup-free">
              <span>0</span>
              <div>
                円<small>登録料・利用料</small>
              </div>
            </div>
            <p className="signup-login">
              登録済みの方は{" "}
              <a href="/login/">
                ログイン <span aria-hidden="true">↗</span>
              </a>
            </p>
          </div>
          <div className="signup-form">
            <h3>紹介パートナーに申し込む</h3>
            <p className="label">メールでログインリンクをお送りします。</p>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <form action="/api/signup/" method="post" className="stack">
              <div className="form-grid">
                <label>
                  お名前 <span className="required">必須</span>
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="山田 太郎"
                  />
                </label>
                <label>
                  会社名・屋号 <span className="optional">任意</span>
                  <input
                    name="company"
                    autoComplete="organization"
                    placeholder="株式会社〇〇"
                  />
                </label>
              </div>
              <label>
                メールアドレス <span className="required">必須</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                電話番号 <span className="optional">任意</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="090-1234-5678"
                />
              </label>
              <div className="form-checks">
                <label className="check">
                  <input type="checkbox" name="is_professional" />{" "}
                  弁護士・税理士などの士業です
                </label>
                <label className="check">
                  <input type="checkbox" name="terms" required />{" "}
                  <span>
                    <a href="#rules">紹介の決まり</a>に同意します{" "}
                    <span className="required">必須</span>
                  </span>
                </label>
                <label className="check">
                  <input type="checkbox" name="marketing" />{" "}
                  お知らせメールを受け取る
                </label>
              </div>
              <button type="submit">
                無料でパートナーに申し込む <span aria-hidden="true">↗</span>
              </button>
            </form>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Link href="/" className="footer-brand">
          <Image src="/images/consilegy-logo.svg" alt="Consilegy" width={155} height={28} className="brand-logo" />
          <span>いいつながりから、次の一歩を。</span>
        </Link>
        <p>© {new Date().getFullYear()} Consilegy</p>
        <a href="#rules">紹介の決まり ↗</a>
      </footer>
    </>
  );
}
