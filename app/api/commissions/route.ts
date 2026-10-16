import { NextResponse } from "next/server";
import { apiPartner } from "@/lib/guard";
import { listCommissions } from "@/lib/queries";

export async function GET(req: Request) {
  const p = await apiPartner(req);
  if (p instanceof NextResponse) return p;
  return NextResponse.json({ commissions: await listCommissions(p.id) });
}
