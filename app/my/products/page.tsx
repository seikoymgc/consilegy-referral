import { CopyButton } from "@/components/CopyButton";
import { PartnerShell } from "@/components/PartnerShell";
import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { getKit, listProducts } from "@/lib/queries";
import { messages } from "@/lib/i18n";

import {
  productOffers,
  productKitPath,
  revenueEdition,
} from "@/lib/product-editions";

export const instant = false;

export default async function MyProducts({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; edition?: string }>;
}) {
  const p = await requirePartner();
  const lc = p.locale;
  const t = messages(lc).products;
  const c = messages(lc).common;
  const [{ product, edition }, products] = await Promise.all([
    searchParams,
    listProducts(),
  ]);
  const selected = product ?? products.find((x) => x.status === "public")?.slug;
  const kit = selected
    ? await getKit(p.referral_code, selected, edition, lc)
    : null;
  const copyLabels = { copiedLabel: c.copied, failedLabel: c.copyFailed };

  return (
    <PartnerShell
      partner={p}
      current="/my/products/"
      title={t.title}
      description={t.description}
    >
      <nav className="tabs edition-picker" aria-label={t.pickerAria}>
        {productOffers(products, lc).map((x) =>
          x.status === "public" ? (
            <Link
              key={x.key}
              href={productKitPath(x.slug, x.edition)}
              aria-current={
                x.slug === selected &&
                (!x.edition || x.edition === revenueEdition(edition))
                  ? "page"
                  : undefined
              }
            >
              <span>{x.name}</span>
              <small>{x.audience || t.kitFallback}</small>
              <span className="edition-picker-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ) : (
            <span key={x.key} className="muted">
              {t.preparing(x.name)}
            </span>
          ),
        )}
      </nav>

      {!kit ? (
        <p className="alert error">{t.unavailable}</p>
      ) : (
        <>
          <div className="kit-selected-heading">
            <p className="eyebrow">YOUR REFERRAL KIT</p>
            <h2>{kit.product.name}</h2>
          </div>
          <div className="kit-content-grid">
            <section className="card referral-link-card">
              <h2>{t.linkTitle}</h2>
              <div className="referral-link-box">
                <code className="copy">{kit.link}</code>
                <CopyButton value={kit.link} label={t.copyLink} {...copyLabels} />
              </div>
              <p className="label">{t.linkNote}</p>
            </section>

            {kit.tagline && (
              <section className="card">
                <h2>{t.tagline}</h2>
                <p className="pre">{kit.tagline}</p>
              </section>
            )}
            {kit.forward_message && (
              <section className="card message-card">
                <div className="panel-heading">
                  <h2>{t.message}</h2>
                  <CopyButton value={kit.forward_message} label={t.copyMessage} {...copyLabels} />
                </div>
                <p className="pre">{kit.forward_message}</p>
              </section>
            )}
            {kit.fit && (
              <section className="card">
                <h2>{kit.edition === "b2c" ? t.fitSchool : t.fitCompany}</h2>
                <p className="pre">{kit.fit}</p>
              </section>
            )}
            {kit.pricing && (
              <section className="card">
                <h2>{t.pricing}</h2>
                <p className="pre">{kit.pricing}</p>
              </section>
            )}
            {(kit.materials.length > 0 || kit.screens.length > 0) && (
              <section className="card">
                <h2>{t.materials}</h2>
                <ul>
                  {[...kit.materials, ...kit.screens].map((m) => (
                    <li key={m.url}>
                      <a href={m.url} target="_blank" rel="noreferrer">
                        {m.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {kit.faq.length > 0 && (
              <section className="card">
                <h2>{t.faq}</h2>
                <dl>
                  {kit.faq.map((f) => (
                    <div key={f.q}>
                      <dt>{f.q}</dt>
                      <dd>{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <section className="card disclosure-card">
              <p className="eyebrow">FOR A CLEAR INTRODUCTION</p>
              <h2>{t.disclosureTitle}</h2>
              <p className="label">{t.disclosureLabel}</p>
              <p className="pre">{t.disclosure}</p>
              <CopyButton value={t.disclosure} label={t.copyDisclosure} {...copyLabels} />
            </section>
          </div>
        </>
      )}
    </PartnerShell>
  );
}
