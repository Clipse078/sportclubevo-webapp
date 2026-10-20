/**
 * SCE Design System — canonical workspace / navigation hierarchy (DS-03).
 *
 * GLOBAL NAVIGATION → BREADCRUMBS → WORKSPACE HEADER → CONTEXT TABS (semantic) → CONTENT
 */

export const SCE_WORKSPACE_HIERARCHY_LAYERS = [
  "GLOBAL_NAVIGATION",
  "BREADCRUMBS",
  "WORKSPACE_HEADER",
  "CONTEXT_TABS",
  "WORKSPACE_CONTENT",
] as const;

export type SceWorkspaceHierarchyLayer =
  (typeof SCE_WORKSPACE_HIERARCHY_LAYERS)[number];

export const SCE_WORKSPACE_LAYER_QUESTIONS: Record<
  SceWorkspaceHierarchyLayer,
  string
> = {
  GLOBAL_NAVIGATION: "Which major SCE domain?",
  BREADCRUMBS: "Where in the product hierarchy?",
  WORKSPACE_HEADER: "Which object/context/workspace?",
  CONTEXT_TABS: "What views/actions within this context?",
  WORKSPACE_CONTENT: "Operational UI",
};

/** Canonical React primitives for each layer (not every page renders every layer). */
export const SCE_WORKSPACE_CANONICAL_PRIMITIVES = {
  GLOBAL_NAVIGATION: "AppShellNavigation",
  BREADCRUMBS: "SceBreadcrumbs",
  WORKSPACE_HEADER: "SceWorkspaceHeader",
  CONTEXT_TABS: "SceContextTabs",
  WORKSPACE_SURFACE: "SceWorkspaceSurface",
  PAGE_FRAME: "PageShell",
} as const;

export const SCE_WORKSPACE_COMPOSITION_VARIANTS = [
  "STANDARD",
  "OBJECT_DETAIL",
  "DENSE_OPERATIONAL",
  "PLANNING",
  "ADMINISTRATION",
] as const;

export type SceWorkspaceCompositionVariant =
  (typeof SCE_WORKSPACE_COMPOSITION_VARIANTS)[number];

/** Product-wide rollout locks (DS-02 PO → DS-03 implementation). */
export const SCE_WORKSPACE_PRODUCT_WIDE_FLAGS = {
  WORKSPACE_SYSTEM_PRODUCT_WIDE: "YES",
  BREADCRUMB_SYSTEM_PRODUCT_WIDE: "YES",
  CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC: "YES",
  LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED: "NO",
  PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED: "YES",
  UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE: "NO",
} as const;
