import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { getKit, listProducts } from "@/lib/queries";
import { Header, MyNav } from "@/components/Header";
import {
  productOffers,
  productKitPath,
  revenueEdition,
} from "@/lib/product-editions";

export const instant = false;

const DISCLOSURE =
  "なお、私はConsilegy合同会社の紹介パートナー制度に登録しており、ご契約に至った場合は同社から紹介料を受け取ります。ご判断の材料としてお伝えしておきます。";

export default async function MyProducts({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; edition?: string }>;
}) {
  const p = await requirePartner();
  const [{ product, edition }, products] = await Promise.all([
    searchParams,
    listProducts(),
  ]);
  const selected = product ?? products.find((x) => x.status === "public")?.slug;
  const kit = selected
    ? await getKit(p.referral_code, selected, edition)
    : null;

  return (
    <>
      <Header partner={p} />
      <main>
        <MyNav current="/my/products/" />
        <h1>紹介する</h1>

        <nav className="tabs">
          {productOffers(products).map((x) =>
            x.status === "public" ? (
              <Link
                key={x.key}
                href={productKitPath(x.slug, x.edition)}
                aria-current={
                  x.slug === selected &&
                  (!x.edition || x.edition === revenueEdition(edition))
                    ? "page"
                    : undefined
                }
              >
                {x.name}
              </Link>
            ) : (
              <span key={x.key} className="muted">
                {x.name}（準備中）
              </span>
            ),
          )}
        </nav>

        {!kit ? (
          <p className="alert error">この製品は今は紹介できません。</p>
        ) : (
          <>
            <h2>{kit.product.name}</h2>
            <section className="card">
              <h2>あなたの紹介リンク</h2>
              <p>
                <code className="copy">{kit.link}</code>
              </p>
              <p className="label">
                このリンクから申し込まれると、30日間あなたの紹介として記録されます。
              </p>
            </section>

            {kit.tagline && (
              <section className="card">
                <h2>一言紹介文</h2>
                <p className="pre">{kit.tagline}</p>
              </section>
            )}
            {kit.forward_message && (
              <section className="card">
                <h2>転送用メッセージ</h2>
                <p className="pre">{kit.forward_message}</p>
              </section>
            )}
            {kit.fit && (
              <section className="card">
                <h2>
                  {kit.edition === "b2c" ? "合う教室・スクール" : "合う会社"}
                </h2>
                <p className="pre">{kit.fit}</p>
              </section>
            )}
            {kit.pricing && (
              <section className="card">
                <h2>料金の要点</h2>
                <p className="pre">{kit.pricing}</p>
              </section>
            )}
            {(kit.materials.length > 0 || kit.screens.length > 0) && (
              <section className="card">
                <h2>資料・画面</h2>
                <ul>
                  {[...kit.materials, ...kit.screens].map((m) => (
                    <li key={m.url}>
                      <a href={m.url} target="_blank" rel="noreferrer">
                        {m.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {kit.faq.length > 0 && (
              <section className="card">
                <h2>質問への答え方</h2>
                <dl>
                  {kit.faq.map((f) => (
                    <div key={f.q}>
                      <dt>{f.q}</dt>
                      <dd>{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <section className="card">
              <h2>開示文のひな形（全製品共通）</h2>
              <p className="pre">{DISCLOSURE}</p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
