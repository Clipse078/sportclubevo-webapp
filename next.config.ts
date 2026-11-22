import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildSecurityHeaderRules } from "./lib/security/headers";

const withNextIntl = createNextIntlPlugin();

export const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    "yjs",
    "@tiptap/y-tiptap",
    "@tiptap/extension-collaboration",
    "@tiptap/extension-collaboration-caret",
  ],
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return buildSecurityHeaderRules(process.env);
  },
};

export default withNextIntl(nextConfig);
