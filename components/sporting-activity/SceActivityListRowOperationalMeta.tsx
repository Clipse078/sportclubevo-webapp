"use client";

import type { ReactNode } from "react";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { PlanningResourceAssignmentKindIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { SCE_ACTIVITY_LIST_ROW_SCALE } from "@/lib/sporting-activity-presentation/canonical/activity-card-list-row-scale";

type OperationalMetaRowProps = {
  className?: string;
  children: ReactNode;
  testId?: string;
};

export function SceActivityListRowOperationalMetaRow({
  className,
  children,
  testId = "sce-activity-list-row-operational-meta",
}: OperationalMetaRowProps) {
  return (
    <div
      className={cn(SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaRowClass, className)}
      data-testid={testId}
      data-sce-activity-region="operational-meta"
    >
      {children}
    </div>
  );
}

/** Canonical Mein Programm row 2 — team(s) / org unit(s) involved. */
export function SceActivityListRowOrganizationalContext({
  label,
  testId = "sce-activity-list-row-org-context",
}: {
  label: string;
  testId?: string;
}) {
  return (
    <p
      className={SCE_ACTIVITY_LIST_ROW_SCALE.teamContextClass}
      data-testid={testId}
      data-sce-activity-region="organizational-context"
      title={label}
    >
      {label}
    </p>
  );
}

/** Canonical Mein Programm row 1 — activity identity + club crest(s). */
export function SceActivityListRowPrimaryIdentityRow({
  title,
  crest,
  testId = "sce-activity-list-row-primary-identity",
  titleTestId,
}: {
  title: string;
  crest?: ReactNode;
  testId?: string;
  titleTestId?: string;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-2"
      data-sce-activity-region="primary-identity"
      data-testid={testId}
    >
      {crest}
      <p
        className={cn(SCE_ACTIVITY_LIST_ROW_SCALE.primaryTitleClass, "line-clamp-2 flex-1")}
        data-testid={titleTestId}
        title={title}
      >
        {title}
      </p>
    </div>
  );
}

export function SceActivityListRowTimeMeta({
  label,
  testId = "sce-activity-list-row-time",
}: {
  label: string;
  testId?: string;
}) {
  return (
    <span className={SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaItemClass} data-testid={testId}>
      <Clock className={SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaIconClass} aria-hidden />
      <span className={SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaTimeClass}>{label}</span>
    </span>
  );
}

export function SceActivityListRowLocationMeta({
  label,
  testId = "sce-activity-list-row-location",
}: {
  label: string;
  testId?: string;
}) {
  return (
    <span className={SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaItemClass} data-testid={testId}>
      <MapPin className={SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaIconClass} aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

export function SceActivityListRowDressingRoomMeta({
  label,
  testId = "sce-activity-list-row-dressing-room",
}: {
  label: string;
  testId?: string;
}) {
  return (
    <span className={SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaItemClass} data-testid={testId}>
      <PlanningResourceAssignmentKindIcon
        kind="dressing_room"
        compact
        semanticColors={false}
        className={SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaIconClass}
        testId="sce-activity-list-row-dressing-room-icon"
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
