import type { ProductCard } from "./queries";
import type { Locale } from "./i18n";

export const REVENUE_EDITION_ORDER = [
  "b2b",
  "contractor",
  "reseller",
  "b2c",
] as const;
export type RevenueEdition = (typeof REVENUE_EDITION_ORDER)[number];

type EditionInfo = {
  name: string;
  label: string;
  audience: string;
  description: string;
  fit: string;
  url: string;
};

export const REVENUE_EDITIONS: Record<RevenueEdition, EditionInfo> = {
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
};

// 英語（consilegy.com/en/crm/ の各エディションのページに合わせる）
export const REVENUE_EDITIONS_EN: Record<RevenueEdition, EditionInfo> = {
  b2b: {
    name: "Revenue CRM — B2B sales",
    label: "B2B sales edition",
    audience: "For B2B sales teams",
    description:
      "Prospects, deals, and orders in one place. For companies that want to keep track of deal progress and follow-up.",
    fit: "Sales teams that want to manage prospects, deals, and orders together, and see each rep's follow-up and the progress of every deal.",
    url: "https://consilegy.com/en/crm/",
  },
  contractor: {
    name: "Revenue CRM — Agencies & contract work",
    label: "agency & contract work edition",
    audience: "For agencies, studios, and contract developers",
    description:
      "Projects, quotes, capacity, and delivery in one place. For companies that want to check when they can start before the quote goes out.",
    fit: "Contract developers, studios, and agencies that want projects, quotes, team capacity, and delivery in one place, and want to confirm when they can start before quoting.",
    url: "https://consilegy.com/en/crm/contractor/",
  },
  reseller: {
    name: "Revenue CRM — SaaS resellers",
    label: "SaaS reseller edition",
    audience: "For SaaS and license resellers",
    description:
      "Customer contracts, renewals, and recurring revenue in one place. For resellers that want to catch missed renewals and churn risk early.",
    fit: "Resellers of SaaS and licenses that want to manage each customer's renewals and recurring revenue, and get ahead of upsells and renewal work.",
    url: "https://consilegy.com/en/crm/reseller/",
  },
  b2c: {
    name: "Revenue CRM — Schools",
    label: "school edition",
    audience: "For classes and schools",
    description:
      "Student enrollment, lessons, and monthly fees in one place. For schools that want to organize contact with students and day-to-day running.",
    fit: "Classes and schools that want to manage enrollment, pauses and withdrawals, lesson records, and monthly fees together, and make handovers between teachers and contact with students smoother.",
    url: "https://consilegy.com/en/crm/school/",
  },
};

export function editionInfo(edition: RevenueEdition, locale: Locale = "ja"): EditionInfo {
  return (locale === "en" ? REVENUE_EDITIONS_EN : REVENUE_EDITIONS)[edition];
}

function isRevenueEdition(value?: string | null): value is RevenueEdition {
  return REVENUE_EDITION_ORDER.some((edition) => edition === value);
}

export function revenueEdition(value?: string | null): RevenueEdition {
  return isRevenueEdition(value) ? value : "b2b";
}

// Editions share the existing product ID and reward rules so previous referrals,
// signed product events and payment attribution continue to work.
export function productOffers(products: ProductCard[], locale: Locale = "ja") {
  return products.flatMap((product) => {
    const localized = {
      ...product,
      fit_summary: locale === "en" ? product.fit_summary_en || product.fit_summary : product.fit_summary,
      rules: product.rules.map((r) => ({
        kind: r.kind,
        label: locale === "en" ? r.label_en || r.label : r.label,
      })),
    };
    if (product.slug !== "revenue-crm") {
      return [
        {
          ...localized,
          key: product.id,
          edition: undefined as RevenueEdition | undefined,
          audience: "",
        },
      ];
    }
    return REVENUE_EDITION_ORDER.map((edition) => {
      const info = editionInfo(edition, locale);
      return {
        ...localized,
        key: `${product.id}-${edition}`,
        edition,
        name: info.name,
        audience: info.audience,
        fit_summary: info.description,
      };
    });
  });
}

export function productKitPath(slug: string, edition?: RevenueEdition) {
  const params = new URLSearchParams({ product: slug });
  if (edition) params.set("edition", edition);
  return `/my/products/?${params}`;
}

export function editionKit(edition: RevenueEdition, link: string, locale: Locale = "ja") {
  const info = editionInfo(edition, locale);
  if (locale === "en") {
    return {
      tagline: `${info.description}\n${link}`,
      forward_message: `I came across a service that might suit your work, so I'm passing it along.\n\nIt's the ${info.label} of Revenue CRM. ${info.description}\n\nYou can find the details here:\n${link}`,
      fit: info.fit,
      pricing:
        edition === "b2c"
          ? "Plans are based on the number of enrolled students. See the official school edition page for pricing and the free trial."
          : `See the official page for pricing and the free trial of the ${info.label}.`,
      materials: [{ title: `Features and pricing of the ${info.label}`, url: info.url }],
      screens: [] as { title: string; url: string }[],
      faq: [{ q: `Who is the ${info.label} a good fit for?`, a: info.fit }],
    };
  }
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

// 紹介リンクの行き先。英語の紹介者のリンク（lang=en）は consilegy.com/en/ の同じページへ
export function editionDestination(
  slug: string,
  destination: string,
  edition?: string | null,
  lang?: string | null,
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
  url.pathname = new URL(editionInfo(edition, lang === "en" ? "en" : "ja").url).pathname;
  url.hash = "";
  return url.toString();
}
