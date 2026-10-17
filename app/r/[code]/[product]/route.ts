import { NextResponse } from "next/server";
import { db, operatorId } from "@/lib/db";
import { editionDestination } from "@/lib/product-editions";

const REF_COOKIE = "cns_partner_ref"; // Revenue CRMの既契約者向け「crm_ref」とは別

// 紹介リンク：/r/紹介コード/製品
// consilegy.com 全体（製品のサブドメインを含む）で読めるCookieに、紹介コードと30日の期限を入れて製品へ移る
export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string; product: string }> },
) {
  const { code, product: slug } = await ctx.params;
  const op = await operatorId();

  const [{ data: product }, { data: partner }] = await Promise.all([
    db()
      .from("products")
      .select("status, destination_url")
      .eq("operator_id", op)
      .eq("slug", slug)
      .maybeSingle(),
    db()
      .from("partners")
      .select("status")
      .eq("operator_id", op)
      .eq("referral_code", code)
      .maybeSingle(),
  ]);

  // 準備中・非公開の製品、無効な紹介コードはトップへ
  if (!product || product.status !== "public" || !product.destination_url) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }
  const res = NextResponse.redirect(
    editionDestination(
      slug,
      product.destination_url,
      new URL(req.url).searchParams.get("edition"),
    ),
    302,
  );
  if (partner?.status === "active") {
    const expires = new Date(Date.now() + 30 * 86400 * 1000);
    res.cookies.set(
      REF_COOKIE,
      JSON.stringify({ code, exp: expires.toISOString() }),
      {
        domain: process.env.REF_COOKIE_DOMAIN ?? undefined, // 本番は ".consilegy.com"
        path: "/",
        expires,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false, // 製品側（別サブドメイン）が申込時に読むため
      },
    );
  }
  return res;
}
