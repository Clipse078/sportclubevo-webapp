/**
 * SCE-PERF-02 — canonical route-level loading copy and test ids per module.
 */

export type SceRouteModuleLoadingId =
  | "neutral"
  | "dashboard"
  | "admin"
  | "publishing"
  | "communication"
  | "planning";

export type SceRouteModuleLoadingSpec = {
  title: string;
  subtitle?: string;
  testId: string;
};

export const SCE_ROUTE_MODULE_LOADING: Record<
  SceRouteModuleLoadingId,
  SceRouteModuleLoadingSpec
> = {
  neutral: {
    title: "Modul wird geladen …",
    subtitle: "Bereich wird vorbereitet",
    testId: "sce-module-route-loading-neutral",
  },
  dashboard: {
    title: "Dashboard wird geladen …",
    subtitle: "Persönliche Übersicht wird vorbereitet",
    testId: "sce-module-route-loading-dashboard",
  },
  admin: {
    title: "Admin wird geladen …",
    subtitle: "Verwaltungsbereich wird vorbereitet",
    testId: "sce-module-route-loading-admin",
  },
  publishing: {
    title: "Publizieren wird geladen …",
    subtitle: "Website und Inhalte werden vorbereitet",
    testId: "sce-module-route-loading-publishing",
  },
  communication: {
    title: "Kommunikation wird geladen …",
    subtitle: "Kommunikationsbereich wird vorbereitet",
    testId: "sce-module-route-loading-communication",
  },
  planning: {
    title: "Planung wird geladen …",
    subtitle: "Planungsbereich wird vorbereitet",
    testId: "sce-module-route-loading-planning",
  },
};

/** Parent `/dashboard` segment fallback — must never use dashboard cockpit cards. */
export const SCE_DASHBOARD_SEGMENT_LOADING_MODULE: SceRouteModuleLoadingId = "neutral";
