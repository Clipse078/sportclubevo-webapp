import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type VereinsentwicklungWorkspaceRecordRowProps = {
  title: string;
  titleHref?: string;
  strategyLabel?: string | null;
  responsibleLabel?: string | null;
  orgUnitLabel?: string | null;
  progressPercent?: number | null;
  progressCaption?: string | null;
  statusLabel?: string | null;
  trailing?: ReactNode;
  testId?: string;
};

export default function VereinsentwicklungWorkspaceRecordRow({
  title,
  titleHref,
  strategyLabel,
  responsibleLabel,
  orgUnitLabel,
  progressPercent,
  progressCaption,
  statusLabel,
  trailing,
  testId,
}: VereinsentwicklungWorkspaceRecordRowProps) {
  const progress = progressPercent ?? 0;
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
        strategyLabel !== undefined
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
          {strategyLabel?.trim() || "—"}
        </div>
      ) : null}
      <div className="text-xs text-[var(--text-2)]">
        <span className="sr-only">Verantwortlich: </span>
        {responsibleLabel?.trim() || "—"}
      </div>
      <div className="text-xs text-[var(--text-2)]">
        <span className="sr-only">Org-Einheit: </span>
        {orgUnitLabel?.trim() || "Gesamtverein"}
      </div>
      <div className="text-xs text-[var(--text-2)]">
        {progressCaption ? (
          <span>{progressCaption}</span>
        ) : (
          <span>{`${progress}% Fortschritt`}</span>
        )}
        <div
          className="mt-1 h-1.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)]"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progressCaption ?? `${progress} Prozent Fortschritt`}
        >
          <div
            className="h-full bg-[var(--sce-primary)]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-self-end text-xs sm:col-span-1">
        {statusLabel ? (
          <span className="rounded-md border border-[var(--border)] px-2 py-0.5">{statusLabel}</span>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}