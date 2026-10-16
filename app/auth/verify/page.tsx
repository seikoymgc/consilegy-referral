import { Header } from "@/components/Header";

export const instant = false;

// メールのリンクを開いた画面。ボタンを押したときにだけトークンを使う
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <Header partner={null} />
      <main className="narrow">
        <h1>ログイン</h1>
        {token ? (
          <form action="/api/auth/verify/" method="post" className="card stack">
            <input type="hidden" name="token" value={token} />
            <p>下のボタンを押すと、マイページに入ります。</p>
            <button type="submit">ログインする</button>
          </form>
        ) : (
          <p className="alert error">リンクが正しくありません。<a href="/login/">もう一度ログインリンクを送る</a></p>
        )}
      </main>
    </>
  );
}
