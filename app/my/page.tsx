import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { getSummary } from "@/lib/queries";
import { yen, ymd } from "@/lib/referrals";
import { Header, MyNav } from "@/components/Header";

export const instant = false;

export default async function MyHome() {
  const p = await requirePartner();
  const s = await getSummary(p.id);

  const todos: string[] = [];
  if (p.payout_method === "bank" && !p.bank_last4 && s.confirmedTotal > 0) {
    todos.push("報酬の振込先を登録してください（登録情報）");
  }
  if (s.referralCount === 0) todos.push("「紹介する」から紹介リンクを取り出して、知り合いの会社に送ってみましょう");

  return (
    <>
      <Header partner={p} />
      <main>
        <MyNav current="/my/" />
        <h1>{p.name} さん</h1>

        <section className="grid">
          <Stat label="紹介件数" value={String(s.referralCount)} />
          <Stat label="商談中" value={String(s.inProgress)} />
          <Stat label="有料契約中" value={String(s.paying)} />
          <Stat label="確定した報酬" value={yen(s.confirmedTotal)} />
          <Stat label="繰り越し中" value={yen(s.carryOver)} />
          <Stat
            label="次回の支払予定"
            value={s.nextPayout ? `${yen(s.nextPayout.amount)}（${s.nextPayout.month.slice(0, 7)}分）` : "—"}
          />
        </section>

        {todos.length > 0 && (
          <section className="card">
            <h2>やること</h2>
            <ul>{todos.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        )}

        <section className="card">
          <h2>製品ごとの内訳</h2>
          {s.byProduct.length === 0 ? (
            <p>まだ紹介がありません。<Link href="/my/products/">紹介する</Link></p>
          ) : (
            <table>
              <thead><tr><th>製品</th><th>紹介件数</th><th>確定した報酬</th></tr></thead>
              <tbody>
                {s.byProduct.map((b) => (
                  <tr key={b.slug}><td>{b.name}</td><td>{b.count}</td><td>{yen(b.reward)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p className="label">最終更新：{ymd(new Date())}</p>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}
