import type { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { buildActorContext } from "@/lib/visibility/actor-context";
import { loadOrgUnitIds, loadTargetGroupIds } from "@/lib/org/queries";
import { searchWorkspaceDocumentsForTaskLink } from "@/lib/workspace/document-access";
import { canAttachTaskContext } from "./context-access";
import { isSupportedTaskContextType } from "./context-registry";
import type { TaskServiceContext } from "./types";

export type TaskContextOption = {
  id: string;
  label: string;
  secondary: string | null;
};

const DEFAULT_LIMIT = 20;

export async function searchTaskContextOptions(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<TaskContextOption[]> {
  if (!isSupportedTaskContextType(contextType)) return [];
  if (!canAttachTaskContext(ctx, contextType)) return [];

  const q = query.trim();
  const take = Math.min(Math.max(limit, 1), 50);

  switch (contextType) {
    case "MATCH":
      return searchEvents(ctx, "MATCH", q, take);
    case "TOURNAMENT":
      return searchEvents(ctx, "TOURNAMENT", q, take);
    case "CLUB_EVENT":
      return searchEvents(ctx, "OTHER", q, take);
    case "TRAINING":
      return searchTrainingSeries(ctx, q, take);
    case "TEAM":
      return searchTeams(ctx, q, take);
    case "PERSON":
      return searchPersons(ctx, q, take);
    case "DOCUMENT":
      return searchDocuments(ctx, q, take);
    case "MEETING":
      return searchMeetings(ctx, q, take);
    case "REGISTRATION":
      return searchRegistrations(ctx, q, take);
    default:
      return [];
  }
}

async function searchEvents(
  ctx: TaskServiceContext,
  eventType: "MATCH" | "TOURNAMENT" | "OTHER",
  query: string,
  take: number,
): Promise<TaskContextOption[]> {
  const rows = await prisma.event.findMany({
    where: {
      tenantId: ctx.tenantId,
      type: eventType,
      ...(query
        ? { title: { contains: query, mode: "insensitive" } }
        : {}),
    },
    orderBy: { startAt: "desc" },
    take,
    select: { id: true, title: true, startAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.title,
    secondary: row.startAt.toISOString().slice(0, 10),
  }));
}

async function searchTrainingSeries(
  ctx: TaskServiceContext,
  query: string,
  take: number,
): Promise<TaskContextOption[]> {
  const rows = await prisma.trainingSeries.findMany({
    where: {
      tenantId: ctx.tenantId,
      archivedAt: null,
      ...(query
        ? { title: { contains: query, mode: "insensitive" } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: { id: true, title: true, startsAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.title,
    secondary: row.startsAt,
  }));
}

async function searchTeams(
  ctx: TaskServiceContext,
  query: string,
  take: number,
): Promise<TaskContextOption[]> {
  const rows = await prisma.team.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: { id: true, name: true, shortName: true },
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    secondary: row.shortName,
  }));
}

async function searchPersons(
  ctx: TaskServiceContext,
  query: string,
  take: number,
): Promise<TaskContextOption[]> {
  const rows = await prisma.person.findMany({
    where: {
      tenantId: ctx.tenantId,
      isActive: true,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { displayName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take,
    select: { id: true, firstName: true, lastName: true, displayName: true },
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
    secondary: null,
  }));
}

async function searchDocuments(
  ctx: TaskServiceContext,
  query: string,
  take: number,
): Promise<TaskContextOption[]> {
  const rows = await searchWorkspaceDocumentsForTaskLink(ctx, query, take);
  return rows.map((row) => ({
    id: row.id,
    label: row.title,
    secondary: row.folderBreadcrumb,
  }));
}

async function searchRegistrations(
  ctx: TaskServiceContext,
  query: string,
  take: number,
): Promise<TaskContextOption[]> {
  const rows = await prisma.registration.findMany({
    where: {
      tenantId: ctx.tenantId,
      archivedAt: null,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, firstName: true, lastName: true, status: true },
  });
  return rows.map((row) => ({
    id: row.id,
    label: `${row.firstName} ${row.lastName}`.trim(),
    secondary: row.status,
  }));
}

async function searchMeetings(
  ctx: TaskServiceContext,
  query: string,
  take: number,
): Promise<TaskContextOption[]> {
  const [orgUnitIds, targetGroupIds] = await Promise.all([
    loadOrgUnitIds(ctx.userId, ctx.tenantId),
    loadTargetGroupIds(ctx.userId, ctx.tenantId),
  ]);
  const actor = buildActorContext(
    { id: ctx.userId, roleKeys: [], permissionKeys: [...ctx.permissionKeys] },
    orgUnitIds,
    targetGroupIds,
    ctx.tenantId,
  );

  const rows = await prisma.meeting.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: { meetingDate: "desc" },
    take: take * 3,
    select: {
      id: true,
      title: true,
      meetingDate: true,
      visibilityScope: true,
      createdByUserId: true,
      visibleRoleRefs: true,
      visibleUserRefs: true,
      visibleTeamRefs: true,
      visibleOrgUnitRefs: true,
      visiblePersonRefs: true,
      visibleTargetGroupRefs: true,
    },
  });

  const options: TaskContextOption[] = [];
  for (const row of rows) {
    if (!canSeeMeeting(row, actor)) continue;
    options.push({
      id: row.id,
      label: row.title,
      secondary: row.meetingDate.toISOString().slice(0, 10),
    });
    if (options.length >= take) break;
  }
  return options;
}
