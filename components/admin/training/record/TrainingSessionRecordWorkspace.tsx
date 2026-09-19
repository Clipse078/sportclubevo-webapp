"use client";

import Link from "next/link";
import { CalendarDays, Dumbbell, Layers } from "lucide-react";
import type { BreadcrumbItem } from "@/components/ui/page";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import TrainingSessionEditForm from "@/components/admin/training/TrainingSessionEditForm";
import { TrainingSessionAllocationEditor } from "@/components/admin/training/TrainingSessionAllocationEditor";
import TrainingRecordWorkspaceShell from "@/components/admin/training/record/TrainingRecordWorkspaceShell";
import TrainingRecordSection from "@/components/admin/training/record/TrainingRecordSection";
import TrainingSessionRecordContextRail from "@/components/admin/training/record/TrainingSessionRecordContextRail";
import TrainingSessionRecordContextMenu from "@/components/admin/training/record/TrainingSessionRecordContextMenu";
import { TRAINING_FORM_WORKSPACE_SURFACE_CLASS } from "@/components/admin/training/form/training-form-layout";
import {
  formatTrainingSessionBreadcrumbDate,
  formatTrainingSessionOccurrenceHeadline,
  formatTrainingSessionScheduleLine,
  formatTrainingSessionSeriesBaselineLine,
  formatTrainingSessionTimeRange,
  resolveTrainingSessionDressingRoomCodes,
  resolveTrainingSessionPitchPresentation,
  trainingSessionMatchesSeriesStandard,
  trainingSessionOverrideStatusLabel,
} from "@/lib/training/training-session-edit-presentation";
import type { TrainingAllocationDto, TrainingSessionAllocationDto, Weekday } from "@/lib/training/types";
import { cn } from "@/lib/cn";

export type TrainingSessionRecordWorkspaceProps = {
  sessionId: string;
  trainingSeriesId: string;
  trainingSeriesTitle: string;
  teamName: string;
  canManage: boolean;
  isRescheduled: boolean;
  effectiveDate: string;
  effectiveStartTime: string;
  effectiveEndTime: string;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  seriesWeekday: Weekday;
  timezone: string;
  locale: string;
  seriesEditHref: string;
  wochenplanerHref: string;
  dressingRoomOccupancyMode: "DEFAULT" | "CUSTOM";
  initialSessionAllocations: TrainingSessionAllocationDto[];
  seriesAllocations: TrainingAllocationDto[];
  facilityGroups: FacilityGroup[];
  sessionStartAt: string;
  sessionEndAt: string;
};

