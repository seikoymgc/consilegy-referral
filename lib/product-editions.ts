import type { ProductCard } from "./queries";

export type RevenueEdition = "b2b" | "b2c";

export const REVENUE_EDITIONS = {
  b2b: {
    name: "Revenue CRM — B2B",
    audience: "法人営業向け",
    description:
      "見込み客から商談・受注までをひとつに。案件の進捗やフォローを管理したい会社に。",
    url: "https://consilegy.com/crm/",
  },
  b2c: {
    name: "Revenue CRM — B2C",
    audience: "教室・スクール向け",
    description:
      "生徒の在籍・レッスン・月謝をひとつに。生徒への連絡や教室運営を整えたいスクールに。",
    url: "https://consilegy.com/crm/school/",
  },
} as const;

export function revenueEdition(value?: string | null): RevenueEdition {
  return value === "b2c" ? "b2c" : "b2b";
}

// Both editions belong to the same product and reward rules. Keep its database ID
// and event identifier intact so existing referrals and payment attribution work.
export function productOffers(products: ProductCard[]) {
  return products.flatMap((product) => {
    if (product.slug !== "revenue-crm") {
      return [
        {
          ...product,
          key: product.id,
          edition: undefined as RevenueEdition | undefined,
          audience: "",
        },
      ];
    }
    return (["b2b", "b2c"] as const).map((edition) => ({
      ...product,
      key: `${product.id}-${edition}`,
      edition,
      name: REVENUE_EDITIONS[edition].name,
      audience: REVENUE_EDITIONS[edition].audience,
      fit_summary: REVENUE_EDITIONS[edition].description,
    }));
  });
}

export function productKitPath(slug: string, edition?: RevenueEdition) {
  const params = new URLSearchParams({ product: slug });
  if (edition) params.set("edition", edition);
  return `/my/products/?${params}`;
}

export function editionDestination(
  slug: string,
  destination: string,
  edition?: string | null,
) {
  if (slug !== "revenue-crm" || (edition !== "b2b" && edition !== "b2c"))
    return destination;
  const url = new URL(destination);
  // Edition routing only applies to the official product pages. Preserve custom
  // destinations configured by the operator, including their query parameters.
  if (url.origin !== "https://consilegy.com") return destination;
  url.pathname = edition === "b2c" ? "/crm/school/" : "/crm/";
  url.hash = "";
  return url.toString();
}
