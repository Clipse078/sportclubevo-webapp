/**
 * AUFGABEN-06E — canonical Task Context Registry (single registration point).
 *
 * Domain-specific behavior is delegated per context type; this module wires the platform contract.
 */

import "server-only";

import type { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { loadOrgUnitIds, loadTargetGroupIds } from "@/lib/org/queries";
import { buildActorContext } from "@/lib/visibility/actor-context";
import { canReadWorkspaceDocument } from "@/lib/workspace/document-access";
import { searchWorkspaceDocumentsForTaskLink } from "@/lib/workspace/document-access";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  SUPPORTED_TASK_CONTEXT_TYPES,
  type SupportedTaskContextType,
} from "./task-context-types";
import type { TaskServiceContext } from "./types";

export type TaskContextOption = {
  id: string;
  label: string;
  secondary: string | null;
};

export type { SupportedTaskContextType };
export { SUPPORTED_TASK_CONTEXT_TYPES };

export type TaskContextRegistryEntry = {
  type: SupportedTaskContextType;
  operationalReadPermission: string;
  buildHref: (entity: {
    id: string;
    slug?: string | null;
    tenantKey?: string | null;
  }) => string | null;
  validateAttachable: (ctx: TaskServiceContext, id: string) => Promise<boolean>;
  /** Entity readability for related Task reads; defaults to attachable semantics per domain. */
  validateReadable?: (ctx: TaskServiceContext, id: string) => Promise<boolean>;
  searchOptions: (
    ctx: TaskServiceContext,
    query: string,
    limit: number,
  ) => Promise<TaskContextOption[]>;
};

async function buildMeetingActor(ctx: TaskServiceContext) {
  const [orgUnitIds, targetGroupIds] = await Promise.all([
    loadOrgUnitIds(ctx.userId, ctx.tenantId),
    loadTargetGroupIds(ctx.userId, ctx.tenantId),
  ]);
  return buildActorContext(
    { id: ctx.userId, roleKeys: [], permissionKeys: [...ctx.permissionKeys] },
    orgUnitIds,
    targetGroupIds,
    ctx.tenantId,
  );
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
      ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
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

export const TASK_CONTEXT_REGISTRY: TaskContextRegistryEntry[] = [
  {
    type: "MATCH",
    operationalReadPermission: PERMISSIONS.EVENTS_VIEW,
    buildHref: (entity) => `/dashboard/matchcenter/${encodeURIComponent(entity.id)}`,
    validateAttachable: async (ctx, id) =>
      Boolean(
        await prisma.event.findFirst({
          where: { id, tenantId: ctx.tenantId, type: "MATCH" },
          select: { id: true },
        }),
      ),
    searchOptions: (ctx, query, limit) => searchEvents(ctx, "MATCH", query, limit),
  },
  {
    type: "TOURNAMENT",
    operationalReadPermission: PERMISSIONS.EVENTS_VIEW,
    buildHref: (entity) =>
      `/dashboard/tournamentcenter/${encodeURIComponent(entity.id)}/edit`,
    validateAttachable: async (ctx, id) =>
      Boolean(
        await prisma.event.findFirst({
          where: { id, tenantId: ctx.tenantId, type: "TOURNAMENT" },
          select: { id: true },
        }),
      ),
    searchOptions: (ctx, query, limit) => searchEvents(ctx, "TOURNAMENT", query, limit),
  },
  {
    type: "CLUB_EVENT",
    operationalReadPermission: PERMISSIONS.EVENTS_VIEW,
    buildHref: (entity) => getVeranstaltungHref(entity.id),
    validateAttachable: async (ctx, id) =>
      Boolean(
        await prisma.event.findFirst({
          where: { id, tenantId: ctx.tenantId, type: "OTHER" },
          select: { id: true },
        }),
      ),
    searchOptions: (ctx, query, limit) => searchEvents(ctx, "OTHER", query, limit),
  },
  {
    type: "TRAINING",
    operationalReadPermission: PERMISSIONS.TRAININGS_VIEW,
    buildHref: (entity) =>
      `/dashboard/training/series/${encodeURIComponent(entity.id)}/edit`,
    validateAttachable: async (ctx, id) =>
      Boolean(
        await prisma.trainingSeries.findFirst({
          where: { id, tenantId: ctx.tenantId },
          select: { id: true },
        }),
      ),
    searchOptions: async (ctx, query, limit) => {
      const rows = await prisma.trainingSeries.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
        },
        orderBy: { startsAt: "desc" },
        take: limit,
        select: { id: true, title: true, startsAt: true, endsAt: true },
      });
      return rows.map((row) => ({
        id: row.id,
        label: row.title,
        secondary: `${row.startsAt}–${row.endsAt}`,
      }));
    },
  },
  {
    type: "MEETING",
    operationalReadPermission: PERMISSIONS.MEETINGS_VIEW,
    buildHref: (entity) =>
      entity.slug
        ? `/vereinsleitung/meetings/${encodeURIComponent(entity.slug)}/edit`
        : null,
    validateAttachable: async (ctx, id) => {
      const meeting = await prisma.meeting.findFirst({
        where: { id, tenantId: ctx.tenantId },
        select: {
          id: true,
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
      if (!meeting) return false;
      const actor = await buildMeetingActor(ctx);
      return canSeeMeeting(meeting, actor);
    },
    searchOptions: async (ctx, query, limit) => {
      const actor = await buildMeetingActor(ctx);
      const rows = await prisma.meeting.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
        },
        orderBy: { meetingDate: "desc" },
        take: limit * 3,
        select: {
          id: true,
          title: true,
          meetingDate: true,
          slug: true,
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
      return rows
        .filter((row) => canSeeMeeting(row, actor))
        .slice(0, limit)
        .map((row) => ({
          id: row.id,
          label: row.title,
          secondary: row.meetingDate.toISOString().slice(0, 10),
        }));
    },
  },
  {
    type: "REGISTRATION",
    operationalReadPermission: PERMISSIONS.REGISTRATIONS_VIEW,
    buildHref: (entity) =>
      entity.tenantKey
        ? `/tenant/${encodeURIComponent(entity.tenantKey)}/cockpit/registrations/${encodeURIComponent(entity.id)}`
        : null,
    validateAttachable: async (ctx, id) =>
      Boolean(
        await prisma.registration.findFirst({
          where: { id, tenantId: ctx.tenantId },
          select: { id: true },
        }),
      ),
    searchOptions: async (ctx, query, limit) => {
      const rows = await prisma.registration.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, firstName: true, lastName: true },
      });
      return rows.map((row) => ({
        id: row.id,
        label: `${row.firstName} ${row.lastName}`.trim(),
        secondary: null,
      }));
    },
  },
  {
    type: "TEAM",
    operationalReadPermission: PERMISSIONS.TEAMS_VIEW,
    buildHref: (entity) => `/dashboard/teams/${encodeURIComponent(entity.id)}`,
    validateAttachable: async (ctx, id) =>
      Boolean(
        await prisma.team.findFirst({
          where: { id, tenantId: ctx.tenantId },
          select: { id: true },
        }),
      ),
    searchOptions: async (ctx, query, limit) => {
      const rows = await prisma.team.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        },
        orderBy: { name: "asc" },
        take: limit,
        select: { id: true, name: true },
      });
      return rows.map((row) => ({ id: row.id, label: row.name, secondary: null }));
    },
  },
  {
    type: "PERSON",
    operationalReadPermission: PERMISSIONS.PEOPLE_VIEW,
    buildHref: (entity) => `/dashboard/persons/${encodeURIComponent(entity.id)}`,
    validateAttachable: async (ctx, id) =>
      Boolean(
        await prisma.person.findFirst({
          where: { id, tenantId: ctx.tenantId },
          select: { id: true },
        }),
      ),
    searchOptions: async (ctx, query, limit) => {
      const rows = await prisma.person.findMany({
        where: {
          tenantId: ctx.tenantId,
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
        take: limit,
        select: { id: true, firstName: true, lastName: true, displayName: true },
      });
      return rows.map((row) => ({
        id: row.id,
        label: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
        secondary: null,
      }));
    },
  },
  {
    type: "DOCUMENT",
    operationalReadPermission: PERMISSIONS.WORKSPACE_VIEW,
    buildHref: (entity) => `/dashboard/workspace?document=${encodeURIComponent(entity.id)}`,
    validateAttachable: async (ctx, id) => canReadWorkspaceDocument(ctx, id),
    searchOptions: async (ctx, query, limit) => {
      const rows = await searchWorkspaceDocumentsForTaskLink(ctx, query, limit);
      return rows.map((row) => ({
        id: row.id,
        label: row.title,
        secondary: row.folderBreadcrumb,
      }));
    },
  },
];

