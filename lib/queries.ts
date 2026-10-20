import { appUrl, db, operatorId } from "./db";
import {
  editionInfo,
  editionKit,
  revenueEdition,
  type RevenueEdition,
} from "./product-editions";
import type { Locale } from "./i18n";

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  status: "public" | "preparing";
  fit_summary: string | null;
  fit_summary_en: string | null;
  rules: { kind: string; label: string; label_en: string | null }[];
};

// 公開中・準備中の製品と報酬ルール（準備中はルールを返さない）
export async function listProducts(): Promise<ProductCard[]> {
  const op = await operatorId();
  const { data: products } = await db()
    .from("products")
    .select("id, slug, name, status, fit_summary, fit_summary_en, sort_order")
    .eq("operator_id", op)
    .in("status", ["public", "preparing"])
    .order("sort_order");
  const ids = (products ?? [])
    .filter((p) => p.status === "public")
    .map((p) => p.id);
  const { data: rules } = ids.length
    ? await db()
        .from("reward_rules")
        .select("product_id, kind, label, label_en")
        .in("product_id", ids)
    : { data: [] as { product_id: string; kind: string; label: string; label_en: string | null }[] };
  return (products ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    status: p.status,
    fit_summary: p.fit_summary,
    fit_summary_en: p.fit_summary_en,
    rules:
      p.status === "public"
        ? (rules ?? [])
            .filter((r) => r.product_id === p.id)
            .map((r) => ({ kind: r.kind, label: r.label, label_en: r.label_en }))
        : [],
  }));
}

// 英語の紹介者のリンクには lang=en を付け、行き先を consilegy.com/en/ のページにする
export function referralLink(
  code: string,
  productSlug: string,
  edition?: RevenueEdition,
  locale: Locale = "ja",
): string {
  const params = new URLSearchParams();
  if (productSlug === "revenue-crm" && edition) params.set("edition", edition);
  if (locale === "en") params.set("lang", "en");
  const qs = params.toString();
  return `${appUrl()}/r/${code}/${productSlug}${qs ? `?${qs}` : ""}`;
}

type KitContent = {
  tagline?: string | null;
  forward_message?: string | null;
  fit?: string | null;
  pricing?: string | null;
  materials?: { title: string; url: string }[];
  screens?: { title: string; url: string }[];
  faq?: { q: string; a: string }[];
};

// 英語のキットは content_en の項目を使い、空の項目は日本語のキットのまま
function localizeKit(kit: KitContent | null, en: KitContent | null, locale: Locale): KitContent | null {
  if (locale !== "en" || !en) return kit;
  const pick = <T,>(a: T | null | undefined, b: T | null | undefined) =>
    (Array.isArray(a) ? a.length > 0 : !!a) ? a : b;
  return {
    tagline: pick(en.tagline, kit?.tagline),
    forward_message: pick(en.forward_message, kit?.forward_message),
    fit: pick(en.fit, kit?.fit),
    pricing: pick(en.pricing, kit?.pricing),
    materials: pick(en.materials, kit?.materials) ?? [],
    screens: pick(en.screens, kit?.screens) ?? [],
    faq: pick(en.faq, kit?.faq) ?? [],
  };
}

export async function getKit(
  partnerCode: string,
  productSlug: string,
  requestedEdition?: string,
  locale: Locale = "ja",
) {
  const op = await operatorId();
  const { data: product } = await db()
    .from("products")
    .select("id, slug, name, status")
    .eq("operator_id", op)
    .eq("slug", productSlug)
    .maybeSingle();
  if (!product || product.status !== "public") return null;
  const { data: kitRow } = await db()
    .from("product_kits")
    .select("tagline, forward_message, materials, screens, fit, pricing, faq, content_en")
    .eq("product_id", product.id)
    .maybeSingle();
  const kit = localizeKit(
    kitRow as KitContent | null,
    (kitRow?.content_en ?? null) as KitContent | null,
    locale,
  );
  const edition =
    product.slug === "revenue-crm"
      ? revenueEdition(requestedEdition)
      : undefined;
  const link = referralLink(partnerCode, product.slug, edition, locale);
  const fill = (s: string | null | undefined) =>
    (s ?? "").replaceAll("{link}", link);
  const baseKit = {
    tagline: fill(kit?.tagline),
    forward_message: fill(kit?.forward_message),
    fit: kit?.fit ?? "",
    pricing: kit?.pricing ?? "",
    materials: (kit?.materials ?? []) as { title: string; url: string }[],
    screens: (kit?.screens ?? []) as { title: string; url: string }[],
    faq: (kit?.faq ?? []) as { q: string; a: string }[],
  };
  const specificKit = edition ? editionKit(edition, link, locale) : undefined;
  // Keep the operator-managed B2B kit; provide targeted text and materials for
  // the other editions rather than reusing general sales copy.
  const content = specificKit
    ? edition === "b2b"
      ? {
          ...baseKit,
          tagline: baseKit.tagline || specificKit.tagline,
          forward_message:
            baseKit.forward_message || specificKit.forward_message,
          fit: baseKit.fit || specificKit.fit,
        }
      : specificKit
    : baseKit;
  return {
    product: edition
      ? { ...product, name: editionInfo(edition, locale).name }
      : product,
    edition,
    link,
    ...content,
  };
}

