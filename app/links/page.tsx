import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { createLink } from "./actions";

// ログイン後のページはサーバーで待ってから表示する（Cache Components 対応）
export const instant = false;

export default async function LinksPage() {
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("referral_links")
    .select("id, code, created_at")
    .order("created_at", { ascending: false });

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

      <h1>紹介リンク</h1>

      <section className="card">
        <form action={createLink}>
          <button type="submit">新しい紹介リンクを作る</button>
        </form>
      </section>

      <section className="card">
        {links && links.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>コード</th>
                <th>作成日</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td>
                    <code>{l.code}</code>
                  </td>
                  <td>{new Date(l.created_at).toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>まだ紹介リンクがありません。上のボタンから作ってください。</p>
        )}
      </section>
    </main>
  );
}
