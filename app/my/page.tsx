import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { getSummary } from "@/lib/queries";
import { yen, ymd } from "@/lib/referrals";
import { EmptyState, PartnerShell } from "@/components/PartnerShell";

export const instant = false;

export default async function MyHome() {
  const p = await requirePartner();
  const s = await getSummary(p.id);
  const needsBank =
    p.payout_method === "bank" && !p.bank_last4 && s.confirmedTotal > 0;
  return (
    <PartnerShell
      partner={p}
      current="/my/"
      title={`${p.name} さん、こんにちは。`}
      description="紹介の状況と、つながりから生まれた成果を確認できます。"
      action={
        <Link href="/my/products/" className="button action-primary primary-referral-button">
          製品を紹介する <span aria-hidden="true">↗</span>
        </Link>
      }
    >
      <section className="dashboard-overview" aria-label="報酬の概要">
        <div className="earnings-card">
          <p className="eyebrow">YOUR CONNECTIONS, YOUR REWARDS</p>
          <p className="metric-label">累計の確定報酬</p>
          <p className="earnings-value">{yen(s.confirmedTotal)}</p>
          <div className="earnings-bottom">
            <span>
              繰り越し中 <strong>{yen(s.carryOver)}</strong>
            </span>
            <Link href="/my/rewards/">報酬の内訳を見る ↗</Link>
          </div>
        </div>
        <div className="next-payment-card">
          <p className="eyebrow">NEXT PAYMENT</p>
          <h2>次回のお支払い</h2>
          <p className="payment-amount">
            {s.nextPayout ? yen(s.nextPayout.amount) : "予定はありません"}
          </p>
          <p>
            {s.nextPayout
              ? `${s.nextPayout.month.slice(0, 7)} 分のお支払いを予定しています。`
              : "確定した報酬が合計5,000円以上の月に、翌月末のお支払いを予定します。"}
          </p>
          <Link href="/my/settings/">振込先を確認する ↗</Link>
        </div>
      </section>
      <section className="workspace-metrics" aria-label="紹介の状況">
        <Stat label="紹介した件数" value={s.referralCount} unit="件" />
        <Stat label="商談中" value={s.inProgress} unit="件" />
        <Stat label="有料契約中" value={s.paying} unit="件" />
      </section>
      {needsBank && (
        <div className="workspace-callout">
          <div>
            <strong>報酬を受け取る準備をしましょう</strong>
            <p>
              確定した報酬があります。お支払いに向けて振込先を登録してください。
            </p>
          </div>
          <Link href="/my/settings/#bank" className="button">
            振込先を登録する ↗
          </Link>
        </div>
      )}
      <div className="dashboard-columns">
        <section className="card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEXT STEP</p>
              <h2>次の一歩</h2>
            </div>
            <span className="panel-mark" aria-hidden="true">
              ↗
            </span>
          </div>
          <div className="next-actions">
            <Link href="/my/products/">
              <span className="action-number">01</span>
              <div>
                <strong>
                  {s.referralCount === 0
                    ? "はじめての紹介を送ってみる"
                    : "次の紹介先に、合いそうな製品を探す"}
                </strong>
                <p>
                  4つのエディションから選んで、紹介文やリンクを取り出せます。
                </p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/my/referrals/">
              <span className="action-number">02</span>
              <div>
                <strong>紹介案件の進み具合を確認する</strong>
                <p>受理から商談、契約までの状況を確認できます。</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section className="card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">BY PRODUCT</p>
              <h2>製品ごとの内訳</h2>
            </div>
          </div>
          {s.byProduct.length === 0 ? (
            <EmptyState
              title="最初のつながりを、ここから。"
              description="紹介した案件と確定した報酬が、ここに表示されます。"
              action={
                <Link href="/my/products/" className="text-link">
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
                    <th>紹介件数</th>
                    <th>確定報酬</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byProduct.map((b) => (
                    <tr key={b.slug}>
                      <td>{b.name}</td>
                      <td>{b.count}件</td>
                      <td className="amount-cell">{yen(b.reward)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <p className="workspace-updated">最終更新：{ymd(new Date())}</p>
    </PartnerShell>
  );
}
function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="workspace-stat">
      <p>{label}</p>
      <strong>
        {value}
        <span>{unit}</span>
      </strong>
    </div>
  );
}