export default function TrainingSessionRecordWorkspace({
  sessionId,
  trainingSeriesTitle,
  teamName,
  canManage,
  isRescheduled,
  effectiveDate,
  effectiveStartTime,
  effectiveEndTime,
  originalDate,
  originalStartTime,
  originalEndTime,
  seriesWeekday,
  timezone,
  locale,
  seriesEditHref,
  wochenplanerHref,
  dressingRoomOccupancyMode,
  initialSessionAllocations,
  seriesAllocations,
  facilityGroups,
  sessionStartAt,
  sessionEndAt,
}: TrainingSessionRecordWorkspaceProps) {
  const breadcrumbDate = formatTrainingSessionBreadcrumbDate(effectiveDate, locale, timezone);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Planung", href: "/dashboard/planner" },
    { label: "Trainings", href: "/dashboard/training" },
    { label: teamName, href: "/dashboard/training" },
    { label: breadcrumbDate },
  ];

  const occurrenceHeadline = formatTrainingSessionOccurrenceHeadline(effectiveDate, locale, timezone);
  const occurrenceTimeLine = formatTrainingSessionTimeRange(effectiveStartTime, effectiveEndTime);
  const occurrenceScheduleLine = formatTrainingSessionScheduleLine({
    date: effectiveDate,
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    locale,
    timezone,
  });

  const seriesScheduleLine = formatTrainingSessionSeriesBaselineLine({
    originalDate,
    originalStartTime,
    originalEndTime,
    weekday: seriesWeekday,
  });

  const matchesSeriesStandard = trainingSessionMatchesSeriesStandard({
    session: { isRescheduled, dressingRoomOccupancyMode },
    sessionAllocations: initialSessionAllocations,
  });
  const overrideStatusLabel = trainingSessionOverrideStatusLabel(matchesSeriesStandard);

  const pitchPresentation = resolveTrainingSessionPitchPresentation(
    initialSessionAllocations,
    seriesAllocations,
  );
  const dressingPresentation = resolveTrainingSessionDressingRoomCodes(
    initialSessionAllocations,
    seriesAllocations,
  );

  const header = (
    <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
          <span className="inline-flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5 text-[var(--sce-primary)]" aria-hidden />
            Einzeltermin
          </span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <span
            className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/25"
            data-testid="training-session-record-status-geplant"
          >
            Geplant
          </span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold",
              matchesSeriesStandard
                ? "bg-[var(--surface-2)] text-[var(--text-2)] ring-1 ring-[var(--border)]"
                : "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/25",
            )}
            data-testid="training-session-record-override-status"
          >
            {overrideStatusLabel}
          </span>
        </div>
        <h1
          className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]"
          data-testid="training-session-record-title"
        >
          {trainingSeriesTitle}
        </h1>
        <p className="text-sm text-[var(--text-2)]" data-testid="training-session-record-schedule-line">
          {occurrenceHeadline} · {occurrenceTimeLine}
        </p>
        <p className="text-xs text-[var(--muted)]" data-testid="training-session-record-context-line">
          Einzeltermin · {teamName}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href={seriesEditHref}
          className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
          data-testid="training-session-header-series-link"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Zur Serie
        </Link>
        <Link
          href={wochenplanerHref}
          className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
          data-testid="training-session-header-wochenplaner-link"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Im Wochenplaner
        </Link>
        <TrainingSessionRecordContextMenu seriesEditHref={seriesEditHref} wochenplanerHref={wochenplanerHref} />
      </div>
    </div>
  );

  return (
    <TrainingRecordWorkspaceShell
      breadcrumbs={breadcrumbs}
      header={header}
      testId="training-session-record-workspace"
      contextRail={
        <TrainingSessionRecordContextRail
          seriesTitle={trainingSeriesTitle}
          seriesScheduleLine={seriesScheduleLine}
          seriesEditHref={seriesEditHref}
          matchesSeriesStandard={matchesSeriesStandard}
          overrideStatusLabel={overrideStatusLabel}
          occurrenceScheduleLine={occurrenceScheduleLine}
          wochenplanerHref={wochenplanerHref}
          teamLabel={teamName}
          pitchLabel={pitchPresentation.primaryName}
          dressingRoomCodes={dressingPresentation.codes}
        />
      }
    >
      <div
        className={`${TRAINING_FORM_WORKSPACE_SURFACE_CLASS} divide-y divide-[var(--border)]/80`}
        data-testid="training-session-record-main-surface"
      >
        <TrainingRecordSection title="Termin" testId="training-session-record-section-termin">
          <TrainingSessionEditForm
            sessionId={sessionId}
            canManage={canManage}
            isRescheduled={isRescheduled}
            effectiveDate={effectiveDate}
            effectiveStartTime={effectiveStartTime}
            effectiveEndTime={effectiveEndTime}
            originalDate={originalDate}
            originalStartTime={originalStartTime}
            originalEndTime={originalEndTime}
            seriesWeekday={seriesWeekday}
            timezone={timezone}
            locale={locale}
            layout="workspace"
          />
        </TrainingRecordSection>

        <TrainingRecordSection
          title="Ressourcen"
          description="Standardmässig übernimmt dieser Termin die Ressourcen der Serie. Abweichungen gelten nur für diesen Termin."
          testId="training-session-record-section-resources"
        >
          <TrainingSessionAllocationEditor
            sessionId={sessionId}
            initialAllocations={initialSessionAllocations}
            seriesAllocations={seriesAllocations}
            facilityGroups={facilityGroups}
            canManage={canManage}
            sessionStartAt={sessionStartAt}
            sessionEndAt={sessionEndAt}
            layout="workspace"
          />
        </TrainingRecordSection>
      </div>
    </TrainingRecordWorkspaceShell>
  );
}
