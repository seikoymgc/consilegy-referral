import {
  PartnerShell,
  EmptyState,
  StatusBadge,
} from "@/components/PartnerShell";
import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { listProducts, listReferrals } from "@/lib/queries";
import {
  CONNECTION_LABEL,
  STATUS_LABEL,
  addBusinessDays,
  addMonths,
  yen,
  ymd,
} from "@/lib/referrals";
import { Notice } from "@/components/Header";

export const instant = false;

function nextDeadline(r: {
  status: string;
  created_at: string;
  accepted_at: string | null;
  confirmed_at: string | null;
  reward_period_end: string | null;
}) {
  if (r.status === "pending")
    return `受理の結果：${ymd(addBusinessDays(new Date(r.created_at), 3))}まで`;
  if (r.status === "accepted" && r.accepted_at)
    return `初回商談：${ymd(new Date(new Date(r.accepted_at).getTime() + 90 * 86400000))}まで`;
  if (r.status === "confirmed" && r.confirmed_at)
    return `有料契約：${ymd(addMonths(new Date(r.confirmed_at), 12))}まで`;
  if (r.status === "paying" && r.reward_period_end)
    return `報酬期間：${ymd(r.reward_period_end)}まで`;
  return "—";
}

export default async function MyReferrals({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; error?: string; saved?: string }>;
}) {
  const p = await requirePartner();
  const params = await searchParams;
  const [products, refs] = await Promise.all([
    listProducts(),
    listReferrals(p.id, params.product),
  ]);
  const publicProducts = products.filter((x) => x.status === "public");

  return (
    <PartnerShell
      partner={p}
      current="/my/referrals/"
      title="紹介案件"
      description="紹介先の状況と次の期限を、ひと目で確認できます。"
      action={
        <Link href="#new-referral" className="button action-primary">
          紹介先を登録する <span aria-hidden="true">＋</span>
        </Link>
      }
    >
      <Notice params={params} />

      <nav className="tabs">
        <Link
          href="/my/referrals/"
          aria-current={!params.product ? "page" : undefined}
        >
          すべて
        </Link>
        {products.map((x) => (
          <Link
            key={x.slug}
            href={`/my/referrals/?product=${x.slug}`}
            aria-current={params.product === x.slug ? "page" : undefined}
          >
            {x.name}
          </Link>
        ))}
      </nav>

      <section className="card referral-list-panel">
        <div className="panel-heading">
          <h2>紹介した案件</h2>
          <span className="record-count">{refs.length}件</span>
        </div>
        {refs.length === 0 ? (
          <EmptyState
            title="最初の紹介を、ここから。"
            description="紹介先を登録すると、進捗や報酬がこの一覧に表示されます。"
            action={
              <Link href="/my/products/" className="button secondary">
                紹介キットを見る ↗
              </Link>
            }
          />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>製品</th>
                  <th>会社名</th>
                  <th>登録日</th>
                  <th>状況</th>
                  <th>次の期限</th>
                  <th>確定した報酬</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.product.name}</td>
                    <td>
                      {r.company_name}
                      {r.channel === "link" && (
                        <span className="badge">リンク</span>
                      )}
                    </td>
                    <td>{ymd(r.created_at)}</td>
                    <td>
                      <StatusBadge status={r.status}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </StatusBadge>
                    </td>
                    <td>{nextDeadline(r)}</td>
                    <td className="amount-cell">{yen(r.reward_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="new-referral" className="card new-referral-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW CONNECTION</p>
            <h2>紹介先を登録</h2>
          </div>
          <span className="panel-mark" aria-hidden="true">
            ＋
          </span>
        </div>
        <p className="panel-description">
          紹介先の同意を得てから、分かる範囲でご入力ください。
        </p>
        <form
          action="/api/referrals/"
          method="post"
          className="stack referral-form"
        >
          <label>
            製品
            <select
              name="product"
              required
              defaultValue={params.product ?? publicProducts[0]?.slug}
            >
              {publicProducts.map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            会社名
            <input name="company_name" required />
          </label>
          <label>
            ご担当者のお名前
            <input name="contact_name" />
          </label>
          <label>
            役職
            <input name="contact_title" />
          </label>
          <label>
            連絡先（メールアドレスまたは電話番号）
            <input name="contact_info" />
            <span className="label">
              「山口から直接連絡」を選ぶ場合だけ必要です。それ以外は空欄で構いません。
            </span>
          </label>
          <label>
            つなぎ方
            <select name="connection_method" defaultValue="introduce">
              {Object.entries(CONNECTION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            状況メモ
            <textarea name="note" rows={3} />
          </label>
          <label className="check">
            <input type="checkbox" name="consent" required />{" "}
            紹介先から、Consilegyに連絡先を伝える同意をもらっています
          </label>
          <button type="submit" className="action-primary">登録する</button>
        </form>
        <p className="label">
          登録すると、3営業日以内に「受理／既存接点あり／対象外」をお知らせします。
        </p>
      </section>
    </PartnerShell>
  );
}
