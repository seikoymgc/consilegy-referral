import { NextResponse } from "next/server";
import { apiPartner } from "@/lib/guard";
import { getKit } from "@/lib/queries";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ product: string }> },
) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  const { product } = await ctx.params;
  const kit = await getKit(
    p.referral_code,
    product,
    new URL(req.url).searchParams.get("edition") ?? undefined,
  );
  if (!kit) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(kit);
}
