import { requirePartner } from "@/lib/auth";
import { listCommissions, listPayouts } from "@/lib/queries";
import { COMMISSION_STATUS_LABEL, KIND_LABEL, yen, ymd } from "@/lib/referrals";
import {
  EmptyState,
  PartnerShell,
  StatusBadge,
} from "@/components/PartnerShell";

export const instant = false;

export default async function MyRewards() {
  const p = await requirePartner();
  const [comms, payouts] = await Promise.all([
    listCommissions(p.id),
    listPayouts(p.id),
  ]);
  const unpaid = comms
    .filter((c) => c.status === "confirmed")
    .reduce((s, c) => s + c.amount, 0);
  const scheduled = payouts
    .filter((x) => x.status !== "paid")
    .reduce((s, x) => s + x.amount, 0);
  const balance = unpaid - scheduled;
  const carry = Math.max(balance, 0);
  const total = comms
    .filter((c) => ["confirmed", "paid"].includes(c.status))
    .reduce((s, c) => s + c.amount, 0);
  return (
    <PartnerShell
      partner={p}
      current="/my/rewards/"
      title="報酬・支払い"
      description="つながりから生まれた報酬と、お支払いの履歴を確認できます。"
    >
      <section className="reward-summary" aria-label="報酬の概要">
        <div className="reward-summary-primary">
          <p>累計の確定報酬</p>
          <strong>{yen(total)}</strong>
          <span>お支払い済みの報酬を含みます</span>
        </div>
        <div>
          <p>繰り越し中</p>
          <strong>{yen(carry)}</strong>
          <span>次回以降のお支払い対象</span>
        </div>
        <div>
          <p>支払予定の合計</p>
          <strong>{yen(scheduled)}</strong>
          <span>お支払い予定として計上済み</span>
        </div>
      </section>
      <div className="payment-guide">
        <span aria-hidden="true">¥</span>
        <div>
          <strong>合計5,000円以上の月に、まとめてお振込み。</strong>
          <p>
            月末締め・翌月末払い。5,000円未満の場合は翌月以降に繰り越します。
          </p>
          {balance < 0 && (
            <p>
              取り消された報酬 {yen(-balance)} は、次回以降の報酬と相殺します。
            </p>
          )}
          {p.payout_method === "none" && (
            <p>
              「報酬を受け取らない」を選んでいるため、お支払いは作られません。
            </p>
          )}
        </div>
      </div>
      <section className="card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REWARD DETAILS</p>
            <h2>報酬明細</h2>
          </div>
          <span className="record-count">{comms.length}件</span>
        </div>
        {comms.length === 0 ? (
          <EmptyState
            title="報酬の記録は、これから。"
            description="紹介先の有料契約と入金が確認されると、報酬の明細がここに表示されます。"
          />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>確定日</th>
                  <th>製品</th>
                  <th>紹介先</th>
                  <th>種類</th>
                  <th>金額</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {comms.map((c) => (
                  <tr key={c.id}>
                    <td className="date-cell">
                      {ymd(c.confirmed_at ?? c.created_at)}
                    </td>
                    <td>{c.product_name}</td>
                    <td>{c.company_name}</td>
                    <td>{KIND_LABEL[c.kind] ?? c.kind}</td>
                    <td className="amount-cell">{yen(c.amount)}</td>
                    <td>
                      <StatusBadge status={c.status}>
                        {COMMISSION_STATUS_LABEL[c.status] ?? c.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PAYMENT HISTORY</p>
            <h2>支払履歴</h2>
          </div>
          <span className="record-count">{payouts.length}件</span>
        </div>
        {payouts.length === 0 ? (
          <EmptyState
            title="お支払いの履歴はありません。"
            description="お支払いの状況と、振込後の支払通知書をここで確認できます。"
          />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>対象月</th>
                  <th>支払日</th>
                  <th>金額</th>
                  <th>状態</th>
                  <th>支払通知書</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((x) => (
                  <tr key={x.id}>
                    <td className="date-cell">{x.month.slice(0, 7)}</td>
                    <td className="date-cell">{ymd(x.paid_on)}</td>
                    <td className="amount-cell">{yen(x.amount)}</td>
                    <td>
                      <StatusBadge status={x.status}>
                        {x.status === "paid" ? "振込済み" : "お支払い予定"}
                      </StatusBadge>
                    </td>
                    <td>
                      {x.status === "paid" ? (
                        <a
                          className="statement-link"
                          href={`/api/payouts/${x.id}/statement/`}
                        >
                          通知書 PDF ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PartnerShell>
  );
}
