import { requirePartner } from "@/lib/auth";
import { listCommissions, listPayouts } from "@/lib/queries";
import { displayCompany, yen, ymd } from "@/lib/referrals";
import { formatMonth, messages } from "@/lib/i18n";
import {
  EmptyState,
  PartnerShell,
  StatusBadge,
} from "@/components/PartnerShell";

export const instant = false;

export default async function MyRewards() {
  const p = await requirePartner();
  const lc = p.locale;
  const t = messages(lc).rewards;
  const labels = messages(lc).labels;
  const count = messages(lc).common.count;
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
      title={t.title}
      description={t.description}
    >
      <section className="reward-summary" aria-label={messages(lc).home.overviewAria}>
        <div className="reward-summary-primary">
          <p>{t.total}</p>
          <strong>{yen(total, lc)}</strong>
          <span>{t.totalNote}</span>
        </div>
        <div>
          <p>{t.carry}</p>
          <strong>{yen(carry, lc)}</strong>
          <span>{t.carryNote}</span>
        </div>
        <div>
          <p>{t.scheduled}</p>
          <strong>{yen(scheduled, lc)}</strong>
          <span>{t.scheduledNote}</span>
        </div>
      </section>
      <div className="payment-guide">
        <span aria-hidden="true">¥</span>
        <div>
          <strong>{t.guideTitle}</strong>
          <p>{t.guideText}</p>
          {balance < 0 && <p>{t.offset(yen(-balance, lc))}</p>}
          {p.payout_method === "none" && <p>{t.noPayout}</p>}
        </div>
      </div>
      <section className="card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REWARD DETAILS</p>
            <h2>{t.detailsTitle}</h2>
          </div>
          <span className="record-count">{count(comms.length)}</span>
        </div>
        {comms.length === 0 ? (
          <EmptyState title={t.detailsEmptyTitle} description={t.detailsEmptyText} />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.colDate}</th>
                  <th>{t.colProduct}</th>
                  <th>{t.colCompany}</th>
                  <th>{t.colKind}</th>
                  <th>{t.colAmount}</th>
                  <th>{t.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {comms.map((c) => (
                  <tr key={c.id}>
                    <td className="date-cell">
                      {ymd(c.confirmed_at ?? c.created_at, lc)}
                    </td>
                    <td>{c.product_name}</td>
                    <td>{displayCompany(c.company_name, lc)}</td>
                    <td>{labels.kind[c.kind] ?? c.kind}</td>
                    <td className="amount-cell">{yen(c.amount, lc)}</td>
                    <td>
                      <StatusBadge status={c.status}>
                        {labels.commissionStatus[c.status] ?? c.status}
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
            <h2>{t.historyTitle}</h2>
          </div>
          <span className="record-count">{count(payouts.length)}</span>
        </div>
        {payouts.length === 0 ? (
          <EmptyState title={t.historyEmptyTitle} description={t.historyEmptyText} />
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.colMonth}</th>
                  <th>{t.colPaidOn}</th>
                  <th>{t.colAmount}</th>
                  <th>{t.colStatus}</th>
                  <th>{t.colStatement}</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((x) => (
                  <tr key={x.id}>
                    <td className="date-cell">{formatMonth(x.month, lc)}</td>
                    <td className="date-cell">{ymd(x.paid_on, lc)}</td>
                    <td className="amount-cell">{yen(x.amount, lc)}</td>
                    <td>
                      <StatusBadge status={x.status}>
                        {x.status === "paid" ? t.paid : t.scheduledStatus}
                      </StatusBadge>
                    </td>
                    <td>
                      {x.status === "paid" ? (
                        <a
                          className="statement-link"
                          href={`/api/payouts/${x.id}/statement/`}
                        >
                          {t.statementLink}
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
