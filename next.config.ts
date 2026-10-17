import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // 設計書のURL（/login/ /my/ など）に合わせて末尾スラッシュあり
  trailingSlash: true,
  // 支払通知書PDFの日本語フォントを関数に同梱する
  outputFileTracingIncludes: {
    "/api/payouts/*/statement": ["./assets/fonts/**"],
    "/api/admin/payouts": ["./assets/fonts/**"],
  },
};

export default nextConfig;
