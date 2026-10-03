/**
 * SCE-PLANNER-UX-08-03 — Kalender = sporting activity time (Wann?).
 * Distinct from resource occupancy manipulation (08-02).
 */

import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { resourceSegmentDisplayWindow } from "@/lib/planning-hub/scheduler/resource-segment-display";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

/** Provider-owned schedule — must not mutate local kickoff in Standardplan. */
export const PROVIDER_PROTECTED_EVENT_SOURCES = new Set([
  "SFV",
  "CLUBCORNER_FVNWS",
  "CSV_EXCEL_IMPORT",
]);

export type ActivityScheduleAuthority =
  | "SCE_MANAGED"
  | "PROVIDER_MANAGED"
  | "ALTERNATIVE_PLAN_ONLY"
  | "NOT_SUPPORTED";

export type ActivityRescheduleValidation = {
  permitted: boolean;
  authority: ActivityScheduleAuthority;
  reason?: string;
};

export type ActivityRescheduleResourceImpactLine = {
  kind: "pitch" | "dressing";
  resourceName: string;
  beforeStart: Date;
  beforeEnd: Date;
  afterStart: Date;
  afterEnd: Date;
};

export type ActivityRescheduleImpact = {
  resourceLines: ActivityRescheduleResourceImpactLine[];
  /** Participation responses are kept; date/time change may affect RSVP semantics elsewhere. */
  participationNote: string | null;
  communicationNote: string | null;
};

export type ActivityRescheduleProposal = {
  activityId: string;
  activityType: Exclude<WeekplannerItem["type"], "VERANSTALTUNG">;
  timeTarget: "activity";
  currentStartAt: Date;
  currentEndAt: Date;
  proposedStartAt: Date;
  proposedEndAt: Date;
  durationMs: number;
  authority: ActivityScheduleAuthority;
  validation: ActivityRescheduleValidation;
  impacts: ActivityRescheduleImpact;
};

export function isActivityTimeDraft(draft: SchedulerDraftChange): boolean {
  return draft.timeTarget !== "resourceOccupancy";
}

export function resolveActivityScheduleAuthority(
  item: WeekplannerItem,
  ctx: Pick<ManipulationPermissionContext, "isStandardplan" | "alternativePlanId">,
): ActivityRescheduleValidation {
  if (item.type === "VERANSTALTUNG") {
    return {
      permitted: false,
      authority: "NOT_SUPPORTED",
      reason: "Veranstaltungen werden im Planungshub noch nicht verschoben.",
    };
  }

  if (!ctx.isStandardplan) {
    if (!ctx.alternativePlanId) {
      return {
        permitted: false,
        authority: "NOT_SUPPORTED",
        reason: "Kein Planungskontext.",
      };
    }
    return { permitted: true, authority: "ALTERNATIVE_PLAN_ONLY" };
  }

  if (item.type === "TRAINING") {
    return { permitted: true, authority: "SCE_MANAGED" };
  }

  if (item.type === "MATCH") {
    if (PROVIDER_PROTECTED_EVENT_SOURCES.has(item.eventSource)) {
      return {
        permitted: false,
        authority: "PROVIDER_MANAGED",
        reason:
          "Dieses Spiel wird vom Verband synchronisiert — Terminänderungen sind hier nicht möglich.",
      };
    }
    return { permitted: true, authority: "SCE_MANAGED" };
  }

  if (item.type === "TOURNAMENT") {
    return { permitted: true, authority: "SCE_MANAGED" };
  }

  return { permitted: false, authority: "NOT_SUPPORTED" };
}

function collectResourceRefs(item: WeekplannerItem): { kind: "pitch" | "dressing"; ref: WeekplannerResourceRef }[] {
  const lines: { kind: "pitch" | "dressing"; ref: WeekplannerResourceRef }[] = [];
  for (const ref of item.pitchAllocations) {
    lines.push({ kind: "pitch", ref });
  }
  for (const ref of item.dressingRoomAllocations) {
    lines.push({ kind: "dressing", ref });
  }
  if (item.type === "MATCH") {
    for (const ref of item.awayDressingRoomAllocations) {
      lines.push({ kind: "dressing", ref });
    }
  }
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      for (const ref of participant.dressingRoomAllocations) {
        lines.push({ kind: "dressing", ref });
      }
    }
  }
  return lines;
}

export function buildActivityRescheduleImpact(
  item: WeekplannerItem,
  proposedStart: Date,
  proposedEnd: Date,
): ActivityRescheduleImpact {
  const resourceLines: ActivityRescheduleResourceImpactLine[] = collectResourceRefs(item).map(
    ({ kind, ref }) => {
      const before = resourceSegmentDisplayWindow(item.startAt, item.endAt, ref);
      const after = resourceSegmentDisplayWindow(proposedStart, proposedEnd, ref);
      return {
        kind,
        resourceName: ref.name,
        beforeStart: before.startAt,
        beforeEnd: before.endAt,
        afterStart: after.startAt,
        afterEnd: after.endAt,
      };
    },
  );

  return {
    resourceLines,
    participationNote:
      item.type === "TRAINING" || item.type === "MATCH" || item.type === "TOURNAMENT"
        ? "Bestehende Rückmeldungen bleiben erhalten; Teilnehmende sollten über die Terminänderung informiert werden."
        : null,
    communicationNote:
      "Bereits versendete Mitteilungen werden nicht zurückgenommen.",
  };
}

export function buildActivityRescheduleProposal(
  draft: SchedulerDraftChange,
  ctx: Pick<ManipulationPermissionContext, "isStandardplan" | "alternativePlanId">,
): ActivityRescheduleProposal | null {
  if (!isActivityTimeDraft(draft)) return null;
  if (draft.item.type === "VERANSTALTUNG") return null;

  const validation = resolveActivityScheduleAuthority(draft.item, ctx);
  const activityType = draft.item.type;

  return {
    activityId:
      activityType === "TRAINING"
        ? draft.item.trainingSessionId
        : draft.item.eventId,
    activityType,
    timeTarget: "activity",
    currentStartAt: draft.originalStart,
    currentEndAt: draft.originalEnd,
    proposedStartAt: draft.proposedStart,
    proposedEndAt: draft.proposedEnd,
    durationMs: draft.proposedEnd.getTime() - draft.proposedStart.getTime(),
    authority: validation.authority,
    validation,
    impacts: buildActivityRescheduleImpact(draft.item, draft.proposedStart, draft.proposedEnd),
  };
}

export function activityIdForWeekplannerItem(item: WeekplannerItem): string {
  switch (item.type) {
    case "TRAINING":
      return item.trainingSessionId;
    case "MATCH":
    case "TOURNAMENT":
    case "VERANSTALTUNG":
      return item.eventId;
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}
