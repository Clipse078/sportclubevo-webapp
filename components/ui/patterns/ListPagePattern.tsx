import type { ReactNode } from "react";
import { PageActions, EmptyState } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import type { BreadcrumbItem } from "@/components/ui/page";
import { LoadingSkeleton } from "@/components/ui";
import { cn } from "@/lib/cn";

export type ListPagePatternProps = {
  // ── Header ────────────────────────────────────────────────────────────────
  /** Short uppercase eyebrow label above the title (e.g. module name). */
  eyebrow?: string;
  /** Primary page title. */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Optional badge rendered inline after the title (e.g. count pill). */
  headerBadge?: ReactNode;
  /** Breadcrumb trail shown above the header. */
  breadcrumbs?: BreadcrumbItem[];
  /** Finance-style horizontal tabs below the page header. */
  contextTabs?: ReactNode;
  /** Slot for header-level CTAs (top-right of header row). */
  headerActions?: ReactNode;
  // ── Stats ──────────────────────────────────────────────────────────────────
  /** KPI / metric strip rendered between the header and toolbar. */
  stats?: ReactNode;
  // ── Toolbar ────────────────────────────────────────────────────────────────
  /** Search + filter toolbar rendered above the content shell. */
  toolbar?: ReactNode;
  // ── Content ────────────────────────────────────────────────────────────────
  /**
   * Main list / table content. Not rendered when loading or isEmpty is true.
   * Wrap table content in <SectionCard noPadding> for the standard shell.
   */
  children: ReactNode;
  // ── Loading state ──────────────────────────────────────────────────────────
  /** When true, renders a table skeleton in place of children. */
  loading?: boolean;
  /** Number of skeleton rows. @default 5 */
  loadingRows?: number;
  // ── Empty state ────────────────────────────────────────────────────────────
  /** When true (and not loading), renders the emptyState slot. */
  isEmpty?: boolean;
  /**
   * Custom empty-state node. When omitted and isEmpty is true, the generic
   * EmptyState component is rendered using the empty* props below.
   */
  emptyState?: ReactNode;
  /** Icon for the generic empty state fallback. */
  emptyIcon?: ReactNode;
  /** Heading for the generic empty state. @default "Keine Einträge vorhanden" */
  emptyHeading?: string;
  /** Description for the generic empty state. */
  emptyDescription?: string;
  /** CTA action for the generic empty state. */
  emptyAction?: ReactNode;
  // ── Shell ──────────────────────────────────────────────────────────────────
  className?: string;
};

/**
 * ListPagePattern
 *
 * Reusable structural shell for list / index pages.
 * Composes: PageBreadcrumbs · PageHeader · PageActions ·
 *           LoadingSkeleton · EmptyState
 *
 * Does NOT include PageShell — callers wrap with <PageShell fullWidth> when
 * using inside the admin layout, or omit it when inside a custom shell.
 *
 * Structure:
 *   breadcrumbs → header row (title + actions) → stats strip
 *   → toolbar → [loading | empty | children]
 *
 * Usage:
 *   <PageShell fullWidth>
 *     <ListPagePattern
 *       eyebrow="Teams"
 *       title="Teams pro Saison"
 *       breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Teams" }]}
 *       headerActions={<Button iconLeft={<Plus />}>Neues Team</Button>}
 *       stats={<KpiStrip />}
 *       toolbar={<SearchInput />}
 *       loading={isLoading}
 *       isEmpty={data.length === 0}
 *       emptyHeading="Keine Teams vorhanden"
 *       emptyAction={<Button>Erstes Team erstellen</Button>}
 *     >
 *       <SectionCard noPadding><TeamTable /></SectionCard>
 *     </ListPagePattern>
 *   </PageShell>
 */
export function ListPagePattern({
  eyebrow,
  title,
  description,
  headerBadge,
  breadcrumbs,
  contextTabs,
  headerActions,
  stats,
  toolbar,
  children,
  loading = false,
  loadingRows = 5,
  isEmpty = false,
  emptyState,
  emptyIcon,
  emptyHeading = "Keine Einträge vorhanden",
  emptyDescription,
  emptyAction,
  className,
}: ListPagePatternProps) {
  const showEmpty = !loading && isEmpty;
  const showContent = !loading && !isEmpty;

  const resolvedEmptyState = emptyState ?? (
    <EmptyState
      icon={emptyIcon}
      heading={emptyHeading}
      description={emptyDescription}
      action={emptyAction}
    />
  );

  return (
    <SceWorkspaceChrome
      className={cn("flex flex-col", className)}
      breadcrumbs={breadcrumbs}
      contextTabs={contextTabs}
      header={{
        eyebrow,
        title,
        description,
        badge: headerBadge,
        secondaryActions: headerActions ? <PageActions>{headerActions}</PageActions> : undefined,
      }}
    >
      {stats ? <div>{stats}</div> : null}
      {toolbar ? <div>{toolbar}</div> : null}
      {loading ? <LoadingSkeleton variant="table" rows={loadingRows} /> : null}
      {showEmpty ? resolvedEmptyState : null}
      {showContent ? children : null}
    </SceWorkspaceChrome>
  );
}
