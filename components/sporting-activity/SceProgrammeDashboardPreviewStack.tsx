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
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";

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
      className={SCE_ACTIVITY_REFERENCE_LAYOUT.programmeDashboardPreviewContentStackClass}
      data-sce-programme-card-contract={presentation}
      data-sce-activity-card-layout="dashboard-preview-stack"
      data-sce-activity-kind={activityKind}
      data-testid={testId}
    >
      {children}
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

export function SceProgrammeDashboardPreviewOrgContextLine({
  label,
  crestIdentity,
  testId = "sce-programme-dashboard-preview-org-context",
}: {
  label: string;
  crestIdentity?: ClubIdentity | null;
  testId?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2" data-testid={testId}>
      {crestIdentity ? (
        <ClubCrest
          identity={crestIdentity}
          density="compact"
          decorative
          className={SCE_ACTIVITY_LIST_ROW_SCALE.crestBoundsClass}
        />
      ) : null}
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
        {label}
      </SceTeamName>
    </div>
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
      <span className="min-w-0 break-words">{label}</span>
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
      <span className="min-w-0 break-words">{label}</span>
    </p>
  );
}