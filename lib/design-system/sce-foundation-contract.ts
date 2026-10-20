/**
 * SCE Design System v1.0 — Foundations & Tokens (DS-02)
 *
 * TypeScript access to semantic foundation tokens. Runtime styling owns values in
 * `app/globals.css` only — this module names and documents consumption; it does
 * not duplicate colour/spacing literals.
 */

export const SCE_FOUNDATION_SOURCE_OF_TRUTH = "app/globals.css" as const;

/** CSS custom property names — semantic colour (surfaces). */
export const SCE_FOUNDATION_COLOR_SURFACE = {
  appBackground: "--sce-color-app-background",
  chrome: "--sce-color-chrome",
  workspace: "--sce-color-workspace",
  pageSurface: "--sce-color-page-surface",
  surfaceStandard: "--sce-color-surface-standard",
  surfaceElevated: "--sce-color-surface-elevated",
  surfaceInteractive: "--sce-color-surface-interactive",
  surfaceSelected: "--sce-color-surface-selected",
  surfaceHover: "--sce-color-surface-hover",
} as const;

/** CSS custom property names — semantic colour (text & icons). */
export const SCE_FOUNDATION_COLOR_TEXT = {
  primary: "--sce-color-text-primary",
  secondary: "--sce-color-text-secondary",
  muted: "--sce-color-text-muted",
  disabled: "--sce-color-text-disabled",
  iconPrimary: "--sce-color-icon-primary",
  iconMuted: "--sce-color-icon-muted",
} as const;

/** CSS custom property names — borders & accent. */
export const SCE_FOUNDATION_COLOR_BORDER_ACCENT = {
  borderSubtle: "--sce-color-border-subtle",
  borderStandard: "--sce-color-border-standard",
  borderStrong: "--sce-color-border-strong",
  accentPrimary: "--sce-color-accent-primary",
  accentHover: "--sce-color-accent-hover",
  accentActive: "--sce-color-accent-active",
  focus: "--sce-color-focus",
  disabled: "--sce-color-disabled",
} as const;

/** CSS custom property names — feedback / status. */
export const SCE_FOUNDATION_COLOR_STATUS = {
  success: "--sce-color-status-success",
  warning: "--sce-color-status-warning",
  error: "--sce-color-status-error",
  info: "--sce-color-status-info",
  neutral: "--sce-color-status-neutral",
} as const;

/**
 * Activity-type semantics (pills, small accents — not full-surface floods).
 * Textual activity labels remain mandatory (no color-only meaning).
 */
export const SCE_FOUNDATION_ACTIVITY_SEMANTIC = {
  match: "--sce-activity-match",
  matchSubtle: "--sce-activity-match-subtle",
  training: "--sce-activity-training",
  trainingSubtle: "--sce-activity-training-subtle",
  tournament: "--sce-activity-tournament",
  tournamentSubtle: "--sce-activity-tournament-subtle",
  clubEvent: "--sce-activity-club-event",
  clubEventSubtle: "--sce-activity-club-event-subtle",
} as const;

export const SCE_FOUNDATION_ACTIVITY_PILL_VARIANTS = [
  "match-red",
  "training-blue",
  "tournament-orange",
  "club-event-violet",
] as const;

export type SceFoundationActivityPillVariant =
  (typeof SCE_FOUNDATION_ACTIVITY_PILL_VARIANTS)[number];

/** Surface hierarchy (architecture — not every layer is a React component in DS-02). */
export const SCE_FOUNDATION_SURFACE_HIERARCHY = [
  "APP",
  "CHROME",
  "WORKSPACE",
  "PAGE",
  "SECTION",
  "PANEL_CARD",
  "CONTROLS",
] as const;

/** Layout density tiers (control/spacing principles — components opt in). */
export const SCE_FOUNDATION_DENSITY_TIERS = [
  "COMFORTABLE",
  "COMPACT",
  "DENSE",
] as const;

export type SceFoundationDensityTier =
  (typeof SCE_FOUNDATION_DENSITY_TIERS)[number];

