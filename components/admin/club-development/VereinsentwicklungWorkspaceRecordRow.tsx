import Link from "next/link";
import type { ReactNode } from "react";
import type { TargetStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { formatTargetResponsiblePresentation } from "@/lib/club-development/vereinsentwicklung-target-responsible-presentation";
import VereinsentwicklungBacklogTruncatingTitle from "./VereinsentwicklungBacklogTruncatingTitle";
import VereinsentwicklungBacklogReferenceCell from "./VereinsentwicklungBacklogReferenceCell";
import VereinsentwicklungTargetStatusPill from "./VereinsentwicklungTargetStatusPill";
import {
  SCE_CD_BACKLOG_GRID_STRATEGY,
  SCE_CD_BACKLOG_GRID_ZIEL,
  SCE_CD_BACKLOG_ROW_CLASS,
} from "./sce-club-development-surface-styles";

export type VereinsentwicklungWorkspaceRecordRowProps =
  | {
      variant: "strategy";
      publicReference?: string | null;
      title: string;
      titleHref?: string;
      orgUnitLabel?: string | null;
      progressSlot: ReactNode;
      trailing?: ReactNode;
      testId?: string;
    }
  | {
      variant: "target";
      publicReference?: string | null;
      title: string;
      titleHref?: string;
      strategyLabel?: string | null;
      strategyHref?: string | null;
      orgUnitLabel?: string | null;
      responsibleLabel?: string | null;
      status: TargetStatus;
      statusLabel: string;
      progressSlot: ReactNode;
      trailing?: ReactNode;
      testId?: string;
    }
  | {
      variant: "legacy";
      title: string;
      titleHref?: string;
      strategyLabel?: string | null;
      strategyHref?: string | null;
      responsibleLabel?: string | null;
      orgUnitLabel?: string | null;
      progressPercent?: number | null;
      progressCaption?: string | null;
      progressSlot?: ReactNode;
      secondaryProgressSlot?: ReactNode;
      statusLabel?: string | null;
      trailing?: ReactNode;
      testId?: string;
    };

export default function VereinsentwicklungWorkspaceRecordRow(props: VereinsentwicklungWorkspaceRecordRowProps) {
  if (props.variant === "strategy") {
    return (
      <div
        className={cn(SCE_CD_BACKLOG_ROW_CLASS, SCE_CD_BACKLOG_GRID_STRATEGY)}
        data-testid={props.testId}
        data-sce-backlog-row="strategy"
      >
        <VereinsentwicklungBacklogReferenceCell reference={props.publicReference ?? null} />
        <VereinsentwicklungBacklogTruncatingTitle title={props.title} href={props.titleHref} />
        <div className="min-w-0 text-xs text-[var(--text-2)]">
          <span className="sr-only">Org-Einheit: </span>
          <span className="truncate">{props.orgUnitLabel?.trim() || "Gesamtverein"}</span>
        </div>
        <div className="min-w-0">{props.progressSlot}</div>
        <div className="flex items-center justify-end gap-2">{props.trailing}</div>
      </div>
    );
  }

  if (props.variant === "target") {
    return (
      <div
        className={cn(SCE_CD_BACKLOG_ROW_CLASS, SCE_CD_BACKLOG_GRID_ZIEL)}
        data-testid={props.testId}
        data-sce-backlog-row="target"
      >
        <VereinsentwicklungBacklogReferenceCell reference={props.publicReference ?? null} />
        <VereinsentwicklungBacklogTruncatingTitle title={props.title} href={props.titleHref} />
        <div className="min-w-0 text-xs text-[var(--text-2)]">
          <span className="sr-only">Strategie: </span>
          <VereinsentwicklungBacklogTruncatingTitle
            title={props.strategyLabel?.trim() || "—"}
            href={props.strategyHref ?? undefined}
            className="text-xs"
          />
          {props.orgUnitLabel?.trim() ? (
            <span className="sr-only">{`, Org-Einheit: ${props.orgUnitLabel}`}</span>
          ) : null}
        </div>
        <VereinsentwicklungTargetStatusPill status={props.status} label={props.statusLabel} />
        <div className="min-w-0">{props.progressSlot}</div>
        <div className="min-w-0 text-xs text-[var(--text-2)]">
          <span className="sr-only">Verantwortlich: </span>
          <span className="truncate">{formatTargetResponsiblePresentation(props.responsibleLabel)}</span>
        </div>
        <div className="flex items-center justify-end gap-2">{props.trailing}</div>
      </div>
    );
  }

  return <LegacyWorkspaceRecordRow {...props} />;
}

function LegacyWorkspaceRecordRow({
  title,
  titleHref,
  strategyLabel,
  strategyHref,
  responsibleLabel,
  orgUnitLabel,
  progressSlot,
  secondaryProgressSlot,
  statusLabel,
  trailing,
  testId,
}: Extract<VereinsentwicklungWorkspaceRecordRowProps, { variant: "legacy" }>) {
  const dualProgress = Boolean(secondaryProgressSlot);
  const titleNode = titleHref ? (
    <Link href={titleHref} className="font-medium text-[var(--foreground)] hover:text-[var(--sce-primary)]">
      {title}
    </Link>
  ) : (
    <span className="font-medium text-[var(--foreground)]">{title}</span>
  );

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-[color-mix(in_srgb,var(--border)_70%,transparent)]",
        "bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-3 py-2.5",
        dualProgress
          ? "sm:grid-cols-[minmax(0,1.05fr)_minmax(0,0.58fr)_minmax(0,0.58fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]"
          : strategyLabel !== undefined
            ? "sm:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.65fr))]"
            : "sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))_auto]",
        "sm:items-center",
      )}
      data-testid={testId}
    >
      <div className="min-w-0">{titleNode}</div>
      {strategyLabel !== undefined ? (
        <div className="text-xs text-[var(--text-2)]">
          <span className="sr-only">Strategie: </span>
          {strategyHref && strategyLabel?.trim() ? (
            <Link
              href={strategyHref}
              className="font-medium text-[var(--foreground)] hover:text-[var(--sce-primary)]"
            >
              {strategyLabel}
            </Link>
          ) : (
            strategyLabel?.trim() || "—"
          )}
        </div>
      ) : null}
      <div className="text-xs text-[var(--text-2)]">
        <span className="sr-only">Verantwortlich: </span>
        {formatTargetResponsiblePresentation(responsibleLabel)}
      </div>
      <div className="text-xs text-[var(--text-2)]">
        <span className="sr-only">Org-Einheit: </span>
        {orgUnitLabel?.trim() || "Gesamtverein"}
      </div>
      <div className="min-w-0 text-xs text-[var(--text-2)]">{progressSlot}</div>
      {secondaryProgressSlot ? <div className="min-w-0 text-xs text-[var(--text-2)]">{secondaryProgressSlot}</div> : null}
      <div className="flex items-center gap-2 justify-self-end text-xs sm:col-span-1">
        {statusLabel ? (
          <span className="rounded-md border border-[var(--border)] px-2 py-0.5">{statusLabel}</span>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}