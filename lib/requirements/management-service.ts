/**
 * AUFGABEN-06G2 — Requirement management queries (list, summary, recipient matrix).
 */

import type { Prisma, RequirementResolutionStatus, RequirementStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canAccessRequirementManagement } from "./access";
import {
  canListRequirementRecipients,
  canManageRequirement,
  canReadRequirement,
  canReadRequirementAggregate,
} from "./requirement-authorization";
import { computeRequirementAggregate, isRequirementRecipientOverdue } from "./requirement-aggregate";
import { isRequirementDueAtOverdue, openRequirementRecipientOverdueWhere } from "./requirement-deadlines";
import {
  resolveRequirementRecipientManagementStatus,
  sortRequirementRecipientMatrixRows,
  type RequirementRecipientMatrixSort,
} from "./recipient-progress-presentation";
import { RequirementForbiddenError } from "./errors";
import type { RequirementAggregateDto, RequirementDto, RequirementServiceContext } from "./types";
import { loadRequirementAudienceLabels } from "./audience-selector-search";
import { loadRequirementPersonNameMap, loadRequirementPersonOptionsByIds } from "./person-search";
import {
  REQUIREMENT_MANAGEMENT_PAGE_SIZE,
  type RequirementManagementQueryState,
  type RequirementManagementSort,
} from "./management-navigation";
import {
  formatTaskCreatorDisplayName,
  resolveTaskCreatorDisplayNamesByUserIds,
} from "@/lib/tasks/task-creator-display";

const REQUIREMENT_INCLUDE = {
  draftAudience: { select: { personId: true } },
  draftAudienceTeams: { select: { teamId: true } },
  draftAudienceOrgUnits: { select: { orgUnitId: true } },
  draftAudienceRoles: { select: { roleId: true } },
  draftAudienceTargetGroups: { select: { targetGroupId: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

type RequirementRow = Prisma.RequirementGetPayload<{ include: typeof REQUIREMENT_INCLUDE }>;

export type RequirementManagementSummary = {
  active: number;
  openRecipients: number;
  overdue: number;
  completed: number;
};

export type RequirementManagementListItem = {
  requirement: RequirementDto;
  aggregate: RequirementAggregateDto | null;
  creatorLabel: string | null;
  isOverdue: boolean;
};

export type RequirementRecipientMatrixRow = {
  id: string;
  subjectPersonId: string;
  subjectDisplayName: string;
  resolutionStatus: RequirementResolutionStatus;
  responseValue: string | null;
  respondedAt: string | null;
  responseActorPersonId: string | null;
  actorDisplayName: string | null;
  dueAt: string | null;
  isOverdue: boolean;
  managementStatus: ReturnType<typeof resolveRequirementRecipientManagementStatus>;
};

export type RequirementRecipientMatrixFilter = "ALL" | "OPEN" | "ACKNOWLEDGED" | "OVERDUE";

export type { RequirementRecipientMatrixSort };

function mapRequirement(row: RequirementRow): RequirementDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    status: row.status,
    responseMode: row.responseMode,
    dueAt: row.dueAt?.toISOString() ?? null,
    reminder1At: row.reminder1At?.toISOString() ?? null,
    reminder2At: row.reminder2At?.toISOString() ?? null,
    reminder1PresetKey: row.reminder1PresetKey,
    reminder2PresetKey: row.reminder2PresetKey,
    remindersConfigured: row.remindersConfigured,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    draftAudiencePersonIds: row.draftAudience.map((a) => a.personId),
    draftAudienceTeamIds: row.draftAudienceTeams?.map((a) => a.teamId) ?? [],
    draftAudienceOrgUnitIds: row.draftAudienceOrgUnits?.map((a) => a.orgUnitId) ?? [],
    draftAudienceRoleIds: row.draftAudienceRoles?.map((a) => a.roleId) ?? [],
    draftAudienceTargetGroupIds: row.draftAudienceTargetGroups?.map((a) => a.targetGroupId) ?? [],
  };
}

async function resolveRequirementCreatorLabel(
  tenantId: string,
  createdByUserId: string | null,
): Promise<string | null> {
  if (!createdByUserId) return null;
  const names = await resolveTaskCreatorDisplayNamesByUserIds(tenantId, [createdByUserId]);
  return formatTaskCreatorDisplayName(createdByUserId, names);
}

async function loadAggregatesBatch(
  tenantId: string,
  requirementIds: readonly string[],
): Promise<Map<string, RequirementAggregateDto>> {
  const map = new Map<string, RequirementAggregateDto>();
  if (requirementIds.length === 0) return map;

  await Promise.all(
    requirementIds.map(async (requirementId) => {
      const aggregate = await computeRequirementAggregate(prisma, tenantId, requirementId);
      map.set(requirementId, aggregate);
    }),
  );
  return map;
}

function sortListItems(
  items: RequirementManagementListItem[],
  sort: RequirementManagementSort,
): RequirementManagementListItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "TITLE_ASC":
        return a.requirement.title.localeCompare(b.requirement.title, "de");
      case "CREATED_DESC":
        return b.requirement.createdAt.localeCompare(a.requirement.createdAt);
      case "PROGRESS_DESC": {
        const pa = a.aggregate?.resolvedPercent ?? -1;
        const pb = b.aggregate?.resolvedPercent ?? -1;
        return pa - pb;
      }
      case "DEADLINE_ASC":
      default: {
        const da = a.requirement.dueAt ? Date.parse(a.requirement.dueAt) : Number.MAX_SAFE_INTEGER;
        const db = b.requirement.dueAt ? Date.parse(b.requirement.dueAt) : Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        return b.requirement.createdAt.localeCompare(a.requirement.createdAt);
      }
    }
  });
  return copy;
}

