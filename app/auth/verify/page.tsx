import { Header } from "@/components/Header";
import { AutoSubmit } from "@/components/AutoSubmit";

export const instant = false;

// メールのリンクを開いた画面。開くとそのままマイページへ進む（自動で動かないときだけボタンを押してもらう）
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
          <form id="verify-form" action="/api/auth/verify/" method="post" className="card stack">
            <input type="hidden" name="token" value={token} />
            <p>マイページに移動しています…</p>
            <p className="label">切り替わらないときは、下のボタンを押してください。</p>
            <button type="submit">マイページへ</button>
            <AutoSubmit formId="verify-form" />
          </form>
        ) : (
          <p className="alert error">リンクが正しくありません。<a href="/login/">もう一度ログインリンクを送る</a></p>
        )}
      </main>
    </>
  );
}
