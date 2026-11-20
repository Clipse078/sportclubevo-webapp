import "server-only";

import { PersonMembershipStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TargetListItem } from "@/lib/targets/queries";
import type { MeetingListItem } from "@/lib/meetings/queries";
import type { PersonalTaskDto } from "@/lib/tasks/types";
import { ACTIVE_INBOX_STATUSES } from "@/lib/registrations/status";
import { getOverdueActions, type OverdueActionItem } from "@/lib/dashboard/governance-overview";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { getTaskManagementSummary } from "@/lib/tasks/management-service";
import { listMyTasks as listMyTasksService } from "@/lib/tasks/task-service";
import {
  computeStrategyDeliveryProgress,
  computeTargetDeliveryProgress,
  formatProgressCountLabel,
  type VereinsentwicklungProgressSnapshot,
} from "./vereinsentwicklung-workspace-progress";
import { parseStringArray } from "@/lib/visibility/visibility-filter";
import type { VereinsentwicklungOrgEinheitFilter } from "./vereinsentwicklung-workspace-org-filter";
import { CD_WORKSPACE_ORG_UNIT_QUERY, buildUebersichtHref } from "./vereinsentwicklung-connected-workspace";
import { buildVorhabenUndUmsetzungHref } from "./vereinsentwicklung-workspace-routing";

const COMPARISON_MONTHS = 12;

export type MembershipTrendKind = "up" | "down" | "flat" | "unavailable";

export type LeadershipMembershipKpis = {
  accessible: boolean;
  scopeLabel: string;
  headcount: number | null;
  standDateIso: string | null;
  currentPeriodLabel: string;
  entriesCurrent: number | null;
  entriesPrevious: number | null;
  exitsCurrent: number | null;
  exitsPrevious: number | null;
  trendKind: MembershipTrendKind;
  trendLabel: string | null;
  drillDownHref: string;
};

export type LeadershipTargetDeliveryRow = {
  id: string;
  title: string;
  href: string;
  progress: VereinsentwicklungProgressSnapshot;
  progressCaption: string;
};

export type LeadershipUmsetzungSnapshot = {
  activeTargetCount: number;
  aggregate: VereinsentwicklungProgressSnapshot;
  aggregateCaption: string;
  targetRows: LeadershipTargetDeliveryRow[];
  drillDownHref: string;
};

export type LeadershipActionRow = {
  id: string;
  title: string;
  href: string;
  meta: string;
  scope: "me" | "club";
  kind: "task_overdue" | "task_mine" | "registration" | "meeting_action";
};

export type LeadershipNextMeeting = {
  meeting: MeetingListItem;
  href: string;
} | null;

export type VereinsentwicklungLeadershipDashboard = {
  membership: LeadershipMembershipKpis;
  umsetzung: LeadershipUmsetzungSnapshot;
  actionRows: LeadershipActionRow[];
  nextMeeting: LeadershipNextMeeting;
  meetingsListHref: string;
  myOpenTaskCount: number | null;
  clubOverdueTaskCount: number | null;
};

function hasPermission(actor: ActorContext, key: string): boolean {
  return actor.permissionKeys.includes(key);
}

function orgQueryParams(orgEinheit: VereinsentwicklungOrgEinheitFilter | null): Record<string, string> {
  if (!orgEinheit) return {};
  return { [CD_WORKSPACE_ORG_UNIT_QUERY]: orgEinheit.id };
}

export function targetMatchesOrgEinheitFilter(
  target: TargetListItem,
  orgUnitId: string,
): boolean {
  const refs = parseStringArray(target.visibleOrgUnitRefs);
  return refs.includes(orgUnitId);
}

export function filterTargetsForOrgEinheit(
  targets: TargetListItem[],
  orgEinheit: VereinsentwicklungOrgEinheitFilter | null,
): TargetListItem[] {
  if (!orgEinheit) return targets;
  return targets.filter((t) => targetMatchesOrgEinheitFilter(t, orgEinheit.id));
}

