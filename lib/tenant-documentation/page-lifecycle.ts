import type { TenantDocumentationPage } from "@prisma/client";

export type TenantDocumentationPageLifecycleState =
  | "ACTIVE"
  | "ARCHIVED"
  | "TRASHED";

export function deriveTenantDocumentationPageLifecycle(
  page: Pick<TenantDocumentationPage, "archivedAt" | "trashedAt">,
): TenantDocumentationPageLifecycleState {
  if (page.trashedAt !== null) {
    return "TRASHED";
  }
  if (page.archivedAt !== null) {
    return "ARCHIVED";
  }
  return "ACTIVE";
}

/** Active tree, search, and default hub lists. */
export const TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE = {
  archivedAt: null,
  trashedAt: null,
} as const;

export const TENANT_DOCUMENTATION_ARCHIVED_PAGE_WHERE = {
  archivedAt: { not: null },
  trashedAt: null,
} as const;

export const TENANT_DOCUMENTATION_TRASHED_PAGE_WHERE = {
  trashedAt: { not: null },
} as const;