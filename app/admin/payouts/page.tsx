import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { yen, ymd } from "@/lib/referrals";
import { formatMonth, messages } from "@/lib/i18n";
import { AdminFrame, Notice } from "@/components/Header";
import type { TransferSettings } from "@/lib/zengin";

export const instant = false;

export default async function AdminPayouts({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const lc = admin.locale;
  const t = messages(lc).admin.payouts;
  const params = await searchParams;
  const { data: op } = await db().from("operators").select("transfer_settings").eq("id", admin.operator_id).single();
  const ts = (op?.transfer_settings ?? {}) as TransferSettings;
  const { data: payouts } = await db().from("payouts")
    .select("id, month, amount, status, paid_on, statement_number, invoice_number_snapshot, method, paypal_email_snapshot, partners(name, bank_last4)")
    .eq("operator_id", admin.operator_id)
    .order("month", { ascending: false });

  return (
    <AdminFrame admin={admin} current="/admin/payouts/">
      <h1>{t.title}</h1>
      <Notice params={params} locale={lc} />
      <form action="/api/admin/payouts/zengin/" method="get" className="row">
        <label>{t.transferDate} <input type="date" name="date" required /></label>
        <button type="submit">{t.exportZengin}</button>
        <a className="button secondary" href="/api/admin/payouts/csv/">{t.exportCsv}</a>
        <a className="button secondary" href="/api/admin/payouts/csv/?method=paypal">{t.exportPaypal}</a>
      </form>
      <form action="/api/admin/closing/" method="post">
        <button type="submit" className="secondary small">{t.runClosing}</button>
        <span className="label">{t.runClosingNote}</span>
      </form>
      <p className="label">{t.monthlyNote}</p>

      <div className="scroll">
        <table>
          <thead><tr><th>{t.colMonth}</th><th>{t.colPartner}</th><th>{t.colMethod}</th><th>{t.colAccount}</th><th>{t.colAmount}</th><th>{t.colInvoice}</th><th>{t.colStatus}</th><th>{t.colPaidOn}</th><th>{t.colActions}</th></tr></thead>
          <tbody>
            {(payouts ?? []).map((p) => {
              const partner = p.partners as unknown as { name: string; bank_last4: string | null } | null;
              return (
                <tr key={p.id}>
                  <td>{formatMonth(p.month, lc)}</td>
                  <td>{partner?.name}</td>
                  <td>{t.method[p.method] ?? p.method}</td>
                  <td>{p.method === "paypal" ? (p.paypal_email_snapshot ?? "—") : partner?.bank_last4 ? `****${partner.bank_last4}` : "—"}</td>
                  <td>{yen(p.amount, lc)}</td>
                  <td>{p.invoice_number_snapshot ?? "—"}</td>
                  <td>{t.status[p.status]}</td>
                  <td>{ymd(p.paid_on, lc)}</td>
                  <td>
                    {p.status === "draft" && (
                      <form action="/api/admin/payouts/" method="post">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="action" value="approve" />
                        <button type="submit" className="small">{t.approve}</button>
                      </form>
                    )}
                    {p.status === "approved" && (
                      <form action="/api/admin/payouts/" method="post" className="row">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="action" value="mark_paid" />
                        <input type="date" name="paid_on" />
                        <button type="submit" className="small">{t.markPaid}</button>
                      </form>
                    )}
                    {p.status === "paid" && (
                      <a href={`/api/payouts/${p.id}/statement/`} target="_blank" rel="noreferrer">{t.statement(p.statement_number ?? "")}</a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="card">
        <h2>{t.sourceTitle}</h2>
        <p className="label">{t.sourceNote}</p>
        <form action="/api/admin/settings/" method="post" className="stack">
          <label>{t.consignorCode}<input name="consignor_code" inputMode="numeric" defaultValue={ts.consignor_code ?? ""} required /></label>
          <label>{t.consignorName}<input name="consignor_name" defaultValue={ts.consignor_name ?? ""} required /></label>
          <label>{t.bankCode}<input name="bank_code" inputMode="numeric" defaultValue={ts.bank_code ?? ""} required /></label>
          <label>{t.bankName}<input name="bank_name" defaultValue={ts.bank_name ?? ""} /></label>
          <label>{t.branchCode}<input name="branch_code" inputMode="numeric" defaultValue={ts.branch_code ?? ""} required /></label>
          <label>{t.branchName}<input name="branch_name" defaultValue={ts.branch_name ?? ""} /></label>
          <label>{t.accountType}
            <select name="account_type" defaultValue={ts.account_type ?? "1"}>
              <option value="1">{t.ordinary}</option>
              <option value="2">{t.checking}</option>
            </select>
          </label>
          <label>{t.accountNumber}<input name="account_number" inputMode="numeric" defaultValue={ts.account_number ?? ""} required /></label>
          <button type="submit">{t.save}</button>
        </form>
      </section>
    </AdminFrame>
  );
}
