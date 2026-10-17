import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONNECTION_LABEL, STATUS_LABEL, addBusinessDays, ymd } from "@/lib/referrals";
import { AdminNav, Header, Notice } from "@/components/Header";

export const instant = false;

function domainOf(s: string | null | undefined): string | null {
  const m = (s ?? "").toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})/);
  return m ? m[1] : null;
}

export default async function AdminReferrals({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; status?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  let q = db().from("referrals")
    .select("id, company_name, contact_name, contact_title, contact_info, note, connection_method, channel, status, created_at, accepted_at, product_contract_id, has_in_product_referral, partners(name, company, email), products(name)")
    .eq("operator_id", admin.operator_id)
    .order("created_at", { ascending: false });
  if (params.status) q = q.eq("status", params.status);
  const { data: refs } = await q;

  const { data: heldEvents } = await db().from("product_events")
    .select("id, product_contract_id, amount_excl_tax, charge_type, occurred_at, products(name)")
    .eq("operator_id", admin.operator_id).eq("result", "held").eq("kind", "payment")
    .order("occurred_at", { ascending: false });

  return (
    <>
      <Header partner={admin} />
      <main>
        <AdminNav current="/admin/referrals/" />
        <h1>紹介案件</h1>
        <Notice params={params} />

        <nav className="tabs">
          <a href="/admin/referrals/" aria-current={!params.status ? "page" : undefined}>すべて</a>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <a key={k} href={`/admin/referrals/?status=${k}`} aria-current={params.status === k ? "page" : undefined}>{v}</a>
          ))}
        </nav>

        {(refs ?? []).map((r) => {
          const partner = r.partners as unknown as { name: string; company: string | null; email: string };
          const product = (r.products as unknown as { name: string })?.name;
          const sameDomain = domainOf(partner?.email) && domainOf(partner?.email) === domainOf(r.contact_info);
          const sameCompany = partner?.company && partner.company === r.company_name;
          return (
            <section key={r.id} className="card">
              <h2>
                {r.company_name} <span className="badge">{product}</span>
                <span className="badge">{STATUS_LABEL[r.status]}</span>
                {r.channel === "link" && <span className="badge">リンク経由</span>}
              </h2>
              {(sameDomain || sameCompany) && (
                <p className="alert error">紹介者と紹介先のメールのドメインまたは会社名が同じです（自分の会社の紹介の可能性）。</p>
              )}
              <p>
                紹介者：{partner?.name}（{partner?.email}）<br />
                担当者：{r.contact_name ?? "—"} {r.contact_title ?? ""} / 連絡先：{r.contact_info ?? "—"}<br />
                つなぎ方：{CONNECTION_LABEL[r.connection_method ?? ""] ?? r.connection_method ?? "—"} / 登録日：{ymd(r.created_at)}
                {r.status === "pending" && <> / <strong>受理の期限：{ymd(addBusinessDays(new Date(r.created_at), 3))}</strong>{r.channel === "link" && "（過ぎると自動で受理）"}</>}
                <br />
                契約ID：{r.product_contract_id ?? "未紐づけ"}{r.has_in_product_referral && "（製品内の紹介あり）"}
              </p>
              {r.note && <p className="pre">{r.note}</p>}

              <div className="row">
                {[
                  ["accept", "受理"],
                  ["confirm", "紹介者確定"],
                  ["existing_contact", "既存接点あり"],
                  ["out_of_scope", "対象外"],
                  ["cancelled", "解約"],
                ].map(([action, label]) => (
                  <form key={action} action="/api/admin/referrals/" method="post">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="action" value={action} />
                    <button type="submit" className="small">{label}</button>
                  </form>
                ))}
              </div>

              <details>
                <summary>契約IDの紐づけ・導入支援の入金の手入力</summary>
                <form action="/api/admin/referrals/" method="post" className="row">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="action" value="link_contract" />
                  <input name="contract_id" placeholder="製品側の契約ID" defaultValue={r.product_contract_id ?? ""} />
                  <button type="submit" className="small">紐づける</button>
                </form>
                <form action="/api/admin/referrals/" method="post" className="row">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="action" value="manual_service_payment" />
                  <input name="amount_excl_tax" type="number" placeholder="税抜の支払額（円）" />
                  <input name="paid_on" type="date" />
                  <button type="submit" className="small">導入支援の入金を登録</button>
                </form>
              </details>
            </section>
          );
        })}

        <section className="card">
          <h2>保留中の入金通知</h2>
          {(heldEvents ?? []).length === 0 ? <p>ありません。</p> : (
            <table>
              <thead><tr><th>製品</th><th>契約ID</th><th>種類</th><th>税抜額</th><th>日付</th></tr></thead>
              <tbody>
                {(heldEvents ?? []).map((e) => (
                  <tr key={e.id}>
                    <td>{(e.products as unknown as { name: string })?.name}</td>
                    <td>{e.product_contract_id}</td>
                    <td>{e.charge_type === "service" ? "導入支援" : "月額"}</td>
                    <td>{e.amount_excl_tax?.toLocaleString("ja-JP")}円</td>
                    <td>{ymd(e.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="label">紹介案件が見つからない入金と、受理前の入金がここに並びます。受理や契約IDの紐づけをすると計算し直します。</p>
        </section>
      </main>
    </>
  );
}
