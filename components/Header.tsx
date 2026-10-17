import Link from "next/link";
import type { Partner } from "@/lib/auth";

// ヘッダーには常に「ログイン」（ログイン中は「マイページ」）
export function Header({ partner }: { partner: Partner | null }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">Consilegy 紹介パートナー</Link>
      <nav>
        {partner ? (
          <>
            <Link href="/my/">マイページ</Link>
            {partner.role === "admin" && <Link href="/admin/">管理</Link>}
          </>
        ) : (
          <Link href="/login/">ログイン</Link>
        )}
      </nav>
    </header>
  );
}

export function MyNav({ current }: { current: string }) {
  const items = [
    ["/my/", "ホーム"],
    ["/my/products/", "紹介する"],
    ["/my/referrals/", "紹介案件"],
    ["/my/rewards/", "報酬・支払い"],
    ["/my/settings/", "登録情報"],
  ];
  return (
    <nav className="subnav">
      {items.map(([href, label]) => (
        <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

export function AdminNav({ current }: { current: string }) {
  const items = [
    ["/admin/", "概要"],
    ["/admin/products/", "製品と報酬ルール"],
    ["/admin/partners/", "紹介者"],
    ["/admin/referrals/", "紹介案件"],
    ["/admin/payouts/", "支払い"],
  ];
  return (
    <nav className="subnav">
      {items.map(([href, label]) => (
        <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

export function Notice({ params }: { params: { error?: string; saved?: string } }) {
  return (
    <>
      {params.error && <p className="alert error">{params.error}</p>}
      {params.saved && <p className="alert ok">{params.saved === "1" ? "保存しました。" : params.saved}</p>}
    </>
  );
}
