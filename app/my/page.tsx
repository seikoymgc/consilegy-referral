import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { getSummary } from "@/lib/queries";
import { formatMonth, messages } from "@/lib/i18n";
import { yen, ymd } from "@/lib/referrals";
import { EmptyState, PartnerShell } from "@/components/PartnerShell";

export const instant = false;

export default async function MyHome() {
  const p = await requirePartner();
  const s = await getSummary(p.id);
  const lc = p.locale;
  const t = messages(lc).home;
  const count = messages(lc).common.count;
  const needsBank =
    s.confirmedTotal > 0 &&
    ((p.payout_method === "bank" && !p.bank_last4) ||
      (p.payout_method === "paypal" && !p.paypal_email));
  return (
    <PartnerShell
      partner={p}
      current="/my/"
      title={t.greeting(p.name)}
      description={t.description}
      action={
        <Link href="/my/products/" className="button action-primary primary-referral-button">
          {t.refer} <span aria-hidden="true">↗</span>
        </Link>
      }
    >
      <section className="dashboard-overview" aria-label={t.overviewAria}>
        <div className="earnings-card">
          <p className="eyebrow">YOUR CONNECTIONS, YOUR REWARDS</p>
          <p className="metric-label">{t.totalLabel}</p>
          <p className="earnings-value">{yen(s.confirmedTotal, lc)}</p>
          <div className="earnings-bottom">
            <span>
              {t.carryOver} <strong>{yen(s.carryOver, lc)}</strong>
            </span>
            <Link href="/my/rewards/">{t.rewardsLink}</Link>
          </div>
        </div>
        <div className="next-payment-card">
          <p className="eyebrow">NEXT PAYMENT</p>
          <h2>{t.nextPayment}</h2>
          <p className="payment-amount">
            {s.nextPayout ? yen(s.nextPayout.amount, lc) : t.noPayment}
          </p>
          <p>
            {s.nextPayout
              ? t.nextPaymentText(formatMonth(s.nextPayout.month, lc))
              : t.nextPaymentNone}
          </p>
          <Link href="/my/settings/">{t.bankLink}</Link>
        </div>
      </section>
      <section className="workspace-metrics" aria-label={t.statusAria}>
        <Stat label={t.statReferrals} value={s.referralCount} unit={t.statUnit} />
        <Stat label={t.statInProgress} value={s.inProgress} unit={t.statUnit} />
        <Stat label={t.statPaying} value={s.paying} unit={t.statUnit} />
      </section>
      {needsBank && (
        <div className="workspace-callout">
          <div>
            <strong>{t.bankCalloutTitle}</strong>
            <p>{t.bankCalloutText}</p>
          </div>
          <Link href="/my/settings/#bank" className="button">
            {t.bankCalloutButton}
          </Link>
        </div>
      )}
      <div className="dashboard-columns">
        <section className="card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEXT STEP</p>
              <h2>{t.nextStep}</h2>
            </div>
            <span className="panel-mark" aria-hidden="true">
              ↗
            </span>
          </div>
          <div className="next-actions">
            <Link href="/my/products/">
              <span className="action-number">01</span>
              <div>
                <strong>{s.referralCount === 0 ? t.firstReferral : t.nextReferral}</strong>
                <p>{t.editionsHint}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/my/referrals/">
              <span className="action-number">02</span>
              <div>
                <strong>{t.checkReferrals}</strong>
                <p>{t.checkReferralsHint}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section className="card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">BY PRODUCT</p>
              <h2>{t.byProduct}</h2>
            </div>
          </div>
          {s.byProduct.length === 0 ? (
            <EmptyState
              title={t.emptyTitle}
              description={t.emptyText}
              action={
                <Link href="/my/products/" className="text-link">
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
                    <th>{t.colCount}</th>
                    <th>{t.colReward}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byProduct.map((b) => (
                    <tr key={b.slug}>
                      <td>{b.name}</td>
                      <td>{count(b.count)}</td>
                      <td className="amount-cell">{yen(b.reward, lc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <p className="workspace-updated">{t.updated(ymd(new Date(), lc))}</p>
    </PartnerShell>
  );
}
function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="workspace-stat">
      <p>{label}</p>
      <strong>
        {value}
        {unit && <span>{unit}</span>}
      </strong>
    </div>
  );
}
