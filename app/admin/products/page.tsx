import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav, Header, Notice } from "@/components/Header";

export const instant = false;

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const flashKey = (await cookies()).get("admin_flash_key")?.value;

  const { data: products } = await db().from("products")
    .select("id, slug, name, status, destination_url, fit_summary, sort_order, signing_key_encrypted")
    .eq("operator_id", admin.operator_id).order("sort_order");
  const { data: rules } = await db().from("reward_rules")
    .select("id, product_id, kind, label, rate, period_months, once, excluded_plans, effective_from")
    .eq("operator_id", admin.operator_id).order("effective_from", { ascending: false });
  const { data: kits } = await db().from("product_kits")
    .select("product_id, tagline, forward_message, fit, pricing, materials, screens, faq")
    .eq("operator_id", admin.operator_id);

  const pairs = (arr: Record<string, string>[] | null, a: string, b: string) =>
    (arr ?? []).map((x) => `${x[a]}|${x[b]}`).join("\n");

  return (
    <>
      <Header partner={admin} />
      <main>
        <AdminNav current="/admin/products/" />
        <h1>製品と報酬ルール</h1>
        <Notice params={params} />
        {flashKey && (
          <p className="alert ok">
            通知キーを発行しました。製品側の環境変数に設定してください（この画面を離れると二度と表示されません）：<br />
            <code className="copy">{flashKey}</code>
          </p>
        )}

        {(products ?? []).map((p) => {
          const kit = (kits ?? []).find((k) => k.product_id === p.id);
          return (
            <section key={p.id} className="card">
              <h2>{p.name} <span className="badge">{p.slug}</span></h2>

              <form action="/api/admin/products/" method="post" className="stack">
                <input type="hidden" name="action" value="update" />
                <input type="hidden" name="id" value={p.id} />
                <label>名前<input name="name" defaultValue={p.name} required /></label>
                <label>
                  状態
                  <select name="status" defaultValue={p.status}>
                    <option value="public">公開</option>
                    <option value="preparing">準備中</option>
                    <option value="hidden">非公開</option>
                  </select>
                </label>
                <label>紹介リンクの行き先URL<input name="destination_url" type="url" defaultValue={p.destination_url ?? ""} /></label>
                <label>こんな人・会社に（カードの説明）<input name="fit_summary" defaultValue={p.fit_summary ?? ""} /></label>
                <label>並び順<input name="sort_order" type="number" defaultValue={p.sort_order} /></label>
                <button type="submit">製品を保存</button>
              </form>

              <form action="/api/admin/products/" method="post" style={{ marginTop: 12 }}>
                <input type="hidden" name="action" value="issue_key" />
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="secondary">
                  {p.signing_key_encrypted ? "通知キーを再発行する（古いキーは無効）" : "通知キーを発行する"}
                </button>
              </form>

              <h3>報酬ルール</h3>
              <table>
                <thead><tr><th>種類</th><th>説明</th><th>率</th><th>期間</th><th>対象外</th><th>適用開始</th></tr></thead>
                <tbody>
                  {(rules ?? []).filter((r) => r.product_id === p.id).map((r) => (
                    <tr key={r.id}>
                      <td>{r.kind}</td><td>{r.label}</td>
                      <td>{r.rate != null ? `${Number(r.rate) * 100}%` : "—"}</td>
                      <td>{r.once ? "一度" : r.period_months ? `${r.period_months}か月` : "なし"}</td>
                      <td>{(r.excluded_plans ?? []).join(", ") || "—"}</td>
                      <td>{r.effective_from}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <details>
                <summary>報酬ルールを追加（変更は新しいルールの追加で行う。受理済みの紹介には元のルールを使う）</summary>
                <form action="/api/admin/rules/" method="post" className="stack">
                  <input type="hidden" name="product_id" value={p.id} />
                  <label>
                    種類
                    <select name="kind" defaultValue="monthly_rate">
                      <option value="monthly_rate">月額の率</option>
                      <option value="service_rate">導入支援の率</option>
                      <option value="fixed">定額</option>
                    </select>
                  </label>
                  <label>説明（紹介者に見せる文）<input name="label" required /></label>
                  <label>率（%）<input name="rate_percent" type="number" step="0.01" /></label>
                  <label>定額（円）<input name="fixed_amount" type="number" /></label>
                  <label>月額の◯か月分（定額のとき）<input name="fixed_months" type="number" step="0.5" /></label>
                  <label>期間（か月。空欄はなし）<input name="period_months" type="number" /></label>
                  <label className="check"><input type="checkbox" name="once" /> 一度だけ</label>
                  <label>対象外のプラン（カンマ区切り）<input name="excluded_plans" placeholder="prepaid,fuel,option" /></label>
                  <label>適用開始日<input name="effective_from" type="date" /></label>
                  <button type="submit">ルールを追加</button>
                </form>
              </details>

              <details>
                <summary>紹介キットを編集</summary>
                <form action="/api/admin/kits/" method="post" className="stack">
                  <input type="hidden" name="product_id" value={p.id} />
                  <label>一言紹介文（{"{link}"} で紹介リンクが入ります）<textarea name="tagline" rows={3} defaultValue={kit?.tagline ?? ""} /></label>
                  <label>転送用メッセージ（{"{link}"} 可）<textarea name="forward_message" rows={6} defaultValue={kit?.forward_message ?? ""} /></label>
                  <label>合う会社<textarea name="fit" rows={3} defaultValue={kit?.fit ?? ""} /></label>
                  <label>料金の要点<textarea name="pricing" rows={4} defaultValue={kit?.pricing ?? ""} /></label>
                  <label>資料（1行に「タイトル|URL」）<textarea name="materials" rows={3} defaultValue={pairs(kit?.materials as never, "title", "url")} /></label>
                  <label>画面（1行に「タイトル|URL」）<textarea name="screens" rows={3} defaultValue={pairs(kit?.screens as never, "title", "url")} /></label>
                  <label>質問への答え方（1行に「質問|答え」）<textarea name="faq" rows={5} defaultValue={pairs(kit?.faq as never, "q", "a")} /></label>
                  <button type="submit">キットを保存</button>
                </form>
              </details>
            </section>
          );
        })}

        <section className="card narrow">
          <h2>製品を追加</h2>
          <form action="/api/admin/products/" method="post" className="stack">
            <input type="hidden" name="action" value="create" />
            <label>識別名（英小文字・数字・ハイフン）<input name="slug" required pattern="[a-z0-9-]+" /></label>
            <label>名前<input name="name" required /></label>
            <label>
              状態
              <select name="status" defaultValue="hidden">
                <option value="public">公開</option>
                <option value="preparing">準備中</option>
                <option value="hidden">非公開</option>
              </select>
            </label>
            <label>紹介リンクの行き先URL<input name="destination_url" type="url" /></label>
            <button type="submit">追加する</button>
          </form>
        </section>
      </main>
    </>
  );
}
