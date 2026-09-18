import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageBreadcrumbs, type BreadcrumbItem } from "@/components/ui/page";
import {
  TURNIERE_RECORD_MAIN_RAIL_GRID,
  TURNIERE_RECORD_MAX_WIDTH_CLASS,
  TURNIERE_RECORD_RAIL_ASIDE,
} from "./turniere-record-layout";
import { cn } from "@/lib/cn";

type Props = {
  breadcrumbs: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  header: ReactNode;
  children: ReactNode;
  contextRail?: ReactNode;
  testId?: string;
};

export default function TurniereRecordWorkspaceShell({
  breadcrumbs,
  backHref = "/dashboard/tournamentcenter",
  backLabel = "Turniere",
  header,
  children,
  contextRail,
  testId,
}: Props) {
  return (
    <div className={cn(TURNIERE_RECORD_MAX_WIDTH_CLASS, "space-y-5 pb-8")} data-testid={testId}>
      <div className="space-y-3 border-b border-[var(--border)]/80 pb-4">
        <PageBreadcrumbs items={breadcrumbs} />
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)]"
          data-testid="turniere-record-back-link"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
          {backLabel}
        </Link>
        {header}
      </div>

      <div className={cn(contextRail ? TURNIERE_RECORD_MAIN_RAIL_GRID : undefined)} data-testid="turniere-record-main-rail-grid">
        <div className="min-w-0">{children}</div>
        {contextRail ? <aside className={TURNIERE_RECORD_RAIL_ASIDE}>{contextRail}</aside> : null}
      </div>
    </div>
  );
}
