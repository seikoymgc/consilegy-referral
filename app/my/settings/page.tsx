import { PartnerShell } from "@/components/PartnerShell";
import { requirePartner } from "@/lib/auth";
import { Notice } from "@/components/Header";

export const instant = false;

export default async function MySettings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const p = await requirePartner();
  const params = await searchParams;

  return (
    <PartnerShell
      partner={p}
      current="/my/settings/"
      title="登録情報"
      description="プロフィールや報酬の受け取り方法、振込先を管理します。"
    >
      <Notice params={params} />

      <div className="settings-grid">
        <section className="card profile-panel">
          <h2>基本情報</h2>
          <form action="/api/me/" method="post" className="stack">
            <input type="hidden" name="_method" value="PATCH" />
            <label>
              お名前
              <input name="name" defaultValue={p.name} required />
            </label>
            <label>
              会社名・屋号
              <input name="company" defaultValue={p.company ?? ""} />
            </label>
            <label>
              メールアドレス
              <input value={p.email} disabled />
            </label>
            <label>
              電話番号
              <input name="phone" type="tel" defaultValue={p.phone ?? ""} />
            </label>
            <label>
              報酬の受け取り
              <select name="payout_method" defaultValue={p.payout_method}>
                <option value="bank">銀行振込で受け取る</option>
                <option value="none">受け取らない</option>
              </select>
            </label>
            <label>
              インボイス登録番号（お持ちの方。T＋13桁）
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
              お知らせメールを受け取る
            </label>
            <button type="submit">保存する</button>
          </form>
          <p className="label">
            あなたの紹介コード：<code>{p.referral_code}</code>
          </p>
        </section>

        <section id="bank" className="card bank-panel">
          <p className="eyebrow">PAYMENT DETAILS</p>
          <h2>振込先</h2>
          {p.bank_last4 && (
            <p>
              登録済み：口座番号 下4桁 <strong>{p.bank_last4}</strong>
            </p>
          )}
          <form action="/api/me/bank/" method="post" className="stack">
            <label>
              銀行コード（4桁）
              <input
                name="bank_code"
                inputMode="numeric"
                pattern="\d{4}"
                required
              />
            </label>
            <label>
              支店コード（3桁）
              <input
                name="branch_code"
                inputMode="numeric"
                pattern="\d{3}"
                required
              />
            </label>
            <label>
              口座種別
              <select name="account_type" defaultValue="ordinary">
                <option value="ordinary">普通</option>
                <option value="checking">当座</option>
              </select>
            </label>
            <label>
              口座番号（7桁）
              <input
                name="account_number"
                inputMode="numeric"
                pattern="\d{7}"
                required
              />
            </label>
            <label>
              口座名義（カナ）
              <input name="holder_kana" required />
            </label>
            <button type="submit">
              {p.bank_last4 ? "振込先を変更する" : "振込先を登録する"}
            </button>
          </form>
          <p className="label">
            振込先は暗号化して保存し、表示は下4桁だけです。変更すると登録メールにお知らせが届きます。
          </p>
        </section>

        <section className="card account-panel">
          <h2>アカウントの管理</h2>
          <form action="/api/logout/" method="post">
            <button type="submit" className="secondary">
              ログアウト
            </button>
          </form>
          <details className="account-withdraw">
            <summary>退会の手続きについて</summary>
            <form action="/api/me/" method="post" className="stack">
              <input type="hidden" name="_method" value="DELETE" />
              <p className="label">
                退会すると新しい紹介は登録できなくなります。確定済みで未払いの報酬は、次の支払日にお支払いします。
              </p>
              <label className="check">
                <input type="checkbox" required /> 退会します
              </label>
              <button type="submit" className="danger">
                退会する
              </button>
            </form>
          </details>
        </section>
      </div>
    </PartnerShell>
  );
}
