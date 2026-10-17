import type { ProductCard } from "./queries";

export const REVENUE_EDITION_ORDER = [
  "b2b",
  "contractor",
  "reseller",
  "b2c",
] as const;
export type RevenueEdition = (typeof REVENUE_EDITION_ORDER)[number];

export const REVENUE_EDITIONS = {
  b2b: {
    name: "Revenue CRM — 法人営業",
    label: "法人営業版",
    audience: "B2B・法人営業向け",
    description:
      "見込み客から商談・受注までをひとつに。案件の進捗やフォローを管理したい会社に。",
    fit: "見込み客・商談・受注をまとめて管理したい法人営業の組織。担当者ごとのフォローや案件の進捗を見えるようにしたい会社に。",
    url: "https://consilegy.com/crm/",
  },
  contractor: {
    name: "Revenue CRM — 受託開発",
    label: "受託開発版",
    audience: "B2B・支援会社・制作会社向け",
    description:
      "案件・見積・稼働・納品をひとつに。着手できる時期や、受注後の工程まで見通したい会社に。",
    fit: "案件や見積、メンバーの稼働、納品までをまとめたい受託開発・制作・支援会社。見積前に着手時期を確かめたい方に。",
    url: "https://consilegy.com/crm/contractor/",
  },
  reseller: {
    name: "Revenue CRM — 代理店",
    label: "代理店版",
    audience: "B2B・SaaSリセラー向け",
    description:
      "顧客の契約・更新・継続収益をひとつに。更新の抜け漏れや解約リスクを早めにつかみたい代理店に。",
    fit: "SaaSやライセンスを販売する代理店・リセラー。顧客ごとの契約更新や継続収益を管理し、追加提案や更新対応を整えたい会社に。",
    url: "https://consilegy.com/crm/reseller/",
  },
  b2c: {
    name: "Revenue CRM — スクール",
    label: "スクール版",
    audience: "B2C・教室・スクール向け",
    description:
      "生徒の在籍・レッスン・月謝をひとつに。生徒への連絡や教室運営を整えたいスクールに。",
    fit: "生徒の在籍・休会・退会、レッスン記録、月謝をまとめて管理したい教室・スクール。講師間の引き継ぎや、生徒への連絡を整えたい方に。",
    url: "https://consilegy.com/crm/school/",
  },
} as const;

function isRevenueEdition(value?: string | null): value is RevenueEdition {
  return REVENUE_EDITION_ORDER.some((edition) => edition === value);
}

export function revenueEdition(value?: string | null): RevenueEdition {
  return isRevenueEdition(value) ? value : "b2b";
}

// Editions share the existing product ID and reward rules so previous referrals,
// signed product events and payment attribution continue to work.
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
    return REVENUE_EDITION_ORDER.map((edition) => ({
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

export function editionKit(edition: RevenueEdition, link: string) {
  const info = REVENUE_EDITIONS[edition];
  const materials: { title: string; url: string }[] = [
    { title: `${info.label}の機能・料金を見る`, url: info.url },
  ];
  if (edition === "b2c") {
    materials.push({
      title: "スクール版の紹介資料",
      url: "https://consilegy.com/crm/school/download/",
    });
  }
  return {
    tagline: `${info.description}\n${link}`,
    forward_message: `お仕事に合いそうなサービスがあったので、ご紹介します。\n\nRevenue CRMの${info.label}です。${info.description}\n\n詳しくはこちらをご覧ください。\n${link}`,
    fit: info.fit,
    pricing:
      edition === "b2c"
        ? "在籍中の生徒数に応じたプランです。料金と無料トライアルの詳細は、スクール版の公式ページでご確認ください。"
        : `${info.label}の料金と無料トライアルの詳細は、公式ページでご確認ください。`,
    materials,
    screens: [] as { title: string; url: string }[],
    faq: [{ q: `どんな方に${info.label}が合いますか？`, a: info.fit }],
  };
}

export function editionDestination(
  slug: string,
  destination: string,
  edition?: string | null,
) {
  if (slug !== "revenue-crm" || !isRevenueEdition(edition)) return destination;
  const url = new URL(destination);
  const sharedDemos =
    url.origin === "https://crm.consilegy.com" &&
    /^\/demos\/?$/.test(url.pathname);
  // Respect custom operator destinations; split the official pages/demo picker.
  if (url.origin !== "https://consilegy.com" && !sharedDemos)
    return destination;
  url.hostname = "consilegy.com";
  url.pathname = new URL(REVENUE_EDITIONS[edition].url).pathname;
  url.hash = "";
  return url.toString();
}
