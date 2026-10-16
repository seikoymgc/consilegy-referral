import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

// ログイン後のページはサーバーで待ってから表示する（Cache Components 対応）
export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("display_name, email")
    .maybeSingle();

  const { data: links } = await supabase
    .from("referral_links")
    .select("id, code, created_at")
    .order("created_at", { ascending: false });

  const { data: commissions } = await supabase
    .from("commissions")
    .select("amount, payout_status");

  const total = (commissions ?? []).reduce((sum, c) => sum + Number(c.amount), 0);
  const unpaid = (commissions ?? [])
    .filter((c) => c.payout_status !== "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

  return (
    <main>
      <header className="topbar">
        <strong>紹介パートナー</strong>
        <nav>
          <Link href="/dashboard">マイページ</Link>
          <Link href="/links">紹介リンク</Link>
          <form action={signOut}>
            <button type="submit" className="link">ログアウト</button>
          </form>
        </nav>
      </header>

      {!partner ? (
        <p className="alert error">
          パートナー情報が見つかりません。管理者に連絡してください。
        </p>
      ) : (
        <>
          <h1>{partner.display_name} さん</h1>

          <section className="grid">
            <div className="card">
              <p className="label">紹介リンク数</p>
              <p className="value">{links?.length ?? 0}</p>
            </div>
            <div className="card">
              <p className="label">報酬の合計</p>
              <p className="value">{yen(total)}</p>
            </div>
            <div className="card">
              <p className="label">未払いの報酬</p>
              <p className="value">{yen(unpaid)}</p>
            </div>
          </section>

          <section className="card">
            <h2>最近の紹介リンク</h2>
            {links && links.length > 0 ? (
              <ul className="plain">
                {links.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <code>{l.code}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>まだ紹介リンクがありません。<Link href="/links">紹介リンクを作る</Link></p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
