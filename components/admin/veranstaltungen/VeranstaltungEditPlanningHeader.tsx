"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import type { SceClubEventPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

type Props = {
  backHref: string;
  backLabel: string;
  model: SceClubEventPresentationModel;
  fmtCfg: TenantFormatConfig;
  actions?: ReactNode;
  testId?: string;
  backLinkTestId?: string;
  contextTestId?: string;
};

export default function VeranstaltungEditPlanningHeader({
  backHref,
  backLabel,
  model,
  fmtCfg,
  actions,
  testId = "veranstaltung-edit-header",
  backLinkTestId = "veranstaltung-edit-back-link",
  contextTestId = "veranstaltung-edit-schedule-context",
}: Props) {
  return (
    <header className="space-y-3 border-b border-[var(--border)] pb-3" data-testid={testId}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        data-testid={backLinkTestId}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1" data-testid={contextTestId}>
          <SceClubEventCard
            model={model}
            density="STANDARD"
            fmtCfg={fmtCfg}
            linkToDetail={false}
            surface="context-header"
            testId="veranstaltung-edit-context-presentation"
          />
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
