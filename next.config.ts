import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_KAKAO_JS_KEY:
      process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "2983434411059e335a16f79d6ca52361",
  },
};

export default nextConfig;