const registryByType = new Map<TaskContextType, TaskContextRegistryEntry>(
  TASK_CONTEXT_REGISTRY.map((entry) => [entry.type, entry]),
);

export function getTaskContextRegistryEntry(
  type: TaskContextType,
): TaskContextRegistryEntry | null {
  return registryByType.get(type) ?? null;
}

export function operationalReadPermissionForContext(type: TaskContextType): string | null {
  const entry = getTaskContextRegistryEntry(type);
  return entry?.operationalReadPermission ?? null;
}

export function buildOperationalContextHref(
  type: TaskContextType,
  entity: {
    id: string;
    slug?: string | null;
    tenantKey?: string | null;
  },
): string | null {
  const entry = getTaskContextRegistryEntry(type);
  if (!entry) return null;
  return entry.buildHref(entity);
}

export async function validateTaskContextAttachable(
  ctx: TaskServiceContext,
  type: TaskContextType,
  id: string,
): Promise<boolean> {
  const entry = getTaskContextRegistryEntry(type);
  if (!entry) return false;
  return entry.validateAttachable(ctx, id);
}

export async function validateTaskContextReadable(
  ctx: TaskServiceContext,
  type: TaskContextType,
  id: string,
): Promise<boolean> {
  const entry = getTaskContextRegistryEntry(type);
  if (!entry) return false;
  const validate = entry.validateReadable ?? entry.validateAttachable;
  return validate(ctx, id);
}

export async function searchTaskContextOptionsForType(
  ctx: TaskServiceContext,
  type: TaskContextType,
  query: string,
  limit: number,
): Promise<TaskContextOption[]> {
  const entry = getTaskContextRegistryEntry(type);
  if (!entry) return [];
  return entry.searchOptions(ctx, query, limit);
}
