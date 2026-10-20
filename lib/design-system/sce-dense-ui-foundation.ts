/**
 * SCE-DESIGN-SYSTEM-08 — tables, lists & dense operational information contracts.
 */

export const SCE_DENSE_UI_PATTERN_TYPES = [
  "TABLE",
  "LIST",
  "DENSE_LIST",
  "ENTITY_LIST",
  "KEY_VALUE_DENSE",
  "RESPONSIVE_DATA_VIEW",
] as const;

export type SceDenseUiPatternType = (typeof SCE_DENSE_UI_PATTERN_TYPES)[number];

export const SCE_DENSE_UI_SEMANTICS = {
  TABLE_WHEN_COLUMN_RELATIONSHIPS_MATTER: "YES",
  LIST_WHEN_ENTITY_HIERARCHY_MATTERS: "YES",
  CARD_GRID_AS_DEFAULT_DENSE_UI: "NO",
  CARD_SOUP_ALLOWED: "NO",
  FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED: "YES",
  RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE: "NO",
} as const;

/** Composition: surface → toolbar → summary → header → rows → empty/loading/error → footer */
export const SCE_DENSE_SURFACE_COMPOSITION = {
  TOOLBAR_REGION: "filters, search, primary contextual action",
  SUMMARY_REGION: "optional result count / KPI strip (domain-specific)",
  HEADER_REGION: "column or list header — subordinate to page heading",
  CONTENT_REGION: "rows — one coherent operational surface",
  STATE_REGION: "empty, loading, error occupy same geometry as content (DS-07)",
  FOOTER_REGION: "pagination where semantically required",
} as const;

export const SCE_DENSE_ROW_STATES = [
  "DEFAULT",
  "HOVER",
  "FOCUS_WITHIN",
  "SELECTED",
  "DISABLED",
  "ATTENTION",
] as const;

export type SceDenseRowState = (typeof SCE_DENSE_ROW_STATES)[number];

export const SCE_DENSE_ROW_CONTRACT = {
  ROW_AS_CARD_DEFAULT: "NO",
  ARBITRARY_ROW_SHADOW: "NO",
  CONSISTENT_VERTICAL_RHYTHM: "YES",
  PRIMARY_IDENTITY_SCANNABLE: "YES",
  STATUS_ALIGNMENT: "YES",
  PREDICTABLE_ROW_ACTIONS: "YES",
  ADEQUATE_TOUCH_TARGET: "YES",
  RESTRAINED_SEPARATORS: "YES",
} as const;

export const SCE_DENSE_HEADER_CONTRACT = {
  VISUALLY_SUBORDINATE_TO_PAGE: "YES",
  PADDING_ALIGNED_WITH_ROWS: "YES",
  FAKE_SORT_AFFORDANCE: "NO",
  ACCESSIBLE_SORT_STATE: "YES",
  SPREADSHEET_CHROME: "NO",
} as const;

export const SCE_DENSE_SELECTION_CONTRACT = {
  ROW_SELECTION_CHECKBOX_ALLOWED: "YES_WHEN_MULTI_SELECTION",
  BINARY_SETTING_CHECKBOX_ALLOWED: "NO",
  SELECTION_WITHOUT_BULK_ACTION: "NO",
} as const;

export const SCE_DENSE_FILTER_TOOLBAR_CONTRACT = {
  CANONICAL_SEARCH: "SceSearchField",
  CANONICAL_SELECT: "SceToolbarSelect / DS-05 controls",
  ONE_OFF_SEARCH_STYLES: "NO",
  MOBILE_REFLOW_INTENTIONAL: "YES",
  UNCONTROLLED_HORIZONTAL_OVERFLOW: "NO",
} as const;

export const SCE_DENSE_ROW_ACTION_CONTRACT = {
  ICON_ACTION: "SceIconButton",
  OVERFLOW: "SceOverflowMenu",
  PRIMARY_LINK: "SceActionLink",
  LOCAL_KEBAB_SYSTEMS: "NO",
  DESTRUCTIVE_REQUIRES_CONFIRMATION: "YES",
} as const;

export const SCE_DENSE_STATUS_PLACEMENT = {
  NEW_PILL_FAMILY: "NO",
  USE_CANONICAL_BADGE: "YES",
  COLOUR_ONLY_STATUS: "NO",
  COMPETING_STATUS_PILLS: "NO",
} as const;

export const SCE_DENSE_RESPONSIVE_STRATEGIES = [
  "HIDE_LOWER_PRIORITY_METADATA",
  "STACK_SECONDARY_UNDER_IDENTITY",
  "COLLAPSE_COLUMNS_INTO_ROW_METADATA",
  "RETAIN_STATUS_AND_ACTION",
  "CONTROLLED_HORIZONTAL_SCROLL",
] as const;

export type SceDenseResponsiveStrategy = (typeof SCE_DENSE_RESPONSIVE_STRATEGIES)[number];

/** Grid template for Personen & Zugänge administrative list (desktop). */
export const SCE_PEOPLE_ACCESS_DENSE_GRID =
  "md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_88px_96px_40px]" as const;

export const SCE_DENSE_UI_DS07_INTEGRATION = {
  EMPTY: "SceEmptyState",
  LOADING: "SceSkeleton",
  ERROR: "SceActionableError",
  INLINE_FEEDBACK: "SceSemanticFeedback",
  SAME_CONTENT_REGION: "YES",
} as const;

export const SCE_DENSE_CANONICAL_PRIMITIVES = {
  DENSE_SURFACE: "SceDenseSurface",
  DENSE_TOOLBAR: "SceDenseToolbar",
  DENSE_RESULT_COUNT: "SceDenseResultCount",
  DATA_TABLE: "SceDataTable",
  DENSE_GRID_HEADER: "SceDenseGridHeader",
  DENSE_GRID_ROW: "SceDenseGridRow",
  DENSE_LIST: "SceDenseList",
  DENSE_LIST_ROW: "SceDenseListRow",
  ENTITY_IDENTITY: "SceEntityIdentity",
  SORTABLE_HEADER: "SceSortableColumnHeader",
  PAGINATION: "SceDensePagination",
} as const;
