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
    searchParams, currentPartner(), listProducts(),
  ]);

  return (
    <>
      <Header partner={partner} />
      <main>
        <section className="hero">
          <h1>「あの会社に、教えたい」</h1>
          <p>Consilegyの製品を紹介すると、報酬が受け取れます。あなたの作業は、紹介文の転送だけです。</p>
          <p className="actions">
            <a href="#signup" className="button">紹介パートナーになる</a>
            <a href="/login/" className="button secondary">ログイン</a>
          </p>
          {withdrawn && <p className="alert ok">退会の手続きが完了しました。</p>}
        </section>

        <section>
          <h2>紹介できる製品</h2>
          <div className="grid">
            {products.map((p) => (
              <div key={p.id} className="card">
                <h3>{p.name}{p.status === "preparing" && <span className="badge">準備中</span>}</h3>
                {p.fit_summary && <p>{p.fit_summary}</p>}
                {p.status === "public" && p.rules.length > 0 && (
                  <>
                    <p className="label">報酬の条件</p>
                    <ul>{p.rules.map((r) => <li key={r.kind}>{r.label}</li>)}</ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>あなたがするのは、つなぐだけ</h2>
          <ul>{PROMISES.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>

        <section className="card">
          <h2>報酬のしくみ</h2>
          <p>条件は製品ごとです。全製品の合計が5,000円以上になった月に、まとめて銀行振込でお支払いします（月末締め・翌月末払い、振込手数料は当社負担）。5,000円に満たない月は翌月以降に繰り越します。登録料・利用料はかかりません。</p>
        </section>

        <section className="card">
          <h2>登録から報酬まで3ステップ</h2>
          <ol>
            <li>申込：申込と同時にログインリンクが届き、そのままマイページへ。</li>
            <li>紹介：マイページの紹介リンクを送るか、紹介先を登録します。</li>
            <li>報酬：紹介先が有料で契約すると、入金ごとに報酬が確定します。</li>
          </ol>
        </section>

        <section className="card">
          <h2>紹介の決まり（全製品共通）</h2>
          <ul>{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="label">紹介の受理：リンク経由の申込は3営業日、フォームで登録された紹介も3営業日以内に結果をお知らせします。受理から90日以内に初回の商談（または無料期間の開始）があると紹介者が確定し、その後12か月以内の有料契約が報酬の対象です。</p>
        </section>

        <section id="signup" className="card narrow">
          <h2>紹介パートナーに申し込む</h2>
          {error && <p className="alert error">{error}</p>}
          <form action="/api/signup/" method="post" className="stack">
            <label>お名前<input name="name" required autoComplete="name" /></label>
            <label>会社名・屋号（任意）<input name="company" autoComplete="organization" /></label>
            <label>メールアドレス<input name="email" type="email" required autoComplete="email" /></label>
            <label>電話番号（任意）<input name="phone" type="tel" autoComplete="tel" /></label>
            <label className="check"><input type="checkbox" name="is_professional" /> 弁護士・税理士などの士業です</label>
            <label className="check"><input type="checkbox" name="terms" required /> 紹介の決まりに同意します</label>
            <label className="check"><input type="checkbox" name="marketing" defaultChecked /> お知らせメールを受け取る</label>
            <button type="submit">申し込む（ログインリンクが届きます）</button>
          </form>
        </section>
      </main>
    </>
  );
}
