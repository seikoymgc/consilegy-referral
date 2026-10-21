import { connection } from "next/server";
import { currentPartner } from "@/lib/auth";
import { listProducts } from "@/lib/queries";
import { Landing } from "@/components/Landing";

export const instant = false;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; withdrawn?: string }>;
}) {
  await connection(); // 製品の一覧は毎回DBから読む
  const [{ error, withdrawn }, partner, products] = await Promise.all([
    searchParams,
    currentPartner(),
    listProducts(),
  ]);
  return (
    <Landing locale="ja" partner={partner} products={products} error={error} withdrawn={withdrawn} />
  );
}