function itemIsOverdue(item: RequirementManagementListItem, now: Date): boolean {
  const req = item.requirement;
  if (req.status !== "ACTIVE" || !req.dueAt) return false;
  if (!isRequirementDueAtOverdue(new Date(req.dueAt), now)) return false;
  return (item.aggregate?.openCount ?? 0) > 0;
}

export async function getRequirementManagementSummary(
  ctx: RequirementServiceContext,
): Promise<RequirementManagementSummary> {
  if (!canAccessRequirementManagement(ctx)) {
    throw new RequirementForbiddenError();
  }

  const now = new Date();
  const [active, closed, cancelled, activeRows] = await Promise.all([
    prisma.requirement.count({ where: { tenantId: ctx.tenantId, status: "ACTIVE" } }),
    prisma.requirement.count({ where: { tenantId: ctx.tenantId, status: "CLOSED" } }),
    prisma.requirement.count({ where: { tenantId: ctx.tenantId, status: "CANCELLED" } }),
    prisma.requirement.findMany({
      where: { tenantId: ctx.tenantId, status: "ACTIVE" },
      select: { id: true, dueAt: true },
    }),
  ]);

  let openRecipients = 0;
  let overdue = 0;
  if (activeRows.length > 0) {
    const [openCount, overdueOpenCount] = await Promise.all([
      prisma.requirementRecipient.count({
        where: {
          tenantId: ctx.tenantId,
          removedAt: null,
          resolutionStatus: "OPEN",
          requirement: { status: "ACTIVE" },
        },
      }),
      prisma.requirementRecipient.count({
        where: {
          tenantId: ctx.tenantId,
          ...openRequirementRecipientOverdueWhere(now),
        },
      }),
    ]);
    openRecipients = openCount;
    overdue = overdueOpenCount;
  }

  return {
    active,
    openRecipients,
    overdue,
    completed: closed + cancelled,
  };
}

