/**
 * Context tab visual foundation (DS-02) — token-backed class recipes for SceContextTabs.
 * Product-wide tab migration: SCE-DESIGN-SYSTEM-03.
 */
import { cn } from "@/lib/cn";

export const SCE_CONTEXT_TABS_NAV_CLASS =
  "flex min-w-0 items-stretch gap-2 border-b border-[var(--sce-color-border-standard)] sm:gap-3";

const SCE_CONTEXT_TAB_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sce-color-app-background)]";

export function sceContextTabClassName(isActive: boolean): string {
  return cn(
    "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4",
    SCE_CONTEXT_TAB_FOCUS,
    isActive
      ? "border-[var(--sce-color-accent-primary)] text-[var(--sce-color-accent-primary)]"
      : "border-transparent text-[var(--sce-color-text-secondary)] hover:text-[var(--sce-color-text-primary)]",
  );
}

export function sceContextTabOverflowSummaryClassName(overflowActive: boolean): string {
  return cn(
    "flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors marker:content-none [&::-webkit-details-marker]:hidden",
    SCE_CONTEXT_TAB_FOCUS,
    overflowActive
      ? "text-[var(--sce-color-accent-primary)]"
      : "text-[var(--sce-color-text-secondary)] hover:text-[var(--sce-color-text-primary)]",
  );
}
