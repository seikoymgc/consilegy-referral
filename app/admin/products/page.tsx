import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { AdminFrame, Notice } from "@/components/Header";

export const instant = false;

type KitEn = {
  tagline?: string | null;
  forward_message?: string | null;
  fit?: string | null;
  pricing?: string | null;
  materials?: Record<string, string>[];
  screens?: Record<string, string>[];
  faq?: Record<string, string>[];
} | null;

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const t = messages(admin.locale).admin.products;
  const params = await searchParams;
  const flashKey = (await cookies()).get("admin_flash_key")?.value;

  const { data: products } = await db().from("products")
    .select("id, slug, name, status, destination_url, fit_summary, fit_summary_en, sort_order, signing_key_encrypted")
    .eq("operator_id", admin.operator_id).order("sort_order");
  const { data: rules } = await db().from("reward_rules")
    .select("id, product_id, kind, label, label_en, rate, period_months, once, excluded_plans, effective_from")
    .eq("operator_id", admin.operator_id).order("effective_from", { ascending: false });
  const { data: kits } = await db().from("product_kits")
    .select("product_id, tagline, forward_message, fit, pricing, materials, screens, faq, content_en")
    .eq("operator_id", admin.operator_id);

  const pairs = (arr: Record<string, string>[] | null | undefined, a: string, b: string) =>
    (arr ?? []).map((x) => `${x[a]}|${x[b]}`).join("\n");

  const statusOptions = (
    <>
      <option value="public">{t.statusPublic}</option>
      <option value="preparing">{t.statusPreparing}</option>
      <option value="hidden">{t.statusHidden}</option>
    </>
  );

  return (
    <AdminFrame admin={admin} current="/admin/products/">
      <h1>{t.title}</h1>
      <Notice params={params} locale={admin.locale} />
      {flashKey && (
        <p className="alert ok">
          {t.flashKey}<br />
          <code className="copy">{flashKey}</code>
        </p>
      )}

      {(products ?? []).map((p) => {
        const kit = (kits ?? []).find((k) => k.product_id === p.id);
        const kitEn = (kit?.content_en ?? null) as KitEn;
        return (
          <section key={p.id} className="card">
            <h2>{p.name} <span className="badge">{p.slug}</span></h2>

            <form action="/api/admin/products/" method="post" className="stack">
              <input type="hidden" name="action" value="update" />
              <input type="hidden" name="id" value={p.id} />
              <label>{t.name}<input name="name" defaultValue={p.name} required /></label>
              <label>
                {t.status}
                <select name="status" defaultValue={p.status}>{statusOptions}</select>
              </label>
              <label>{t.destination}<input name="destination_url" type="url" defaultValue={p.destination_url ?? ""} /></label>
              <label>{t.fitSummary}<input name="fit_summary" defaultValue={p.fit_summary ?? ""} /></label>
              <label lang="en">{t.fitSummaryEn}<input name="fit_summary_en" defaultValue={p.fit_summary_en ?? ""} /></label>
              <label>{t.sortOrder}<input name="sort_order" type="number" defaultValue={p.sort_order} /></label>
              <button type="submit">{t.save}</button>
            </form>

            <form action="/api/admin/products/" method="post" style={{ marginTop: 12 }}>
              <input type="hidden" name="action" value="issue_key" />
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="secondary">
                {p.signing_key_encrypted ? t.reissueKey : t.issueKey}
              </button>
            </form>

            <h3>{t.rules}</h3>
            <table>
              <thead><tr><th>{t.colKind}</th><th>{t.colLabel}</th><th>{t.colRate}</th><th>{t.colPeriod}</th><th>{t.colExcluded}</th><th>{t.colFrom}</th></tr></thead>
              <tbody>
                {(rules ?? []).filter((r) => r.product_id === p.id).map((r) => (
                  <tr key={r.id}>
                    <td>{r.kind}</td>
                    <td>
                      {r.label}
                      {r.label_en && <div className="label" lang="en">{r.label_en}</div>}
                    </td>
                    <td>{r.rate != null ? `${Number(r.rate) * 100}%` : "—"}</td>
                    <td>{r.once ? t.once : r.period_months ? t.months(r.period_months) : t.noPeriod}</td>
                    <td>{(r.excluded_plans ?? []).join(", ") || "—"}</td>
                    <td>{r.effective_from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary>{t.addRule}</summary>
              <form action="/api/admin/rules/" method="post" className="stack">
                <input type="hidden" name="product_id" value={p.id} />
                <label>
                  {t.kind}
                  <select name="kind" defaultValue="monthly_rate">
                    <option value="monthly_rate">{t.kindMonthly}</option>
                    <option value="service_rate">{t.kindService}</option>
                    <option value="fixed">{t.kindFixed}</option>
                  </select>
                </label>
                <label>{t.label}<input name="label" required /></label>
                <label>{t.labelEn}<input name="label_en" lang="en" /></label>
                <label>{t.ratePercent}<input name="rate_percent" type="number" step="0.01" /></label>
                <label>{t.fixedAmount}<input name="fixed_amount" type="number" /></label>
                <label>{t.fixedMonths}<input name="fixed_months" type="number" step="0.5" /></label>
                <label>{t.periodMonths}<input name="period_months" type="number" /></label>
                <label className="check"><input type="checkbox" name="once" /> {t.onceCheck}</label>
                <label>{t.excluded}<input name="excluded_plans" placeholder="prepaid,fuel,option" /></label>
                <label>{t.effectiveFrom}<input name="effective_from" type="date" /></label>
                <button type="submit">{t.addRuleSubmit}</button>
              </form>
            </details>

            <details>
              <summary>{t.editKit}</summary>
              <form action="/api/admin/kits/" method="post" className="stack">
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="lang" value="ja" />
                <label>{t.tagline}<textarea name="tagline" rows={3} defaultValue={kit?.tagline ?? ""} /></label>
                <label>{t.forward}<textarea name="forward_message" rows={6} defaultValue={kit?.forward_message ?? ""} /></label>
                <label>{t.fit}<textarea name="fit" rows={3} defaultValue={kit?.fit ?? ""} /></label>
                <label>{t.pricing}<textarea name="pricing" rows={4} defaultValue={kit?.pricing ?? ""} /></label>
                <label>{t.materials}<textarea name="materials" rows={3} defaultValue={pairs(kit?.materials as never, "title", "url")} /></label>
                <label>{t.screens}<textarea name="screens" rows={3} defaultValue={pairs(kit?.screens as never, "title", "url")} /></label>
                <label>{t.faq}<textarea name="faq" rows={5} defaultValue={pairs(kit?.faq as never, "q", "a")} /></label>
                <button type="submit">{t.saveKit}</button>
              </form>
            </details>

            <details>
              <summary>{t.editKitEn}</summary>
              <p className="label">{t.kitEnNote}</p>
              <form action="/api/admin/kits/" method="post" className="stack" lang="en">
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="lang" value="en" />
                <label>{t.tagline}<textarea name="tagline" rows={3} defaultValue={kitEn?.tagline ?? ""} /></label>
                <label>{t.forward}<textarea name="forward_message" rows={6} defaultValue={kitEn?.forward_message ?? ""} /></label>
                <label>{t.fit}<textarea name="fit" rows={3} defaultValue={kitEn?.fit ?? ""} /></label>
                <label>{t.pricing}<textarea name="pricing" rows={4} defaultValue={kitEn?.pricing ?? ""} /></label>
                <label>{t.materials}<textarea name="materials" rows={3} defaultValue={pairs(kitEn?.materials, "title", "url")} /></label>
                <label>{t.screens}<textarea name="screens" rows={3} defaultValue={pairs(kitEn?.screens, "title", "url")} /></label>
                <label>{t.faq}<textarea name="faq" rows={5} defaultValue={pairs(kitEn?.faq, "q", "a")} /></label>
                <button type="submit">{t.saveKit}</button>
              </form>
            </details>
          </section>
        );
      })}

      <section className="card narrow">
        <h2>{t.addProduct}</h2>
        <form action="/api/admin/products/" method="post" className="stack">
          <input type="hidden" name="action" value="create" />
          <label>{t.slug}<input name="slug" required pattern="[a-z0-9-]+" /></label>
          <label>{t.name}<input name="name" required /></label>
          <label>
            {t.status}
            <select name="status" defaultValue="hidden">{statusOptions}</select>
          </label>
          <label>{t.destination}<input name="destination_url" type="url" /></label>
          <button type="submit">{t.add}</button>
        </form>
      </section>
    </AdminFrame>
  );
}
