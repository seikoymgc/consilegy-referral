import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // 設計書のURL（/login/ /my/ など）に合わせて末尾スラッシュあり
  trailingSlash: true,
};

export default nextConfig;
