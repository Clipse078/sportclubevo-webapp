import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

/**
 * CMS feature / quick-access keys → approved SCE masters where semantics are exact.
 * Keys without an approved master are omitted (see MISSING_SCE_SEMANTICS).
 */
export const CMS_FEATURE_SCE_ICON_BY_KEY: Partial<Record<string, SceIconRegistryName>> = {
  news: "news",
  homepage_builder: "homepage-builder",
  pages: "page",
  page_builder: "page",
  media: "media-library",
  blocks: "block-library",
  navigation: "website-navigation",
  publishing_queue: "publish",
  scheduled: "publish",
  preview: "publish",
  approval_workflow: "approval",
  permissions: "roles-access",
  website_settings: "settings",
  design_system: "settings",
  seo: "analytics",
  seo_global: "analytics",
  four_eyes: "approval",
  review_workflow: "approval",
};

export function getCmsFeatureSceIconName(featureKey: string): SceIconRegistryName | null {
  return CMS_FEATURE_SCE_ICON_BY_KEY[featureKey] ?? null;
}

/** CMS KPI / Schnellzugriff surface keys used on the overview page. */
export const CMS_OVERVIEW_SURFACE_SCE_ICON: Record<string, SceIconRegistryName> = {
  "cms.kpi.news": "news",
  "cms.kpi.news-review": "attention",
  "cms.kpi.scheduled": "publish",
  "cms.quick.news": "news",
  "cms.quick.publishing": "publish",
  "cms.quick.settings": "settings",
  "cms.status.website-enabled": "website",
};
