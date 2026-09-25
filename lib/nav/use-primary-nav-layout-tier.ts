"use client";

import { useSyncExternalStore } from "react";

export type PrimaryNavLayoutTier = "mobile" | "tablet" | "laptop" | "desktop";

const QUERIES: Array<{ tier: PrimaryNavLayoutTier; query: string }> = [
  { tier: "mobile", query: "(max-width: 767px)" },
  { tier: "tablet", query: "(min-width: 768px) and (max-width: 1023px)" },
  { tier: "laptop", query: "(min-width: 1024px) and (max-width: 1279px)" },
  { tier: "desktop", query: "(min-width: 1280px)" },
];

function getTier(): PrimaryNavLayoutTier {
  if (typeof window === "undefined") return "desktop";
  for (const { tier, query } of QUERIES) {
    if (window.matchMedia(query).matches) return tier;
  }
  return "desktop";
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mqls = QUERIES.map(({ query }) => window.matchMedia(query));
  for (const mql of mqls) {
    mql.addEventListener("change", onStoreChange);
  }
  return () => {
    for (const mql of mqls) {
      mql.removeEventListener("change", onStoreChange);
    }
  };
}

export function maxInlineDomainsForTier(tier: PrimaryNavLayoutTier): number {
  switch (tier) {
    case "desktop":
      return 7;
    case "laptop":
      return 5;
    case "tablet":
      return 4;
    default:
      return 0;
  }
}

export function usePrimaryNavLayoutTier(): PrimaryNavLayoutTier {
  return useSyncExternalStore(subscribe, getTier, () => "desktop");
}