function monthWindows(now: Date): {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
} {
  const currentEnd = now;
  const currentStart = new Date(now);
  currentStart.setUTCMonth(currentStart.getUTCMonth() - COMPARISON_MONTHS);
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(currentStart);
  previousStart.setUTCMonth(previousStart.getUTCMonth() - COMPARISON_MONTHS);
  const fmt = new Intl.DateTimeFormat("de-CH", { month: "short", year: "numeric", timeZone: "UTC" });
  const label = `${fmt.format(currentStart)} – ${fmt.format(currentEnd)}`;
  return { currentStart, currentEnd, previousStart, previousEnd, label };
}

async function loadScopedActiveMemberPersonIds(
  tenantId: string,
  orgUnitId: string | null,
): Promise<string[]> {
  if (!orgUnitId) {
    const rows = await prisma.personMembership.findMany({
      where: { tenantId, status: PersonMembershipStatus.ACTIVE },
      select: { personId: true },
      distinct: ["personId"],
    });
    return rows.map((r) => r.personId);
  }

  const assignments = await prisma.personAssignment.findMany({
    where: { tenantId, orgUnitId, status: "ACTIVE" },
    select: { personId: true },
    distinct: ["personId"],
  });
  const personIds = assignments.map((a) => a.personId);
  if (personIds.length === 0) return [];

  const active = await prisma.personMembership.findMany({
    where: {
      tenantId,
      personId: { in: personIds },
      status: PersonMembershipStatus.ACTIVE,
    },
    select: { personId: true },
    distinct: ["personId"],
  });
  return active.map((r) => r.personId);
}

async function countMembershipEvents(
  tenantId: string,
  personIds: string[] | null,
  field: "startsAt" | "endsAt",
  from: Date,
  to: Date,
): Promise<number> {
  const personFilter =
    personIds === null ? {} : personIds.length === 0 ? { personId: { in: [] as string[] } } : { personId: { in: personIds } };

  if (field === "startsAt") {
    return prisma.personMembership.count({
      where: {
        tenantId,
        ...personFilter,
        startsAt: { gte: from, lte: to },
      },
    });
  }

  return prisma.personMembership.count({
    where: {
      tenantId,
      ...personFilter,
      OR: [
        { status: PersonMembershipStatus.ENDED, endsAt: { gte: from, lte: to } },
        { endsAt: { gte: from, lte: to } },
      ],
    },
  });
}

