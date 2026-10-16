import { NextResponse, connection } from "next/server";
import { listProducts } from "@/lib/queries";

export async function GET() {
  await connection(); // ビルド時に固定せず、毎回DBから読む
  return NextResponse.json({ products: await listProducts() });
}
