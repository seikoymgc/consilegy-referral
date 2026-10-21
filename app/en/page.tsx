import type { Metadata } from "next";
import { connection } from "next/server";
import { currentPartner } from "@/lib/auth";
import { listProducts } from "@/lib/queries";
import { messages } from "@/lib/i18n";
import { Landing } from "@/components/Landing";

export const instant = false;

export const metadata: Metadata = {
  title: messages("en").meta.title,
  description: messages("en").meta.description,
  alternates: { languages: { ja: "/", en: "/en/" } },
};

// 英語の案内・申込ページ
export default async function HomeEn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; withdrawn?: string }>;
}) {
  await connection();
  const [{ error, withdrawn }, partner, products] = await Promise.all([
    searchParams,
    currentPartner(),
    listProducts(),
  ]);
  return (
    <Landing locale="en" partner={partner} products={products} error={error} withdrawn={withdrawn} />
  );
}
