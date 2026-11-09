/**
 * components/ui/patterns — SportClubEvo Premium Application Patterns
 *
 * Reusable page-level composition patterns for list, detail, and form pages.
 * Each pattern wires together the lower-level primitives from @/components/ui
 * and @/components/ui/page into a consistent, module-agnostic structural shell.
 *
 * Patterns do NOT include PageShell — callers decide whether to wrap with
 * <PageShell fullWidth> based on the admin shell context.
 *
 * Canonical usage:
 *   import { ListPagePattern } from "@/components/ui/patterns";
 *   import type { ListPagePatternProps } from "@/components/ui/patterns";
 *
 * Active patterns:
 *   ListPagePattern     — list/index pages with header, stats, toolbar, table
 *   DetailPagePattern   — record detail with header, summary, two-column grid
 *   FormPagePattern     — create/edit forms with grouped sections, sticky save bar
 *
 * Dashboard and settings archetypes ship in DS2-07 (use SceWorkspaceChrome + domain shells).
 */

export { ListPagePattern } from "./ListPagePattern";
export type { ListPagePatternProps } from "./ListPagePattern";

export { DetailPagePattern } from "./DetailPagePattern";
export type { DetailPagePatternProps } from "./DetailPagePattern";

export { FormPagePattern } from "./FormPagePattern";
export type { FormPagePatternProps } from "./FormPagePattern";
