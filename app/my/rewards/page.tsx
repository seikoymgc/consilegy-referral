import { requirePartner } from "@/lib/auth";
import { listCommissions, listPayouts } from "@/lib/queries";
import { COMMISSION_STATUS_LABEL, KIND_LABEL, yen, ymd } from "@/lib/referrals";
import { Header, MyNav } from "@/components/Header";

export const instant = false;

export default async function MyRewards() {
  const p = await requirePartner();
  const [comms, payouts] = await Promise.all([listCommissions(p.id), listPayouts(p.id)]);
  const unpaid = comms.filter((c) => c.status === "confirmed").reduce((s, c) => s + c.amount, 0);
  const scheduled = payouts.filter((x) => x.status !== "paid").reduce((s, x) => s + x.amount, 0);
  const balance = unpaid - scheduled;
  const carry = Math.max(balance, 0);

  return (
    <>
      <Header partner={p} />
      <main>
        <MyNav current="/my/rewards/" />
        <h1>報酬・支払い</h1>

        <section className="card">
          <h2>繰り越しの状況</h2>
          <p>
            繰り越し中：<strong>{yen(carry)}</strong>
            （全製品の合計が5,000円以上になった月に、翌月末にまとめてお振込みします）
          </p>
          {balance < 0 && <p className="label">取り消された報酬 {yen(-balance)} は、次回以降の報酬と相殺します。</p>}
          {p.payout_method === "none" && <p className="label">「報酬を受け取らない」を選んでいるため、お支払いは作られません。</p>}
        </section>

        <section className="card">
          <h2>報酬明細</h2>
          {comms.length === 0 ? <p>まだ報酬はありません。</p> : (
            <div className="scroll">
              <table>
                <thead><tr><th>確定日</th><th>製品</th><th>紹介先</th><th>種類</th><th>額</th><th>状態</th></tr></thead>
                <tbody>
                  {comms.map((c) => (
                    <tr key={c.id}>
                      <td>{ymd(c.confirmed_at ?? c.created_at)}</td>
                      <td>{c.product_name}</td>
                      <td>{c.company_name}</td>
                      <td>{KIND_LABEL[c.kind] ?? c.kind}</td>
                      <td>{yen(c.amount)}</td>
                      <td>{COMMISSION_STATUS_LABEL[c.status] ?? c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>支払履歴</h2>
          {payouts.length === 0 ? <p>まだお支払いはありません。</p> : (
            <table>
              <thead><tr><th>対象月</th><th>支払日</th><th>額</th><th>状態</th><th>支払通知書</th></tr></thead>
              <tbody>
                {payouts.map((x) => (
                  <tr key={x.id}>
                    <td>{x.month.slice(0, 7)}</td>
                    <td>{ymd(x.paid_on)}</td>
                    <td>{yen(x.amount)}</td>
                    <td>{x.status === "paid" ? "振込済み" : "お支払い予定"}</td>
                    <td>{x.status === "paid" ? <a href={`/api/payouts/${x.id}/statement/`}>PDF</a> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
