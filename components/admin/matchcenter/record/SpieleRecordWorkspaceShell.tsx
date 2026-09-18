import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageBreadcrumbs, type BreadcrumbItem } from "@/components/ui/page";
import {
  SPIELE_RECORD_MAIN_RAIL_GRID,
  SPIELE_RECORD_MAX_WIDTH_CLASS,
  SPIELE_RECORD_RAIL_ASIDE,
} from "./spiele-record-layout";
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

export default function SpieleRecordWorkspaceShell({
  breadcrumbs,
  backHref = "/dashboard/matchcenter",
  backLabel = "Spiele",
  header,
  children,
  contextRail,
  testId,
}: Props) {
  return (
    <div className={cn(SPIELE_RECORD_MAX_WIDTH_CLASS, "space-y-5 pb-8")} data-testid={testId}>
      <div className="space-y-3 border-b border-[var(--border)]/80 pb-4">
        <PageBreadcrumbs items={breadcrumbs} />
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)]"
          data-testid="spiele-record-back-link"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
          {backLabel}
        </Link>
        {header}
      </div>

      <div className={cn(contextRail ? SPIELE_RECORD_MAIN_RAIL_GRID : undefined)}>
        <div className="min-w-0">{children}</div>
        {contextRail ? <aside className={SPIELE_RECORD_RAIL_ASIDE}>{contextRail}</aside> : null}
      </div>
    </div>
  );
}
