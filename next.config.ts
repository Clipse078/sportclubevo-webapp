import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildSecurityHeaderRules } from "./lib/security/headers";

const withNextIntl = createNextIntlPlugin();

/** Force a single Yjs ESM entry in browser bundles (avoids mjs+cjs double init). */
const YJS_BROWSER_ENTRY = path.join(process.cwd(), "node_modules/yjs/dist/yjs.mjs");

export const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    "yjs",
    "@tiptap/y-tiptap",
    "@tiptap/extension-collaboration",
    "@tiptap/extension-collaboration-caret",
  ],
  turbopack: {
    resolveAlias: {
      yjs: "./node_modules/yjs/dist/yjs.mjs",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        yjs: YJS_BROWSER_ENTRY,
      };
    }
    return config;
  },
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
