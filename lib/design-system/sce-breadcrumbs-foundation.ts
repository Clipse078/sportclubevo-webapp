/**
 * SCE Design System — canonical breadcrumb visual foundation (DS-03).
 */
import { cn } from "@/lib/cn";

export const SCE_BREADCRUMBS_NAV_CLASS =
  "mb-4 flex min-w-0 items-center gap-1 sm:mb-4";

export const SCE_BREADCRUMBS_LIST_CLASS =
  "flex min-w-0 flex-wrap items-center gap-1";

export const SCE_BREADCRUMBS_SEPARATOR_CLASS =
  "h-3.5 w-3.5 shrink-0 text-[var(--sce-color-text-muted)]";

export const SCE_BREADCRUMBS_LINK_CLASS =
  "truncate text-xs font-medium text-[var(--sce-color-text-secondary)] transition-colors hover:text-[var(--sce-color-accent-primary)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sce-color-app-background)]";

export const SCE_BREADCRUMBS_CURRENT_CLASS =
  "truncate text-xs font-medium text-[var(--sce-color-text-primary)]";

export const SCE_BREADCRUMBS_COLLAPSED_ANCESTOR_CLASS =
  "truncate text-xs font-medium text-[var(--sce-color-text-secondary)]";

export function sceBreadcrumbAncestorClassName(isCurrent: boolean): string {
  return cn(
    "truncate text-xs font-medium",
    isCurrent
      ? SCE_BREADCRUMBS_CURRENT_CLASS
      : "text-[var(--sce-color-text-secondary)]",
  );
}

/** Mobile back row — parent context link above collapsed trail. */
export const SCE_BREADCRUMBS_MOBILE_BACK_CLASS =
  "mb-2 inline-flex min-w-0 max-w-full items-center gap-1 text-xs font-medium text-[var(--sce-color-text-secondary)] transition-colors hover:text-[var(--sce-color-accent-primary)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-focus-ring-color)] sm:hidden";
