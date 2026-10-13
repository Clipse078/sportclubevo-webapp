/**
 * Canonical organiser crest URLs for SCE tournament fixtures and previews.
 * Served from /public so PO visual UAT sees real crest imagery (not broken remote placeholders).
 */
export const SCE_CANONICAL_TENANT_ORGANISER_CREST_URL = "/images/logos/fc-allschwil.png";

export const SCE_CANONICAL_EXTERNAL_ORGANISER_CREST_URL =
  "/images/logos/preview/fc-aesch.svg";

export const SCE_TOURNAMENT_FIXTURE_CREST_URLS = {
  tenant: SCE_CANONICAL_TENANT_ORGANISER_CREST_URL,
  external: SCE_CANONICAL_EXTERNAL_ORGANISER_CREST_URL,
} as const;
