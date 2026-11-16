"use client";

import type { ReactNode } from "react";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { PlanningResourceAssignmentKindIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { SCE_ACTIVITY_REFERENCE_LAYOUT } from "@/lib/sporting-activity-presentation/canonical/activity-card-reference-layout";
import { SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW } from "@/lib/sporting-activity-presentation/canonical/programme-dashboard-preview-contract";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { SceTeamName } from "@/components/design-system/typography";
import { SCE_ACTIVITY_LIST_ROW_SCALE } from "@/lib/sporting-activity-presentation/canonical/activity-card-list-row-scale";
import type { ProgrammeDashboardPreviewClubIdentity } from "@/lib/sporting-activity-presentation/canonical/programme-dashboard-preview-identity";
import previewLayoutStyles from "./SceProgrammeDashboardPreviewLayout.module.css";

/** @deprecated Prefer {@link SceProgrammeDashboardPreviewBody} — kept for export stability. */
export function SceProgrammeDashboardPreviewStack({
  children,
  activityKind,
  testId,
  presentation = SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW,
}: {
  children: ReactNode;
  activityKind: string;
  testId?: string;
  presentation?: string;
}) {
  return (
    <div
      className={cn(
        previewLayoutStyles.root,
        SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewContentStackClass,
      )}
      data-sce-programme-card-contract={presentation}
      data-sce-activity-card-layout="dashboard-preview-stack"
      data-sce-activity-kind={activityKind}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export type SceProgrammeDashboardPreviewBodyProps = {
  activityKind: string;
  testId?: string;
  presentation?: string;
  statusSlot?: ReactNode;
  timeSlot?: ReactNode;
  titleSlot: ReactNode;
  metaSlot: ReactNode;
  identity?: ProgrammeDashboardPreviewClubIdentity | null;
  identityTestId?: string;
};

export function SceProgrammeDashboardPreviewClubIdentityBlock({
  identity,
  testId = "sce-programme-dashboard-preview-org-context",
  align = "start",
}: {
  identity: ProgrammeDashboardPreviewClubIdentity;
  testId?: string;
  align?: "start" | "end";
}) {
  const clubName = identity.clubName?.trim();
  const unitLabel = identity.unitLabel?.trim();
  const crest = identity.crestIdentity;
  const showCrest = Boolean(crest && (crest.logoUrl?.trim() || crest.displayName?.trim()));

  if (!clubName && !unitLabel && !showCrest) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2",
        align === "end" ? "justify-end text-right" : "text-left",
      )}
      data-testid={testId}
      data-sce-programme-dashboard-preview-identity
    >
      {showCrest && crest ? (
        <ClubCrest
          identity={crest}
          density="compact"
          decorative={Boolean(clubName)}
          className={cn(SCE_ACTIVITY_LIST_ROW_SCALE.crestBoundsClass, "h-7 w-7 shrink-0")}
        />
      ) : null}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-0.5",
          align === "end" ? "items-end" : "items-start",
        )}
      >
        {clubName ? (
          <SceTeamName
            as="span"
            className={cn(
              SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewWrapMetaClass,
              "font-medium",
            )}
            density="MICRO"
            truncate={false}
            lineClamp={2}
          >
            {clubName}
          </SceTeamName>
        ) : null}
        {unitLabel ? (
          <SceTeamName
            as="span"
            className={SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewWrapMetaClass}
            density="MICRO"
            truncate={false}
            lineClamp={2}
          >
            {unitLabel}
          </SceTeamName>
        ) : null}
      </div>
    </div>
  );
}

export function SceProgrammeDashboardPreviewBody({
  activityKind,
  testId,
  presentation = SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW,
  statusSlot,
  timeSlot,
  titleSlot,
  metaSlot,
  identity,
  identityTestId = "sce-programme-dashboard-preview-org-context",
}: SceProgrammeDashboardPreviewBodyProps) {
  const identityNode = identity ? (
    <SceProgrammeDashboardPreviewClubIdentityBlock identity={identity} testId={identityTestId} />
  ) : null;

  return (
    <div
      className={cn(
        previewLayoutStyles.root,
        SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewContentStackClass,
      )}
      data-sce-programme-card-contract={presentation}
      data-sce-activity-card-layout="dashboard-preview-stack"
      data-sce-activity-kind={activityKind}
      data-testid={testId}
    >
      <div className={previewLayoutStyles.layout} data-sce-programme-dashboard-preview-layout>
        {statusSlot ? <div className={previewLayoutStyles.statusSlot}>{statusSlot}</div> : null}
        {timeSlot ? <div className={previewLayoutStyles.timeSlot}>{timeSlot}</div> : null}
        <div className={previewLayoutStyles.titleSlot}>{titleSlot}</div>
        {identityNode ? (
          <div className={previewLayoutStyles.identitySlot}>{identityNode}</div>
        ) : null}
        <div className={previewLayoutStyles.metaSlot}>{metaSlot}</div>
      </div>
    </div>
  );
}

export function SceProgrammeDashboardPreviewTimeLine({
  label,
  testId = "sce-programme-dashboard-preview-time",
}: {
  label: string;
  testId?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5" data-testid={testId}>
      <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
      <span className={SCE_ACTIVITY_REFERENCE_LAYOUT.trainingReferenceTimeClass}>{label}</span>
    </div>
  );
}

export function SceProgrammeDashboardPreviewTitleLine({
  title,
  testId,
}: {
  title: string;
  testId: string;
}) {
  return (
    <p className={SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewTitleClass} data-testid={testId}>
      {title}
    </p>
  );
}

/** @deprecated Prefer {@link SceProgrammeDashboardPreviewClubIdentityBlock} via {@link SceProgrammeDashboardPreviewBody}. */
export function SceProgrammeDashboardPreviewOrgContextLine({
  label,
  crestIdentity,
  testId = "sce-programme-dashboard-preview-org-context",
}: {
  label: string;
  crestIdentity?: ProgrammeDashboardPreviewClubIdentity["crestIdentity"];
  testId?: string;
}) {
  return (
    <SceProgrammeDashboardPreviewClubIdentityBlock
      identity={{
        crestIdentity,
        clubName: label,
      }}
      testId={testId}
    />
  );
}

export function SceProgrammeDashboardPreviewActivityPillLine({
  children,
  testId = "sce-programme-dashboard-preview-activity-pill",
}: {
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex min-w-0 items-start" data-testid={testId}>
      {children}
    </div>
  );
}

export function SceProgrammeDashboardPreviewLocationLine({
  label,
  testId = "sce-programme-dashboard-preview-location",
}: {
  label: string;
  testId?: string;
}) {
  return (
    <p
      className={cn(
        "flex min-w-0 items-start gap-1.5",
        SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewLocationClass,
      )}
      data-testid={testId}
    >
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
      <span className="min-w-0 break-words [overflow-wrap:normal]">{label}</span>
    </p>
  );
}

export function SceProgrammeDashboardPreviewDressingRoomLine({
  label,
  testId = "sce-programme-dashboard-preview-dressing-room",
}: {
  label: string;
  testId?: string;
}) {
  return (
    <p
      className={cn(
        "flex min-w-0 items-start gap-1.5",
        SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewWrapMetaClass,
      )}
      data-testid={testId}
    >
      <PlanningResourceAssignmentKindIcon
        kind="dressing_room"
        compact
        semanticColors={false}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
      />
      <span className="min-w-0 break-words [overflow-wrap:normal]">{label}</span>
    </p>
  );
}