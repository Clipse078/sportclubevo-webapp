import type { PermissionKey } from "@/lib/permissions/permissions";

export type QuickAccessKind = "NAVIGATION" | "CREATE_ACTION";

export type QuickAccessCatalogEntry = {
  key: string;
  kind: QuickAccessKind;
  href: string;
  /** Sidebar label used for icon registry lookup. */
  iconLabel: string;
  messageKey: string;
  navItemKey?: string;
  catalogActionKey?: string;
  permissionKeys: PermissionKey[];
  defaultPriority: number;
};

export type DashboardQuickAccessItemDto = {
  key: string;
  kind: "navigate" | "create";
  label: string;
  href: string;
  iconLabel: string;
};

export type QuickAccessCatalogContext = {
  permissionKeys: PermissionKey[];
  navCapabilities: {
    personalActionsModule: boolean;
  };
};

export type QuickAccessResolveInput = QuickAccessCatalogContext & {
  tenantId: string;
  userId: string;
  /** When true, include entries only authorized for the actor (default). */
  filterAuthorized?: boolean;
};

export type StoredQuickAccessPreference = {
  pinnedKeys: string[];
  hasStoredPreference: boolean;
};