export async function listReferrals(partnerId: string, productSlug?: string) {
  let q = db()
    .from("referrals")
    .select(
      "id, company_name, status, created_at, accepted_at, confirmed_at, reward_period_end, channel, product_id, products(slug, name)",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (productSlug) {
    const { data: p } = await db()
      .from("products")
      .select("id")
      .eq("slug", productSlug)
      .maybeSingle();
    if (p) q = q.eq("product_id", p.id);
  }
  const { data: refs } = await q;
  const ids = (refs ?? []).map((r) => r.id);
  const { data: comms } = ids.length
    ? await db()
        .from("commissions")
        .select("referral_id, amount, status")
        .in("referral_id", ids)
    : { data: [] as { referral_id: string; amount: number; status: string }[] };
  return (refs ?? []).map((r) => ({
    ...r,
    product: r.products as unknown as { slug: string; name: string },
    reward_total: (comms ?? [])
      .filter(
        (c) =>
          c.referral_id === r.id && ["confirmed", "paid"].includes(c.status),
      )
      .reduce((s, c) => s + c.amount, 0),
  }));
}

export async function listCommissions(partnerId: string) {
  const { data } = await db()
    .from("commissions")
    .select(
      "id, kind, base_amount, rate, amount, status, confirmed_at, created_at, products(name), referrals(company_name)",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({
    ...c,
    product_name:
      (c.products as unknown as { name: string } | null)?.name ?? "",
    company_name:
      (c.referrals as unknown as { company_name: string } | null)
        ?.company_name ?? "",
  }));
}

export async function listPayouts(partnerId: string) {
  const { data } = await db()
    .from("payouts")
    .select("id, month, amount, status, paid_on, statement_number")
    .eq("partner_id", partnerId)
    .order("month", { ascending: false });
  return data ?? [];
}

export async function getSummary(partnerId: string) {
  const [refs, comms, payouts] = await Promise.all([
    listReferrals(partnerId),
    listCommissions(partnerId),
    listPayouts(partnerId),
  ]);
  const confirmedTotal = comms
    .filter((c) => ["confirmed", "paid"].includes(c.status))
    .reduce((s, c) => s + c.amount, 0);
  const unpaid = comms
    .filter((c) => c.status === "confirmed")
    .reduce((s, c) => s + c.amount, 0);
  const scheduled = payouts.filter((p) => p.status !== "paid");
  const scheduledTotal = scheduled.reduce((s, p) => s + p.amount, 0);

  const byProduct = new Map<
    string,
    { name: string; count: number; reward: number }
  >();
  for (const r of refs) {
    const e = byProduct.get(r.product.slug) ?? {
      name: r.product.name,
      count: 0,
      reward: 0,
    };
    e.count++;
    e.reward += r.reward_total;
    byProduct.set(r.product.slug, e);
  }

  return {
    referralCount: refs.length,
    inProgress: refs.filter((r) =>
      ["pending", "accepted", "confirmed"].includes(r.status),
    ).length,
    paying: refs.filter((r) => r.status === "paying").length,
    confirmedTotal,
    carryOver: Math.max(unpaid - scheduledTotal, 0),
    nextPayout: scheduled[0] ?? null,
    byProduct: Array.from(byProduct.entries()).map(([slug, v]) => ({
      slug,
      ...v,
    })),
    todos: [] as string[],
  };
}