export async function loadLeadershipMembershipKpis(
  actor: ActorContext,
  orgEinheit: VereinsentwicklungOrgEinheitFilter | null,
  now = new Date(),
): Promise<LeadershipMembershipKpis> {
  const scopeLabel = orgEinheit ? orgEinheit.label : "Vereinsweit";
  const drillDownHref = "/dashboard/personen";

  if (!actor.tenantId || !hasPermission(actor, PERMISSIONS.PEOPLE_VIEW)) {
    return {
      accessible: false,
      scopeLabel,
      headcount: null,
      standDateIso: null,
      currentPeriodLabel: "",
      entriesCurrent: null,
      entriesPrevious: null,
      exitsCurrent: null,
      exitsPrevious: null,
      trendKind: "unavailable",
      trendLabel: null,
      drillDownHref,
    };
  }

  const tenantId = actor.tenantId;
  const orgScoped = Boolean(orgEinheit);
  const personIds = orgScoped
    ? await loadScopedActiveMemberPersonIds(tenantId, orgEinheit!.id)
    : await loadScopedActiveMemberPersonIds(tenantId, null);

  const headcount = orgScoped ? personIds.length : personIds.length;

  const latest = await prisma.personMembership.findFirst({
    where: { tenantId, status: PersonMembershipStatus.ACTIVE },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const windows = monthWindows(now);
  const scopePersonIds = orgScoped ? personIds : null;
  const [entriesCurrent, entriesPrevious, exitsCurrent, exitsPrevious, historyProbe] =
    await Promise.all([
      countMembershipEvents(tenantId, scopePersonIds, "startsAt", windows.currentStart, windows.currentEnd),
      countMembershipEvents(tenantId, scopePersonIds, "startsAt", windows.previousStart, windows.previousEnd),
      countMembershipEvents(tenantId, scopePersonIds, "endsAt", windows.currentStart, windows.currentEnd),
      countMembershipEvents(tenantId, scopePersonIds, "endsAt", windows.previousStart, windows.previousEnd),
      prisma.personMembership.findFirst({
        where: {
          tenantId,
          startsAt: { lt: windows.previousStart },
        },
        select: { id: true },
      }),
    ]);

  let trendKind: MembershipTrendKind = "unavailable";
  let trendLabel: string | null = "Keine Verlaufsdaten";
  if (historyProbe) {
    const netCurrent = entriesCurrent - exitsCurrent;
    const netPrevious = entriesPrevious - exitsPrevious;
    if (netCurrent > netPrevious) {
      trendKind = "up";
      trendLabel = "Mehr Netto-Eintritte als im Vorjahresfenster";
    } else if (netCurrent < netPrevious) {
      trendKind = "down";
      trendLabel = "Weniger Netto-Eintritte als im Vorjahresfenster";
    } else {
      trendKind = "flat";
      trendLabel = "Stabiler Netto-Verlauf im Vergleichszeitraum";
    }
  }

  return {
    accessible: true,
    scopeLabel,
    headcount,
    standDateIso: (latest?.updatedAt ?? now).toISOString(),
    currentPeriodLabel: windows.label,
    entriesCurrent,
    entriesPrevious,
    exitsCurrent,
    exitsPrevious,
    trendKind,
    trendLabel,
    drillDownHref,
  };
}


export async function loadLeadershipUmsetzung(
  actor: ActorContext,
  activeTargets: TargetListItem[],
  orgEinheit: VereinsentwicklungOrgEinheitFilter | null,
): Promise<LeadershipUmsetzungSnapshot> {
  const scoped = filterTargetsForOrgEinheit(activeTargets, orgEinheit);
  const targetIds = scoped.map((t) => t.id);
  const aggregate = await computeStrategyDeliveryProgress(actor, targetIds);
  const aggregateCaption = formatProgressCountLabel(aggregate);

  const targetRows: LeadershipTargetDeliveryRow[] = [];
  for (const target of scoped.slice(0, 5)) {
    const progress = await computeTargetDeliveryProgress(actor, target.id);
    const q = orgQueryParams(orgEinheit);
    const qs = new URLSearchParams(q).toString();
    const suffix = qs ? `?${qs}` : "";
    targetRows.push({
      id: target.id,
      title: target.title,
      href: `/vereinsleitung/targets/${encodeURIComponent(target.id)}${suffix}`,
      progress,
      progressCaption: formatProgressCountLabel(progress),
    });
  }

  const drillDownHref = buildVorhabenUndUmsetzungHref("aufgaben", orgQueryParams(orgEinheit));

  return {
    activeTargetCount: scoped.length,
    aggregate,
    aggregateCaption,
    targetRows,
    drillDownHref,
  };
}

async function loadOverduePersonalTasks(
  actor: ActorContext,
  tenantId: string,
  now: Date,
): Promise<PersonalTaskDto[]> {
  const taskCtx = await buildTaskServiceContextForActor(actor.userId, tenantId);
  if (!taskCtx) return [];
  return listMyTasksService(taskCtx, { openOnly: true, limit: 20, now }).then((tasks) =>
    tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now),
  );
}

export async function loadLeadershipActionRows(
  actor: ActorContext,
  now = new Date(),
): Promise<LeadershipActionRow[]> {
  const rows: LeadershipActionRow[] = [];
  const tenantId = actor.tenantId;
  if (!tenantId) return rows;

  if (hasPermission(actor, PERMISSIONS.TASKS_VIEW) || hasPermission(actor, PERMISSIONS.TASKS_MANAGE)) {
    const taskCtx = await buildTaskServiceContextForActor(actor.userId, tenantId);
    if (taskCtx) {
      const myOverdue = await loadOverduePersonalTasks(actor, tenantId, now);
      for (const task of myOverdue.slice(0, 5)) {
        rows.push({
          id: `task-me-${task.id}`,
          title: task.title,
          href: "/dashboard/aufgaben",
          meta: task.dueAt ? `Fällig ${new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(task.dueAt))}` : "Überfällig",
          scope: "me",
          kind: "task_overdue",
        });
      }
    }
  }

  if (hasPermission(actor, PERMISSIONS.REGISTRATIONS_VIEW)) {
    const pending = await prisma.registration.findMany({
      where: {
        tenantId,
        status: { in: ACTIVE_INBOX_STATUSES as RegistrationStatus[] },
      },
      orderBy: { submittedAt: "asc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, status: true },
    });
    for (const reg of pending) {
      rows.push({
        id: `reg-${reg.id}`,
        title: `${reg.firstName} ${reg.lastName}`.trim() || "Anmeldung",
        href: "/dashboard/registrations",
        meta: "Mitgliedschaft · offen",
        scope: "club",
        kind: "registration",
      });
    }
  }

  if (hasPermission(actor, PERMISSIONS.MEETINGS_VIEW) || hasPermission(actor, PERMISSIONS.MEETINGS_MANAGE)) {
    const overdueActions: OverdueActionItem[] = await getOverdueActions(actor);
    for (const action of overdueActions.slice(0, 5)) {
      rows.push({
        id: `ma-${action.id}`,
        title: action.title,
        href: `/vereinsleitung/meetings/${encodeURIComponent(action.meetingSlug)}`,
        meta: `${action.meetingTitle} · Sitzungsmassnahme`,
        scope: "club",
        kind: "meeting_action",
      });
    }
  }

  return rows;
}

export async function loadVereinsentwicklungLeadershipDashboard(input: {
  actor: ActorContext;
  activeTargets: TargetListItem[];
  upcomingMeetings: MeetingListItem[];
  orgEinheit: VereinsentwicklungOrgEinheitFilter | null;
  now?: Date;
}): Promise<VereinsentwicklungLeadershipDashboard> {
  const now = input.now ?? new Date();
  const { actor, activeTargets, upcomingMeetings, orgEinheit } = input;

  const [membership, umsetzung, actionRows] = await Promise.all([
    loadLeadershipMembershipKpis(actor, orgEinheit, now),
    loadLeadershipUmsetzung(actor, activeTargets, orgEinheit),
    loadLeadershipActionRows(actor, now),
  ]);

  let myOpenTaskCount: number | null = null;
  let clubOverdueTaskCount: number | null = null;
  if (actor.tenantId) {
    const taskCtx = await buildTaskServiceContextForActor(actor.userId, actor.tenantId);
    if (taskCtx) {
      try {
        const summary = await getTaskManagementSummary(taskCtx, "Europe/Zurich", now);
        myOpenTaskCount = summary.myOpen;
        clubOverdueTaskCount = summary.overdue;
      } catch {
        myOpenTaskCount = null;
        clubOverdueTaskCount = null;
      }
    }
  }

  const next = upcomingMeetings[0] ?? null;
  const nextMeeting: LeadershipNextMeeting = next
    ? { meeting: next, href: `/vereinsleitung/meetings/${encodeURIComponent(next.slug)}` }
    : null;

  return {
    membership,
    umsetzung,
    actionRows,
    nextMeeting,
    meetingsListHref: "/vereinsleitung/meetings",
    myOpenTaskCount,
    clubOverdueTaskCount,
  };
}

export function buildLeadershipUebersichtHref(orgEinheit: VereinsentwicklungOrgEinheitFilter | null): string {
  return buildUebersichtHref(orgQueryParams(orgEinheit));
}