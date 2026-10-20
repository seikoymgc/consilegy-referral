import {
  PartnerShell,
  EmptyState,
  StatusBadge,
} from "@/components/PartnerShell";
import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { listProducts, listReferrals } from "@/lib/queries";
import { addBusinessDays, addMonths, displayCompany, yen, ymd } from "@/lib/referrals";
import { messages, type Locale } from "@/lib/i18n";
import { Notice } from "@/components/Header";

export const instant = false;

function nextDeadline(
  r: {
    status: string;
    created_at: string;
    accepted_at: string | null;
    confirmed_at: string | null;
    reward_period_end: string | null;
  },
  locale: Locale,
) {
  const t = messages(locale).referrals;
  if (r.status === "pending")
    return t.deadlineAccept(ymd(addBusinessDays(new Date(r.created_at), 3), locale));
  if (r.status === "accepted" && r.accepted_at)
    return t.deadlineMeeting(ymd(new Date(new Date(r.accepted_at).getTime() + 90 * 86400000), locale));
  if (r.status === "confirmed" && r.confirmed_at)
    return t.deadlineContract(ymd(addMonths(new Date(r.confirmed_at), 12), locale));
  if (r.status === "paying" && r.reward_period_end)
    return t.deadlineReward(ymd(r.reward_period_end, locale));
  return "—";
}

export default async function MyReferrals({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; error?: string; saved?: string }>;
}) {
  const p = await requirePartner();
  const lc = p.locale;
  const t = messages(lc).referrals;
  const labels = messages(lc).labels;
  const params = await searchParams;
  const [products, refs] = await Promise.all([
    listProducts(),
    listReferrals(p.id, params.product),
  ]);
  const publicProducts = products.filter((x) => x.status === "public");

  return (
    <PartnerShell
      partner={p}
      current="/my/referrals/"
      title={t.title}
      description={t.description}
      action={
        <Link href="#new-referral" className="button action-primary">
          {t.add} <span aria-hidden="true">＋</span>
        </Link>
      }
    >
      <Notice params={params} locale={lc} />

      <nav className="tabs">
        <Link
          href="/my/referrals/"
          aria-current={!params.product ? "page" : undefined}
        >
          {t.all}
        </Link>
        {products.map((x) => (
          <Link
            key={x.slug}
            href={`/my/referrals/?product=${x.slug}`}
            aria-current={params.product === x.slug ? "page" : undefined}
          >
            {x.name}
          </Link>
        ))}
      </nav>

      <section className="card referral-list-panel">
        <div className="panel-heading">
          <h2>{t.listTitle}</h2>
          <span className="record-count">{messages(lc).common.count(refs.length)}</span>
        </div>
        {refs.length === 0 ? (
          <EmptyState
            title={t.emptyTitle}
            description={t.emptyText}
            action={
              <Link href="/my/products/" className="button secondary">
                {t.kitLink}
              </Link>
            }
          />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.colProduct}</th>
                  <th>{t.colCompany}</th>
                  <th>{t.colDate}</th>
                  <th>{t.colStatus}</th>
                  <th>{t.colDeadline}</th>
                  <th>{t.colReward}</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.product.name}</td>
                    <td>
                      {displayCompany(r.company_name, lc)}
                      {r.channel === "link" && (
                        <span className="badge">{t.linkBadge}</span>
                      )}
                    </td>
                    <td>{ymd(r.created_at, lc)}</td>
                    <td>
                      <StatusBadge status={r.status}>
                        {labels.status[r.status] ?? r.status}
                      </StatusBadge>
                    </td>
                    <td>{nextDeadline(r, lc)}</td>
                    <td className="amount-cell">{yen(r.reward_total, lc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="new-referral" className="card new-referral-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW CONNECTION</p>
            <h2>{t.newTitle}</h2>
          </div>
          <span className="panel-mark" aria-hidden="true">
            ＋
          </span>
        </div>
        <p className="panel-description">{t.newLead}</p>
        <form
          action="/api/referrals/"
          method="post"
          className="stack referral-form"
        >
          <label>
            {t.fieldProduct}
            <select
              name="product"
              required
              defaultValue={params.product ?? publicProducts[0]?.slug}
            >
              {publicProducts.map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.fieldCompany}
            <input name="company_name" required />
          </label>
          <label>
            {t.fieldContact}
            <input name="contact_name" />
          </label>
          <label>
            {t.fieldTitle}
            <input name="contact_title" />
          </label>
          <label>
            {t.fieldContactInfo}
            <input name="contact_info" />
            <span className="label">{t.fieldContactInfoNote}</span>
          </label>
          <label>
            {t.fieldConnection}
            <select name="connection_method" defaultValue="introduce">
              {Object.entries(labels.connection).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.fieldNote}
            <textarea name="note" rows={3} />
          </label>
          <label className="check">
            <input type="checkbox" name="consent" required /> {t.consent}
          </label>
          <button type="submit" className="action-primary">{t.submit}</button>
        </form>
        <p className="label">{t.afterSubmit}</p>
      </section>
    </PartnerShell>
  );
}
