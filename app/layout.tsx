import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consilegy 紹介パートナー",
  description: "Consilegyの製品を紹介して報酬を受け取る紹介パートナー向けページ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
