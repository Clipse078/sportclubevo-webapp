import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageBreadcrumbs, type BreadcrumbItem } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import {
  PLANNING_EDITOR_MAIN_RAIL_GRID,
  PLANNING_EDITOR_MAX_WIDTH_CLASS,
  PLANNING_EDITOR_RAIL_ASIDE,
} from "./planning-editor-layout";

type Props = {
  breadcrumbs: BreadcrumbItem[];
  backHref: string;
  backLabel: string;
  header: ReactNode;
  children: ReactNode;
  contextRail?: ReactNode;
  testId?: string;
  backLinkTestId?: string;
  mainRailTestId?: string;
  /** When the parent FormPagePattern owns breadcrumbs/back, omit record-shell nav chrome. */
  hideNavChrome?: boolean;
};

/**
 * Breadcrumb + back + header shell for Match/Tournament record create/edit flows.
 */
export default function PlanningEditorRecordShell({
  breadcrumbs,
  backHref,
  backLabel,
  header,
  children,
  contextRail,
  testId,
  backLinkTestId = "planning-editor-record-back-link",
  mainRailTestId,
  hideNavChrome = false,
}: Props) {
  const showBreadcrumbs = !hideNavChrome && breadcrumbs.length > 0;
  const showBackLink = !hideNavChrome;
  const showTopChrome = showBreadcrumbs || showBackLink || header != null;

  return (
    <div className={cn(PLANNING_EDITOR_MAX_WIDTH_CLASS, "space-y-5 pb-8")} data-testid={testId}>
      {showTopChrome ? (
        <div className="space-y-3 border-b border-[var(--border)]/80 pb-4">
          {showBreadcrumbs ? <PageBreadcrumbs items={breadcrumbs} /> : null}
          {showBackLink ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)]"
              data-testid={backLinkTestId}
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
              {backLabel}
            </Link>
          ) : null}
          {header}
        </div>
      ) : null}

      <div
        className={cn(contextRail ? PLANNING_EDITOR_MAIN_RAIL_GRID : undefined)}
        data-testid={mainRailTestId}
      >
        <div className="min-w-0">{children}</div>
        {contextRail ? <aside className={PLANNING_EDITOR_RAIL_ASIDE}>{contextRail}</aside> : null}
      </div>
    </div>
  );
}
