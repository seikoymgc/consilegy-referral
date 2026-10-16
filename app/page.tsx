import Link from "next/link";

export default function Home() {
  return (
    <main className="narrow">
      <h1>Consilegy 紹介パートナー</h1>
      <p>
        Consilegyの製品を紹介すると、成約に応じて報酬を受け取れる仕組みです。
        紹介リンクを作って共有し、紹介の状況と報酬をマイページで確認できます。
      </p>
      <p>
        <Link href="/login" className="button">パートナーとしてログイン・登録</Link>
      </p>
    </main>
  );
}
