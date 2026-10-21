/**
 * DS-09 density & border — shared class recipes (Communication-aligned operational tier).
 */
import { cn } from "@/lib/cn";
import {
  SCE_DENSITY_BORDER_RADIUS,
  SCE_DENSITY_BORDER_SPACING,
  SCE_DENSITY_BORDER_STRENGTH,
} from "@/lib/design-system/sce-density-border-foundation";

export const SCE_DENSITY_BORDER_MICRO_UX_DOC_MARKERS = [
  "DENSITY_SYSTEM_CANONICAL",
  "BORDER_SYSTEM_CANONICAL",
  "SCE_DENSITY_WORKSPACE_CONTENT_PADDING_CLASS",
  "SCE_DENSITY_PAGE_SECTION_GAP_CLASS",
  "SCE_DENSE_OPERATIONAL_PAGE_ROOT_CLASS",
] as const;

/** Primary workspace content panel padding (Communication reference). */
export const SCE_DENSITY_WORKSPACE_CONTENT_PADDING_CLASS =
  SCE_DENSITY_BORDER_SPACING.WORKSPACE_CONTENT_PADDING;

/** Vertical rhythm between page sections — dense operational, not oversized. */
export const SCE_DENSITY_PAGE_SECTION_GAP_CLASS =
  SCE_DENSITY_BORDER_SPACING.PAGE_SECTION_GAP;

/** Page/workspace content root — prevents flex/grid children from forcing horizontal scroll. */
export const SCE_DENSE_OPERATIONAL_PAGE_ROOT_CLASS = cn(
  "min-w-0 max-w-full",
  SCE_DENSITY_PAGE_SECTION_GAP_CLASS,
);

/** Section grouping inside a panel — spacing only, no extra outline. */
export const SCE_DENSITY_SECTION_STACK_CLASS = cn(
  "space-y-4",
  "min-w-0",
);

/** Single bordered panel per functional region (not nested card soup). */
export const SCE_DENSITY_FUNCTIONAL_PANEL_CLASS = cn(
  SCE_DENSITY_BORDER_RADIUS.PANEL,
  SCE_DENSITY_BORDER_STRENGTH.PANEL,
  "bg-[var(--sce-surface-standard)]",
  SCE_DENSITY_WORKSPACE_CONTENT_PADDING_CLASS,
  "min-w-0",
);

/** Dense table/list host — scroll contained to semantic region. */
export const SCE_DENSE_TABLE_PAGE_CONTAINMENT_CLASS =
  "min-w-0 max-w-full overflow-hidden";
