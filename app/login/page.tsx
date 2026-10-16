import { Header } from "@/components/Header";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; expired?: string }>;
}) {
  const { sent, expired } = await searchParams;
  return (
    <>
      <Header partner={null} />
      <main className="narrow">
        <h1>ログイン</h1>
        {sent && (
          <p className="alert ok">
            ご登録のメールアドレスにログインリンクを送りました。メールのリンクを開いてください（有効期限15分）。
          </p>
        )}
        {expired && (
          <p className="alert error">ログインリンクの有効期限が切れたか、すでに使われています。もう一度お送りします。</p>
        )}
        <form action="/api/login/" method="post" className="card stack">
          <label>
            メールアドレス
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <button type="submit">ログインリンクを送る</button>
        </form>
        <p>まだ登録していない方は <a href="/#signup">紹介パートナーに申し込む</a></p>
      </main>
    </>
  );
}
