import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { yen, ymd } from "@/lib/referrals";
import { messages } from "@/lib/i18n";
import { AdminFrame, Notice } from "@/components/Header";

export const instant = false;

export default async function AdminPartners({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const lc = admin.locale;
  const t = messages(lc).admin.partners;
  const languages = messages(lc).labels.languages;
  const count = messages(lc).common.count;
  const params = await searchParams;

  const { data: partners } = await db().from("partners")
    .select("id, name, company, email, phone, referral_code, status, role, is_professional, tax_checked_at, invoice_number, bank_last4, locale, created_at")
    .eq("operator_id", admin.operator_id).order("created_at", { ascending: false });
  const { data: refs } = await db().from("referrals")
    .select("partner_id, products(name)").eq("operator_id", admin.operator_id);
  const { data: unpaid } = await db().from("commissions")
    .select("partner_id, amount").eq("operator_id", admin.operator_id).eq("status", "confirmed");

  return (
    <AdminFrame admin={admin} current="/admin/partners/">
      <h1>{t.title}</h1>
      <Notice params={params} locale={lc} />
      <div className="scroll">
        <table>
          <thead>
            <tr><th>{t.colName}</th><th>{t.colContact}</th><th>{t.colCode}</th><th>{t.colByProduct}</th><th>{t.colOwed}</th><th>{t.colInvoice}</th><th>{t.colBank}</th><th>{t.colLanguage}</th><th>{t.colStatus}</th><th>{t.colActions}</th></tr>
          </thead>
          <tbody>
            {(partners ?? []).map((p) => {
              const mine = (refs ?? []).filter((r) => r.partner_id === p.id);
              const byProduct = new Map<string, number>();
              for (const r of mine) {
                const n = (r.products as unknown as { name: string } | null)?.name ?? "?";
                byProduct.set(n, (byProduct.get(n) ?? 0) + 1);
              }
              const owed = (unpaid ?? []).filter((c) => c.partner_id === p.id).reduce((s, c) => s + c.amount, 0);
              return (
                <tr key={p.id}>
                  <td>
                    {p.name}{p.company ? t.company(p.company) : ""}
                    {p.role === "admin" && <span className="badge">{t.admin}</span>}
                    {p.is_professional && <span className="badge">{t.professional}</span>}
                    <div className="label">{t.registered(ymd(p.created_at, lc))}</div>
                  </td>
                  <td>{p.email}<br />{p.phone}</td>
                  <td><code>{p.referral_code}</code></td>
                  <td>{Array.from(byProduct.entries()).map(([n, c]) => `${n} ${count(c)}`).join(" / ") || "—"}</td>
                  <td>{yen(owed, lc)}</td>
                  <td>{p.invoice_number ?? "—"}</td>
                  <td>{p.bank_last4 ? `****${p.bank_last4}` : t.notRegistered}</td>
                  <td>{languages[p.locale] ?? p.locale}</td>
                  <td>{p.status === "active" ? t.active : p.status === "suspended" ? t.suspended : t.withdrawn}</td>
                  <td>
                    {p.status === "active" ? (
                      <form action="/api/admin/partners/" method="post">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="action" value="suspend" />
                        <button type="submit" className="danger small">{t.suspend}</button>
                      </form>
                    ) : p.status === "suspended" ? (
                      <form action="/api/admin/partners/" method="post">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="action" value="activate" />
                        <button type="submit" className="small">{t.activate}</button>
                      </form>
                    ) : null}
                    <form action="/api/admin/partners/" method="post">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="action" value="professional" />
                      <input type="hidden" name="value" value={p.is_professional ? "false" : "true"} />
                      <button type="submit" className="link small">{p.is_professional ? t.unmarkProfessional : t.markProfessional}</button>
                    </form>
                    {p.is_professional && (p.tax_checked_at ? (
                      <div className="label">{t.taxChecked(ymd(p.tax_checked_at, lc))}</div>
                    ) : (
                      <form action="/api/admin/partners/" method="post">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="action" value="tax_checked" />
                        <button type="submit" className="link small">{t.markTaxChecked}</button>
                      </form>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminFrame>
  );
}
