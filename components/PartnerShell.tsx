import Link from "next/link";
import type { ReactNode } from "react";
import type { Partner } from "@/lib/auth";
import { localePath, messages } from "@/lib/i18n";
import { Header, MyNav } from "./Header";

export function PartnerShell({
  partner,
  current,
  title,
  description,
  action,
  children,
}: {
  partner: Partner;
  current: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const t = messages(partner.locale);
  return (
    <div className="partner-app" lang={partner.locale}>
      <Header partner={partner} locale={partner.locale} back={current} />
      <div className="partner-shell">
        <aside className="partner-sidebar">
          <div className="sidebar-identity">
            <span className="partner-avatar" aria-hidden="true">
              {partner.name.slice(0, 1)}
            </span>
            <div>
              <strong>{t.shell.honorific(partner.name)}</strong>
              <span>{t.shell.role}</span>
            </div>
          </div>
          <p className="sidebar-label">WORKSPACE</p>
          <MyNav current={current} locale={partner.locale} />
          <div className="sidebar-help">
            <span aria-hidden="true">↗</span>
            <strong>{t.shell.helpTitle}</strong>
            <p>{t.shell.helpText}</p>
            <Link href="/my/products/">{t.shell.helpLink}</Link>
          </div>
          <form action="/api/logout/" method="post" className="sidebar-logout">
            <button type="submit" className="link">
              {t.shell.logout} <span aria-hidden="true">↗</span>
            </button>
          </form>
        </aside>
        <main className="workspace-main" id="workspace-content">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">CONSILEGY PARTNER WORKSPACE</p>
              <h1>{title}</h1>
              <p className="workspace-description">{description}</p>
            </div>
            {action && <div className="workspace-action">{action}</div>}
          </div>
          {children}
          <footer className="workspace-footer">
            <span>{t.brand.service}</span>
            <Link href={`${localePath(partner.locale, "/")}#rules`}>{t.shell.footerRules}</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-empty">
      <span className="empty-symbol" aria-hidden="true">
        ↗
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function StatusBadge({
  status,
  children,
}: {
  status: string;
  children: ReactNode;
}) {
  const tone = ["paid", "paying", "confirmed"].includes(status)
    ? "success"
    : [
          "rejected",
          "cancelled",
          "canceled",
          "expired",
          "reversed",
          "refunded",
          "existing_contact",
          "out_of_scope",
          "ended",
          "offset",
        ].includes(status)
      ? "neutral"
      : "progress";
  return (
    <span className={`status-badge status-${tone}`}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}
