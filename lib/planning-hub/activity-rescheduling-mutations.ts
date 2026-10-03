/**
 * SCE-PLANNER-UX-08-03 — canonical client/server activity-time apply helpers.
 */

import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerOverrideRow } from "@/components/admin/planner/WeekplannerAllocationOverrideEditor";
import {
  resolveActivityScheduleAuthority,
  isActivityTimeDraft,
} from "@/lib/planning-hub/planning-activity-rescheduling";
import { isoToLocalDate, isoToLocalTime } from "@/lib/planning-hub/planner-time";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { applyAlternativePlanSchedulerDraft } from "@/lib/planning-hub/operational-planning-mutations";
import { applyStandardPlanSchedulerDraft } from "@/lib/planning-hub/canonical-planning-mutations";

export class ActivityRescheduleForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActivityRescheduleForbiddenError";
  }
}

function timeChanged(draft: SchedulerDraftChange): boolean {
  return (
    draft.proposedStart.getTime() !== draft.originalStart.getTime() ||
    draft.proposedEnd.getTime() !== draft.originalEnd.getTime()
  );
}

export function assertActivityReschedulePermitted(
  draft: SchedulerDraftChange,
  isStandardplan: boolean,
  alternativePlanId: string | null,
): void {
  if (!isActivityTimeDraft(draft) || !timeChanged(draft)) return;
  const validation = resolveActivityScheduleAuthority(draft.item, {
    isStandardplan,
    alternativePlanId,
  });
  if (!validation.permitted) {
    throw new ActivityRescheduleForbiddenError(
      validation.reason ?? "Terminverschiebung ist nicht erlaubt.",
    );
  }
}

export type ApplyActivityRescheduleContext = {
  isStandardplan: boolean;
  alternativePlanId: string | null;
  resourceCategory: PlanningHubUrlState["resourceCategory"];
  facilityGroups: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  overridesByKey: Record<string, WeekplannerOverrideRow[]>;
  timeZone: string;
};

/** Single entry for Kalender activity-time mutations (DnD and Termin ändern). */
export async function applyPlanningHubActivityRescheduleDraft(
  draft: SchedulerDraftChange,
  ctx: ApplyActivityRescheduleContext,
): Promise<void> {
  assertActivityReschedulePermitted(draft, ctx.isStandardplan, ctx.alternativePlanId);

  if (ctx.isStandardplan) {
    await applyStandardPlanSchedulerDraft(
      draft,
      ctx.resourceCategory,
      ctx.facilityGroups,
      ctx.timeZone,
    );
    return;
  }

  if (!ctx.alternativePlanId) {
    throw new ActivityRescheduleForbiddenError("Kein Alternativplan ausgewählt.");
  }

  await applyAlternativePlanSchedulerDraft(
    draft,
    ctx.alternativePlanId,
    ctx.resourceCategory,
    ctx.overridesByKey,
    ctx.timeZone,
  );
}

export async function applyMatchActivityTime(
  eventId: string,
  startAt: Date,
  endAt: Date,
): Promise<void> {
  const res = await fetch(`/api/matchcenter/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Spielzeit konnte nicht gespeichert werden.");
  }
}

export async function applyTournamentActivityTime(
  eventId: string,
  startAt: Date,
  endAt: Date,
): Promise<void> {
  const res = await fetch(`/api/tournaments/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Turnierzeit konnte nicht gespeichert werden.");
  }
}

export async function applyTrainingActivityTime(
  sessionId: string,
  startAt: Date,
  endAt: Date,
  timeZone: string,
): Promise<void> {
  const res = await fetch(`/api/training-sessions/${sessionId}/reschedule`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: isoToLocalDate(startAt, timeZone),
      startsAt: isoToLocalTime(startAt, timeZone),
      endsAt: isoToLocalTime(endAt, timeZone),
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Zeitänderung fehlgeschlagen.");
  }
}
