import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { getKit, listProducts } from "@/lib/queries";
import { Header, MyNav } from "@/components/Header";

export const instant = false;

const DISCLOSURE =
  "※この紹介は、Consilegyの紹介パートナーとして行っています（紹介が成約した場合、私に紹介報酬が支払われます）。";

export default async function MyProducts({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const p = await requirePartner();
  const [{ product }, products] = await Promise.all([searchParams, listProducts()]);
  const selected = product ?? products.find((x) => x.status === "public")?.slug;
  const kit = selected ? await getKit(p.referral_code, selected) : null;

  return (
    <>
      <Header partner={p} />
      <main>
        <MyNav current="/my/products/" />
        <h1>紹介する</h1>

        <nav className="tabs">
          {products.map((x) =>
            x.status === "public" ? (
              <Link key={x.slug} href={`/my/products/?product=${x.slug}`} aria-current={x.slug === selected ? "page" : undefined}>
                {x.name}
              </Link>
            ) : (
              <span key={x.slug} className="muted">{x.name}（準備中）</span>
            ),
          )}
        </nav>

        {!kit ? (
          <p className="alert error">この製品は今は紹介できません。</p>
        ) : (
          <>
            <section className="card">
              <h2>あなたの紹介リンク</h2>
              <p><code className="copy">{kit.link}</code></p>
              <p className="label">このリンクから申し込まれると、30日間あなたの紹介として記録されます。</p>
            </section>

            {kit.tagline && <section className="card"><h2>一言紹介文</h2><p className="pre">{kit.tagline}</p></section>}
            {kit.forward_message && (
              <section className="card">
                <h2>転送用メッセージ</h2>
                <p className="pre">{kit.forward_message}</p>
              </section>
            )}
            {kit.fit && <section className="card"><h2>合う会社</h2><p className="pre">{kit.fit}</p></section>}
            {(kit.materials.length > 0 || kit.screens.length > 0) && (
              <section className="card">
                <h2>資料・画面</h2>
                <ul>
                  {[...kit.materials, ...kit.screens].map((m) => (
                    <li key={m.url}><a href={m.url} target="_blank" rel="noreferrer">{m.title}</a></li>
                  ))}
                </ul>
              </section>
            )}
            {kit.faq.length > 0 && (
              <section className="card">
                <h2>質問への答え方</h2>
                <dl>{kit.faq.map((f) => (<div key={f.q}><dt>{f.q}</dt><dd>{f.a}</dd></div>))}</dl>
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
