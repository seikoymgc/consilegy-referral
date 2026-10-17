import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { yen, ymd } from "@/lib/referrals";
import { AdminNav, Header, Notice } from "@/components/Header";
import type { TransferSettings } from "@/lib/zengin";

export const instant = false;

const STATUS = { draft: "下書き", approved: "承認済み", paid: "振込済み" } as Record<string, string>;

export default async function AdminPayouts({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const { data: op } = await db().from("operators").select("transfer_settings").eq("id", admin.operator_id).single();
  const ts = (op?.transfer_settings ?? {}) as TransferSettings;
  const { data: payouts } = await db().from("payouts")
    .select("id, month, amount, status, paid_on, statement_number, invoice_number_snapshot, partners(name, bank_last4)")
    .eq("operator_id", admin.operator_id)
    .order("month", { ascending: false });

  return (
    <>
      <Header partner={admin} />
      <main>
        <AdminNav current="/admin/payouts/" />
        <h1>支払い</h1>
        <Notice params={params} />
        <form action="/api/admin/payouts/zengin/" method="get" className="row">
          <label>振込指定日 <input type="date" name="date" required /></label>
          <button type="submit">承認済みの分を全銀データで書き出す</button>
          <a className="button secondary" href="/api/admin/payouts/csv/">一覧をCSVで書き出す</a>
        </form>
        <form action="/api/admin/closing/" method="post">
          <button type="submit" className="secondary small">締め処理を今すぐ動かす</button>
          <span className="label">（毎日・毎月1日に自動で動く処理と同じです。何度動かしても二重にはなりません）</span>
        </form>
        <p className="label">毎月1日に、前月末までに確定した報酬を紹介者ごとに全製品合計し、5,000円以上なら下書きを作ります。確かめて承認し、振り込んだら「振込済み」にしてください。</p>

        <div className="scroll">
          <table>
            <thead><tr><th>対象月</th><th>紹介者</th><th>口座</th><th>額</th><th>インボイス</th><th>状態</th><th>支払日</th><th>操作</th></tr></thead>
            <tbody>
              {(payouts ?? []).map((p) => {
                const partner = p.partners as unknown as { name: string; bank_last4: string | null } | null;
                return (
                  <tr key={p.id}>
                    <td>{p.month.slice(0, 7)}</td>
                    <td>{partner?.name}</td>
                    <td>{partner?.bank_last4 ? `****${partner.bank_last4}` : "—"}</td>
                    <td>{yen(p.amount)}</td>
                    <td>{p.invoice_number_snapshot ?? "—"}</td>
                    <td>{STATUS[p.status]}</td>
                    <td>{ymd(p.paid_on)}</td>
                    <td>
                      {p.status === "draft" && (
                        <form action="/api/admin/payouts/" method="post">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="action" value="approve" />
                          <button type="submit" className="small">承認</button>
                        </form>
                      )}
                      {p.status === "approved" && (
                        <form action="/api/admin/payouts/" method="post" className="row">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="action" value="mark_paid" />
                          <input type="date" name="paid_on" />
                          <button type="submit" className="small">振込済みにする</button>
                        </form>
                      )}
                      {p.status === "paid" && (
                        <a href={`/api/payouts/${p.id}/statement/`} target="_blank" rel="noreferrer">支払通知書 {p.statement_number ?? ""}</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <section className="card">
          <h2>振込元の口座（全銀データ用）</h2>
          <p className="label">銀行の法人向けサービスで総合振込の契約をすると、委託者コードが発行されます。</p>
          <form action="/api/admin/settings/" method="post" className="stack">
            <label>委託者コード（10桁）<input name="consignor_code" inputMode="numeric" defaultValue={ts.consignor_code ?? ""} required /></label>
            <label>委託者名（カナ）<input name="consignor_name" defaultValue={ts.consignor_name ?? ""} required /></label>
            <label>銀行番号（4桁）<input name="bank_code" inputMode="numeric" defaultValue={ts.bank_code ?? ""} required /></label>
            <label>銀行名（カナ・任意）<input name="bank_name" defaultValue={ts.bank_name ?? ""} /></label>
            <label>支店番号（3桁）<input name="branch_code" inputMode="numeric" defaultValue={ts.branch_code ?? ""} required /></label>
            <label>支店名（カナ・任意）<input name="branch_name" defaultValue={ts.branch_name ?? ""} /></label>
            <label>預金種目
              <select name="account_type" defaultValue={ts.account_type ?? "1"}>
                <option value="1">普通</option>
                <option value="2">当座</option>
              </select>
            </label>
            <label>口座番号（7桁）<input name="account_number" inputMode="numeric" defaultValue={ts.account_number ?? ""} required /></label>
            <button type="submit">保存する</button>
          </form>
        </section>
      </main>
    </>
  );
}
