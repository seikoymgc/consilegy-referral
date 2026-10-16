import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { yen, ymd } from "@/lib/referrals";
import { AdminNav, Header, Notice } from "@/components/Header";

export const instant = false;

const STATUS = { draft: "下書き", approved: "承認済み", paid: "振込済み" } as Record<string, string>;

export default async function AdminPayouts({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
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
        <p>
          <a className="button secondary" href="/api/admin/payouts/csv/">承認済みの振込リストをCSVで書き出す</a>
        </p>
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
                      {p.status === "paid" && (p.statement_number ?? "")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
