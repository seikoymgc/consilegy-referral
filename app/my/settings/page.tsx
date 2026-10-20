import { PartnerShell } from "@/components/PartnerShell";
import { requirePartner } from "@/lib/auth";
import { messages } from "@/lib/i18n";
import { Notice } from "@/components/Header";

export const instant = false;

export default async function MySettings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const p = await requirePartner();
  const lc = p.locale;
  const t = messages(lc).settings;
  const languages = messages(lc).labels.languages;
  const params = await searchParams;

  return (
    <PartnerShell
      partner={p}
      current="/my/settings/"
      title={t.title}
      description={t.description}
    >
      <Notice params={params} locale={lc} />

      <div className="settings-grid">
        <section className="card profile-panel">
          <h2>{t.profile}</h2>
          <form action="/api/me/" method="post" className="stack">
            <input type="hidden" name="_method" value="PATCH" />
            <label>
              {t.name}
              <input name="name" defaultValue={p.name} required />
            </label>
            <label>
              {t.company}
              <input name="company" defaultValue={p.company ?? ""} />
            </label>
            <label>
              {t.email}
              <input value={p.email} disabled />
            </label>
            <label>
              {t.phone}
              <input name="phone" type="tel" defaultValue={p.phone ?? ""} />
            </label>
            <label>
              {t.language}
              <select name="locale" defaultValue={p.locale}>
                <option value="ja" lang="ja">{languages.ja}</option>
                <option value="en" lang="en">{languages.en}</option>
              </select>
            </label>
            <label>
              {t.payoutMethod}
              <select name="payout_method" defaultValue={p.payout_method}>
                <option value="bank">{t.payoutBank}</option>
                <option value="none">{t.payoutNone}</option>
              </select>
            </label>
            <label>
              {t.invoice}
              <input
                name="invoice_number"
                defaultValue={p.invoice_number ?? ""}
                placeholder="T1234567890123"
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="marketing"
                defaultChecked={p.marketing_opt_in}
              />{" "}
              {t.marketing}
            </label>
            <button type="submit">{t.save}</button>
          </form>
          <p className="label">
            {t.code}<code>{p.referral_code}</code>
          </p>
        </section>

        <section id="bank" className="card bank-panel">
          <p className="eyebrow">PAYMENT DETAILS</p>
          <h2>{t.bankTitle}</h2>
          {t.bankNote && <p className="label">{t.bankNote}</p>}
          {p.bank_last4 && (
            <p>
              {t.bankRegistered} <strong>{p.bank_last4}</strong>
            </p>
          )}
          <form action="/api/me/bank/" method="post" className="stack">
            <label>
              {t.bankCode}
              <input
                name="bank_code"
                inputMode="numeric"
                pattern="\d{4}"
                required
              />
            </label>
            <label>
              {t.branchCode}
              <input
                name="branch_code"
                inputMode="numeric"
                pattern="\d{3}"
                required
              />
            </label>
            <label>
              {t.accountType}
              <select name="account_type" defaultValue="ordinary">
                <option value="ordinary">{t.ordinary}</option>
                <option value="checking">{t.checking}</option>
              </select>
            </label>
            <label>
              {t.accountNumber}
              <input
                name="account_number"
                inputMode="numeric"
                pattern="\d{7}"
                required
              />
            </label>
            <label>
              {t.holder}
              <input name="holder_kana" required />
              {t.holderNote && <span className="label">{t.holderNote}</span>}
            </label>
            <button type="submit">
              {p.bank_last4 ? t.bankChange : t.bankRegister}
            </button>
          </form>
          <p className="label">{t.bankSecurity}</p>
        </section>

        <section className="card account-panel">
          <h2>{t.account}</h2>
          <form action="/api/logout/" method="post">
            <button type="submit" className="secondary">
              {t.logout}
            </button>
          </form>
          <details className="account-withdraw">
            <summary>{t.withdrawSummary}</summary>
            <form action="/api/me/" method="post" className="stack">
              <input type="hidden" name="_method" value="DELETE" />
              <p className="label">{t.withdrawNote}</p>
              <label className="check">
                <input type="checkbox" required /> {t.withdrawCheck}
              </label>
              <button type="submit" className="danger">
                {t.withdrawSubmit}
              </button>
            </form>
          </details>
        </section>
      </div>
    </PartnerShell>
  );
}