export async function listRequirementManagementItems(
  ctx: RequirementServiceContext,
  query: RequirementManagementQueryState,
  now: Date = new Date(),
): Promise<{
  items: RequirementManagementListItem[];
  totalCount: number;
  page: number;
  pageCount: number;
}> {
  if (!canAccessRequirementManagement(ctx)) {
    throw new RequirementForbiddenError();
  }

  const statusFilter: RequirementStatus[] | undefined =
    query.status === "ALL" ? undefined : [query.status];

  const rows = await prisma.requirement.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    },
    include: REQUIREMENT_INCLUDE,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });

  const activeIds = rows.filter((r) => r.status !== "DRAFT").map((r) => r.id);
  const aggregates = await loadAggregatesBatch(ctx.tenantId, activeIds);
  const creatorUserIds = rows
    .map((row) => row.createdByUserId)
    .filter((id): id is string => Boolean(id));
  const creatorNames = await resolveTaskCreatorDisplayNamesByUserIds(
    ctx.tenantId,
    creatorUserIds,
  );

  let items: RequirementManagementListItem[] = rows.map((row) => {
    const requirement = mapRequirement(row);
    const aggregate =
      requirement.status === "DRAFT" ? null : aggregates.get(requirement.id) ?? null;
    return {
      requirement,
      aggregate,
      creatorLabel: row.createdByUserId
        ? formatTaskCreatorDisplayName(row.createdByUserId, creatorNames)
        : null,
      isOverdue: false,
    };
  });

  items = items.map((item) => ({
    ...item,
    isOverdue: itemIsOverdue(item, now),
  }));

  if (query.deadline === "OVERDUE") {
    items = items.filter((item) => item.isOverdue);
  }

  items = sortListItems(items, query.sort);

  const totalCount = items.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / REQUIREMENT_MANAGEMENT_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * REQUIREMENT_MANAGEMENT_PAGE_SIZE;
  const pageItems = items.slice(start, start + REQUIREMENT_MANAGEMENT_PAGE_SIZE);

  return { items: pageItems, totalCount, page, pageCount };
}

export async function loadRequirementManagementDetail(
  ctx: RequirementServiceContext,
  requirementId: string,
): Promise<{
  requirement: RequirementDto;
  aggregate: RequirementAggregateDto | null;
  creatorLabel: string | null;
  canManage: boolean;
  canViewMatrix: boolean;
}> {
  const row = await prisma.requirement.findFirst({
    where: { id: requirementId, tenantId: ctx.tenantId },
    include: REQUIREMENT_INCLUDE,
  });
  if (!row) {
    throw new RequirementForbiddenError();
  }

  const authRecord = { tenantId: row.tenantId, createdByUserId: row.createdByUserId };
  if (!canReadRequirement(ctx, authRecord)) {
    throw new RequirementForbiddenError();
  }

  const requirement = mapRequirement(row);
  const aggregate =
    requirement.status === "DRAFT"
      ? null
      : canReadRequirementAggregate(ctx, authRecord)
        ? await computeRequirementAggregate(prisma, ctx.tenantId, requirementId)
        : null;

  return {
    requirement,
    aggregate,
    creatorLabel: await resolveRequirementCreatorLabel(ctx.tenantId, row.createdByUserId),
    canManage: canManageRequirement(ctx, authRecord),
    canViewMatrix: canListRequirementRecipients(ctx, authRecord),
  };
}