/** CSS vars for density-scoped spacing (see globals.css). */
export const SCE_FOUNDATION_DENSITY_VARS: Record<
  SceFoundationDensityTier,
  { controlHeight: string; gap: string; panelPadding: string }
> = {
  COMFORTABLE: {
    controlHeight: "--sce-density-comfortable-control-height",
    gap: "--sce-density-comfortable-gap",
    panelPadding: "--sce-density-comfortable-panel-padding",
  },
  COMPACT: {
    controlHeight: "--sce-density-compact-control-height",
    gap: "--sce-density-compact-gap",
    panelPadding: "--sce-density-compact-panel-padding",
  },
  DENSE: {
    controlHeight: "--sce-density-dense-control-height",
    gap: "--sce-density-dense-gap",
    panelPadding: "--sce-density-dense-panel-padding",
  },
};

/** Activity card presentation densities (separate from layout density). */
export const SCE_FOUNDATION_ACTIVITY_PRESENTATION_DENSITIES = [
  "HERO",
  "STANDARD",
  "COMPACT",
  "MICRO",
] as const;

/** Canonical icon size roles (px) — reference for new work; no mass migration in DS-02. */
export const SCE_FOUNDATION_ICON_SIZE_PX = {
  metadata: 14,
  control: 16,
  standard: 20,
  feature: 24,
  emptyState: 32,
  status: 18,
  resource: 16,
} as const;

/** Club crest bounding boxes (layout bounds only — real crests stay object-contain). */
export const SCE_FOUNDATION_CREST_SIZE_PX = {
  micro: 20,
  compact: 28,
  standard: 40,
  hero: 56,
} as const;

/** Semantic radius roles (CSS var names). */
export const SCE_FOUNDATION_RADIUS = {
  control: "--sce-radius-control",
  panel: "--sce-radius-panel",
  menu: "--sce-radius-menu",
  dialog: "--sce-radius-dialog",
  pill: "--sce-radius-pill",
} as const;

/** Semantic elevation shadow roles. */
export const SCE_FOUNDATION_ELEVATION = {
  panel: "--sce-elevation-panel",
  elevated: "--sce-elevation-elevated",
  menu: "--sce-elevation-menu",
  dialog: "--sce-elevation-dialog",
} as const;

/** Focus foundation — must not depend on colour alone (outline + offset). */
export const SCE_FOUNDATION_FOCUS = {
  ringColor: "--sce-focus-ring-color",
  ringWidth: "--sce-focus-ring-width",
  ringOffset: "--sce-focus-ring-offset",
  inputShadow: "--sce-focus-input-shadow",
} as const;

/** Responsive foundations aligned with repository CSS (not a parallel breakpoint system). */
export const SCE_FOUNDATION_BREAKPOINTS_PX = {
  mobileMax: 768,
  smallTabletMin: 769,
  largeTabletMin: 1024,
  desktopMin: 1280,
  wideOperationalMin: 1536,
} as const;

/** Breadcrumb + context tab rollout owners (foundation prep only in DS-02). */
export const SCE_FOUNDATION_NAVIGATION_ROLLOUT = {
  breadcrumbsCanonical: true,
  breadcrumbRolloutOwner: "SCE-DESIGN-SYSTEM-03",
  contextTabsCanonical: "SceContextTabs",
  contextTabRolloutOwner: "SCE-DESIGN-SYSTEM-03",
} as const;

export const SCE_FOUNDATION_ALL_SEMANTIC_COLOR_VARS = [
  ...Object.values(SCE_FOUNDATION_COLOR_SURFACE),
  ...Object.values(SCE_FOUNDATION_COLOR_TEXT),
  ...Object.values(SCE_FOUNDATION_COLOR_BORDER_ACCENT),
  ...Object.values(SCE_FOUNDATION_COLOR_STATUS),
  ...Object.values(SCE_FOUNDATION_ACTIVITY_SEMANTIC),
] as const;

/** Tailwind arbitrary value helper: `var(--token)` inside class strings. */
export function sceFoundationVar(cssVar: string): string {
  return `var(${cssVar})`;
}
