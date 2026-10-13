import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type PersonQuickViewTabId = "uebersicht" | "rollen" | "zugriff";

export function buildPersonQuickViewTabNavigationConfig(): ContextTabNavigationConfig<PersonQuickViewTabId> {
  return {
    contextKind: "PERSON_QUICK_VIEW",
    defaultTab: "uebersicht",
    tabs: [
      { key: "uebersicht", label: "Übersicht", placement: "primary" },
      { key: "rollen", label: "Rollen", placement: "primary" },
      { key: "zugriff", label: "Zugriff", placement: "primary" },
    ],
  };
}

export function buildPersonDetailZugriffHref(userId: string): string {
  return `/dashboard/admin/users/${encodeURIComponent(userId)}?tab=zugriff`;
}

export function buildPersonDetailAdminHref(userId: string): string {
  return `/dashboard/admin/users/${encodeURIComponent(userId)}`;
}
