/**
 * SCE-UI-STANDARD-01 — workspace surface layout tokens.
 * Reference: `/dashboard/communication` (CommunicationHubCapabilityLink grid).
 * @see docs/design/SCE-WORKSPACE-SURFACE-STANDARD.md
 */

/** Bounded activity tab workspace — background remains visible in gutters. */
export const SCE_WORKSPACE_SURFACE_CLASS =
  "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)]/90 shadow-sm backdrop-blur-[2px] supports-[backdrop-filter]:bg-[var(--sce-surface-standard)]/82";

/** Card-style functional section inside a tab (Communication hub card pattern). */
export const SCE_WORKSPACE_FEATURE_CARD_CLASS =
  "rounded-[var(--radius-lg)] border border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)] p-4 md:p-5";

/** Responsive grid for Mehr / multi-card tabs. */
export const SCE_WORKSPACE_CARD_GRID_CLASS =
  "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4";

/** Inner padding for stacked sections inside one surface. */
export const SCE_WORKSPACE_SECTION_PADDING_CLASS = "px-4 py-4 md:px-5 md:py-5";

/** Horizontal activity tab list — thin horizontal scroll, no vertical scrollbar artifacts. */
export const SCE_ACTIVITY_NAV_TABLIST_CLASS = "sce-activity-nav-tablist";