export async function listRequirementRecipientMatrix(
  ctx: RequirementServiceContext,
  input: {
    requirementId: string;
    filter: RequirementRecipientMatrixFilter;
    search: string;
    page: number;
    pageSize?: number;
    sort?: RequirementRecipientMatrixSort;
    now?: Date;
  },
): Promise<{
  rows: RequirementRecipientMatrixRow[];
  totalCount: number;
  page: number;
  pageCount: number;
}> {
  const pageSize = input.pageSize ?? 50;
  const now = input.now ?? new Date();
  const sort = input.sort ?? "ATTENTION";
  const searchTerm = input.search.trim();

  const requirement = await prisma.requirement.findFirst({
    where: { id: input.requirementId, tenantId: ctx.tenantId },
    select: { id: true, tenantId: true, status: true, dueAt: true, createdByUserId: true },
  });
  if (!requirement) {
    throw new RequirementForbiddenError();
  }

  const authRecord = { tenantId: requirement.tenantId, createdByUserId: requirement.createdByUserId };
  if (!canListRequirementRecipients(ctx, authRecord)) {
    throw new RequirementForbiddenError();
  }

  if (requirement.status === "DRAFT") {
    return { rows: [], totalCount: 0, page: 1, pageCount: 1 };
  }

  const dueAtIso = requirement.dueAt?.toISOString() ?? null;

  const recipientRows = await prisma.requirementRecipient.findMany({
    where: {
      tenantId: ctx.tenantId,
      requirementId: input.requirementId,
      removedAt: null,
      ...(input.filter === "OPEN" ? { resolutionStatus: "OPEN" } : {}),
      ...(input.filter === "ACKNOWLEDGED"
        ? { resolutionStatus: "RESOLVED", responseValue: "ACKNOWLEDGED" }
        : {}),
      ...(input.filter === "OVERDUE"
        ? {
            resolutionStatus: "OPEN",
            requirement: { status: "ACTIVE", dueAt: { lte: now } },
          }
        : {}),
      ...(searchTerm
        ? {
            subjectPerson: {
              OR: [
                { firstName: { contains: searchTerm, mode: "insensitive" } },
                { lastName: { contains: searchTerm, mode: "insensitive" } },
                { displayName: { contains: searchTerm, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      subjectPersonId: true,
      resolutionStatus: true,
      responseValue: true,
      respondedAt: true,
      responseActorPersonId: true,
      removedAt: true,
    },
  });

  const personIds = new Set<string>();
  for (const row of recipientRows) {
    personIds.add(row.subjectPersonId);
    if (row.responseActorPersonId) personIds.add(row.responseActorPersonId);
  }
  const nameMap = await loadRequirementPersonNameMap(ctx.tenantId, [...personIds]);

  let rows: RequirementRecipientMatrixRow[] = recipientRows.map((row) => {
    const isOverdue = isRequirementRecipientOverdue({
      requirementStatus: requirement.status,
      dueAt: requirement.dueAt,
      recipientResolutionStatus: row.resolutionStatus,
      recipientRemovedAt: row.removedAt,
      now,
    });
    const managementStatus = resolveRequirementRecipientManagementStatus({
      requirementStatus: requirement.status,
      dueAt: requirement.dueAt,
      resolutionStatus: row.resolutionStatus,
      removedAt: row.removedAt,
      now,
    });
    return {
      id: row.id,
      subjectPersonId: row.subjectPersonId,
      subjectDisplayName: nameMap.get(row.subjectPersonId) ?? "Unbekannt",
      resolutionStatus: row.resolutionStatus,
      responseValue: row.responseValue,
      respondedAt: row.respondedAt?.toISOString() ?? null,
      responseActorPersonId: row.responseActorPersonId,
      actorDisplayName: row.responseActorPersonId
        ? nameMap.get(row.responseActorPersonId) ?? null
        : null,
      dueAt: dueAtIso,
      isOverdue,
      managementStatus,
    };
  });

  rows = sortRequirementRecipientMatrixRows(rows, sort);

  const totalCount = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, input.page), pageCount);
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return { rows: pageRows, totalCount, page, pageCount };
}

export type RequirementAudienceOriginLabels = {
  persons: { personId: string; label: string }[];
  teams: { teamId: string; label: string }[];
  orgUnits: { orgUnitId: string; label: string }[];
  roles: { roleId: string; label: string }[];
  targetGroups: { targetGroupId: string; label: string }[];
};

export async function loadRequirementAudienceOriginLabels(
  tenantId: string,
  requirement: Pick<
    RequirementDto,
    | "draftAudiencePersonIds"
    | "draftAudienceTeamIds"
    | "draftAudienceOrgUnitIds"
    | "draftAudienceRoleIds"
    | "draftAudienceTargetGroupIds"
  >,
): Promise<RequirementAudienceOriginLabels> {
  const [personOptions, selectorLabels] = await Promise.all([
    loadRequirementPersonOptionsByIds(tenantId, requirement.draftAudiencePersonIds),
    loadRequirementAudienceLabels({
      tenantId,
      teamIds: requirement.draftAudienceTeamIds,
      orgUnitIds: requirement.draftAudienceOrgUnitIds,
      roleIds: requirement.draftAudienceRoleIds,
      targetGroupIds: requirement.draftAudienceTargetGroupIds,
    }),
  ]);

  return {
    persons: personOptions.map((p) => ({ personId: p.personId, label: p.displayName })),
    teams: selectorLabels.teams,
    orgUnits: selectorLabels.orgUnits,
    roles: selectorLabels.roles,
    targetGroups: selectorLabels.targetGroups,
  };
}
