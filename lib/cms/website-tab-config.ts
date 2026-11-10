import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import { CMS_ROUTES } from "@/lib/cms/routes";

export type WebsiteWorkspaceTabId =
  | "overview"
  | "news"
  | "pages"
  | "media"
  | "publishing"
  | "settings";

export function buildWebsiteWorkspaceTabNavigationConfig(): ContextTabNavigationConfig<WebsiteWorkspaceTabId> {
  const tabRoutes: Record<WebsiteWorkspaceTabId, string> = {
    overview: CMS_ROUTES.overview,
    news: CMS_ROUTES.news,
    pages: CMS_ROUTES.pages,
    media: CMS_ROUTES.media,
    publishing: CMS_ROUTES.publishing,
    settings: CMS_ROUTES.settings,
  };

  return {
    contextKind: "WEBSITE_CMS_WORKSPACE",
    defaultTab: "overview",
    tabRoutes,
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      if (pathname.startsWith("/dashboard/website/news")) {
        return visibleKeys.includes("news") ? "news" : "overview";
      }
      if (
        pathname.startsWith("/dashboard/website/pages") ||
        pathname.startsWith("/dashboard/website/homepage") ||
        pathname.startsWith("/dashboard/website/navigation") ||
        pathname.startsWith("/dashboard/website/blocks") ||
        pathname.startsWith("/dashboard/website/components")
      ) {
        return visibleKeys.includes("pages") ? "pages" : "overview";
      }
      if (pathname.startsWith("/dashboard/website/media")) {
        return visibleKeys.includes("media") ? "media" : "overview";
      }
      if (
        pathname.startsWith("/dashboard/website/publishing") ||
        pathname.startsWith("/dashboard/website/review") ||
        pathname.startsWith("/dashboard/website/editorial")
      ) {
        return visibleKeys.includes("publishing") ? "publishing" : "overview";
      }
      if (
        pathname.startsWith("/dashboard/website/settings") ||
        pathname.startsWith("/dashboard/website/design-system")
      ) {
        return visibleKeys.includes("settings") ? "settings" : "overview";
      }
      if (pathname.startsWith("/dashboard/website")) {
        return visibleKeys.includes("overview") ? "overview" : null;
      }
      return null;
    },
    tabs: [
      { key: "overview", label: "ÜBERSICHT", placement: "primary" },
      { key: "news", label: "NEWS", placement: "primary" },
      { key: "pages", label: "SEITEN", placement: "primary" },
      { key: "media", label: "MEDIEN", placement: "primary" },
      { key: "publishing", label: "PUBLIZIEREN", placement: "primary" },
      { key: "settings", label: "EINSTELLUNGEN", placement: "primary" },
    ],
  };
}
