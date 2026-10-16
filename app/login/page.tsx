import { signIn, signUp } from "./actions";

// URLのエラー表示をサーバーで読むため、実行時に評価する
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="narrow">
      <h1>紹介パートナー</h1>

      {error && <p className="alert error">{error}</p>}
      {message && <p className="alert ok">{message}</p>}

      <form action={signIn} className="card stack">
        <h2>ログイン</h2>
        <label>
          メールアドレス
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          パスワード
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit">ログインする</button>
      </form>

      <form action={signUp} className="card stack">
        <h2>新規登録</h2>
        <label>
          お名前
          <input name="name" required />
        </label>
        <label>
          メールアドレス
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          パスワード（8文字以上）
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <button type="submit">登録する</button>
      </form>
    </main>
  );
}
