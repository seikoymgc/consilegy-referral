import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { listProducts, listReferrals } from "@/lib/queries";
import { STATUS_LABEL, addBusinessDays, addMonths, yen, ymd } from "@/lib/referrals";
import { Header, MyNav, Notice } from "@/components/Header";

export const instant = false;

function nextDeadline(r: { status: string; created_at: string; accepted_at: string | null; confirmed_at: string | null; reward_period_end: string | null }) {
  if (r.status === "pending") return `受理の結果：${ymd(addBusinessDays(new Date(r.created_at), 3))}まで`;
  if (r.status === "accepted" && r.accepted_at) return `初回商談：${ymd(new Date(new Date(r.accepted_at).getTime() + 90 * 86400000))}まで`;
  if (r.status === "confirmed" && r.confirmed_at) return `有料契約：${ymd(addMonths(new Date(r.confirmed_at), 12))}まで`;
  if (r.status === "paying" && r.reward_period_end) return `報酬期間：${ymd(r.reward_period_end)}まで`;
  return "—";
}

export default async function MyReferrals({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; error?: string; saved?: string }>;
}) {
  const p = await requirePartner();
  const params = await searchParams;
  const [products, refs] = await Promise.all([listProducts(), listReferrals(p.id, params.product)]);
  const publicProducts = products.filter((x) => x.status === "public");

  return (
    <>
      <Header partner={p} />
      <main>
        <MyNav current="/my/referrals/" />
        <h1>紹介案件</h1>
        <Notice params={params} />

        <nav className="tabs">
          <Link href="/my/referrals/" aria-current={!params.product ? "page" : undefined}>すべて</Link>
          {products.map((x) => (
            <Link key={x.slug} href={`/my/referrals/?product=${x.slug}`} aria-current={params.product === x.slug ? "page" : undefined}>
              {x.name}
            </Link>
          ))}
        </nav>

        <section className="card">
          {refs.length === 0 ? (
            <p>まだ紹介案件がありません。</p>
          ) : (
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>製品</th><th>会社名</th><th>登録日</th><th>状況</th><th>次の期限</th><th>確定した報酬</th></tr>
                </thead>
                <tbody>
                  {refs.map((r) => (
                    <tr key={r.id}>
                      <td>{r.product.name}</td>
                      <td>{r.company_name}{r.channel === "link" && <span className="badge">リンク</span>}</td>
                      <td>{ymd(r.created_at)}</td>
                      <td>{STATUS_LABEL[r.status] ?? r.status}</td>
                      <td>{nextDeadline(r)}</td>
                      <td>{yen(r.reward_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card narrow">
          <h2>紹介先を登録</h2>
          <form action="/api/referrals/" method="post" className="stack">
            <label>
              製品
              <select name="product" required defaultValue={params.product ?? publicProducts[0]?.slug}>
                {publicProducts.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
              </select>
            </label>
            <label>会社名<input name="company_name" required /></label>
            <label>ご担当者のお名前<input name="contact_name" /></label>
            <label>役職<input name="contact_title" /></label>
            <label>連絡先（メールまたは電話）<input name="contact_info" /></label>
            <label>
              つなぎ方
              <select name="connection_method" defaultValue="introduce">
                <option value="introduce">私から紹介メールでつなぐ</option>
                <option value="contact_ok">Consilegyから連絡してよい（同意済み）</option>
                <option value="other">その他</option>
              </select>
            </label>
            <label>状況メモ<textarea name="note" rows={3} /></label>
            <label className="check"><input type="checkbox" name="consent" required /> 紹介先から、Consilegyに連絡先を伝える同意をもらっています</label>
            <button type="submit">登録する</button>
          </form>
          <p className="label">登録すると、3営業日以内に「受理／既存接点あり／対象外」をお知らせします。</p>
        </section>
      </main>
    </>
  );
}
