import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { addBusinessDays, yen, ymd } from "@/lib/referrals";
import { messages } from "@/lib/i18n";
import { AdminFrame, Notice } from "@/components/Header";

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
  const lc = admin.locale;
  const t = messages(lc).admin.referrals;
  const labels = messages(lc).labels;
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
    <AdminFrame admin={admin} current="/admin/referrals/">
      <h1>{t.title}</h1>
      <Notice params={params} locale={lc} />

      <nav className="tabs">
        <a href="/admin/referrals/" aria-current={!params.status ? "page" : undefined}>{t.all}</a>
        {Object.entries(labels.status).map(([k, v]) => (
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
              <span className="badge">{labels.status[r.status]}</span>
              {r.channel === "link" && <span className="badge">{t.viaLink}</span>}
            </h2>
            {(sameDomain || sameCompany) && (
              <p className="alert error">{t.selfReferral}</p>
            )}
            <p>
              {t.partner}{t.sep}{partner?.name}{lc === "en" ? ` (${partner?.email})` : `（${partner?.email}）`}<br />
              {t.contact}{t.sep}{r.contact_name ?? "—"} {r.contact_title ?? ""} / {t.contactInfo}{t.sep}{r.contact_info ?? "—"}<br />
              {t.connection}{t.sep}{labels.connection[r.connection_method ?? ""] ?? r.connection_method ?? "—"} / {t.registered}{t.sep}{ymd(r.created_at, lc)}
              {r.status === "pending" && <> / <strong>{t.deadline}{t.sep}{ymd(addBusinessDays(new Date(r.created_at), 3), lc)}</strong>{r.channel === "link" && t.autoAccept}</>}
              <br />
              {t.contract}{t.sep}{r.product_contract_id ?? t.unlinked}{r.has_in_product_referral && t.inProduct}
            </p>
            {r.note && <p className="pre">{r.note}</p>}

            <div className="row">
              {[
                ["accept", t.actAccept],
                ["confirm", t.actConfirm],
                ["existing_contact", t.actExisting],
                ["out_of_scope", t.actOutOfScope],
                ["cancelled", t.actCancelled],
              ].map(([action, label]) => (
                <form key={action} action="/api/admin/referrals/" method="post">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="action" value={action} />
                  <button type="submit" className="small">{label}</button>
                </form>
              ))}
            </div>

            <details>
              <summary>{t.linkSummary}</summary>
              <form action="/api/admin/referrals/" method="post" className="row">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="action" value="link_contract" />
                <input name="contract_id" placeholder={t.contractPlaceholder} defaultValue={r.product_contract_id ?? ""} />
                <button type="submit" className="small">{t.link}</button>
              </form>
              <form action="/api/admin/referrals/" method="post" className="row">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="action" value="manual_service_payment" />
                <input name="amount_excl_tax" type="number" placeholder={t.amountPlaceholder} />
                <input name="paid_on" type="date" />
                <button type="submit" className="small">{t.registerPayment}</button>
              </form>
            </details>
          </section>
        );
      })}

      <section className="card">
        <h2>{t.held}</h2>
        {(heldEvents ?? []).length === 0 ? <p>{t.heldNone}</p> : (
          <table>
            <thead><tr><th>{t.colProduct}</th><th>{t.colContract}</th><th>{t.colKind}</th><th>{t.colAmount}</th><th>{t.colDate}</th></tr></thead>
            <tbody>
              {(heldEvents ?? []).map((e) => (
                <tr key={e.id}>
                  <td>{(e.products as unknown as { name: string })?.name}</td>
                  <td>{e.product_contract_id}</td>
                  <td>{e.charge_type === "service" ? t.service : t.monthly}</td>
                  <td>{e.amount_excl_tax == null ? "" : yen(e.amount_excl_tax, lc)}</td>
                  <td>{ymd(e.occurred_at, lc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="label">{t.heldNote}</p>
      </section>
    </AdminFrame>
  );
}
