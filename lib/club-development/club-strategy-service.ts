import "server-only";

import {
  ClubStrategyDocumentKind,
  ClubStrategyScopeType,
  Prisma,
  TaskDocumentReferenceVersionBinding,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { parseEntityRefs } from "@/lib/linking/helpers";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { applyVisibilityFilter } from "@/lib/visibility/visibility-filter";
import { requireTargetAccess } from "@/lib/visibility/visibility-guards";
import type { WorkspaceDocumentAccessContext } from "@/lib/workspace/document-access";
import { searchWorkspaceDocumentsForTaskLink } from "@/lib/workspace/document-access";
import {
  computeStrategyDeliveryProgress,
  computeStrategyGoalAchievementProgress,
  formatGoalAchievementCountLabel,
  formatProgressCountLabel,
} from "@/lib/club-development/vereinsentwicklung-workspace-progress";
import { parseCreateClubStrategyScopeInput } from "@/lib/club-development/club-strategy-org-scope";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { canAssignTaskOrgUnit } from "@/lib/tasks/task-org-mutation-policy";
import {
  resolveTaskDocumentReferencePresentations,
  type TaskReferenceRow,
} from "@/lib/workspace/reference/resolve-workspace-version-references";
import type { WorkspaceVersionReferencePresentation } from "@/lib/workspace/reference/workspace-version-reference-presentation";
import {
  listAuthorizedWorkspaceDocumentVersions,
  resolveWorkspaceDocumentVersionForLink,
  WorkspaceVersionLinkValidationError,
} from "@/lib/workspace/reference/workspace-version-link-validation";
import {
  allocateScePublicNumber,
  scePublicReferenceFromNumber,
} from "@/lib/club-development/sce-public-reference";

export type ClubStrategyDocumentReferenceDto = {
  referenceId: string;
  kind: ClubStrategyDocumentKind;
  linkedAt: string;
  presentation: WorkspaceVersionReferencePresentation;
};

export type ClubStrategyFocusTargetDto = {
  id: string;
  sortOrder: number;
  target: { id: string; title: string; status: string };
};

export type ClubStrategyAuthoringDto = {
  id: string | null;
  title: string | null;
  scopeType: ClubStrategyScopeType;
  scopeOrgUnitIds: string[];
  scopeOrgUnitLabels: string[];
  situationText: string | null;
  alignmentText: string | null;
  responsiblePersonId: string | null;
  responsibleLabel: string | null;
  periodLabel: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  nextReviewAt: string | null;
  contentRevision: number;
  meetingRefs: { slug: string; title: string; url: string }[];
  decisionRefs: { slug: string; title: string; url: string }[];
  focusTargets: ClubStrategyFocusTargetDto[];
  documentReferences: ClubStrategyDocumentReferenceDto[];
};

function canViewClubStrategy(actor: ActorContext): boolean {
  return (
    Boolean(actor.tenantId) &&
    actor.permissionKeys.some(
      (k) =>
        k === PERMISSIONS.TARGETS_VIEW ||
        k === PERMISSIONS.TARGETS_MANAGE ||
        k === PERMISSIONS.INITIATIVES_VIEW ||
        k === PERMISSIONS.INITIATIVES_MANAGE,
    )
  );
}

export function canManageClubStrategy(actor: ActorContext): boolean {
  return Boolean(actor.tenantId) && actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE);
}

export function workspaceAccessFromActor(
  actor: ActorContext,
  actorUserId: string,
): WorkspaceDocumentAccessContext {
  return {
    tenantId: actor.tenantId!,
    userId: actorUserId,
    permissionKeys: actor.permissionKeys,
  };
}

function clubWideStrategyWhere(tenantId: string): Prisma.ClubStrategyWhereInput {
  return { tenantId, scopeType: ClubStrategyScopeType.CLUB, scopeOrgUnitId: null };
}

async function findClubWideStrategyId(tenantId: string): Promise<string | null> {
  const row = await prisma.clubStrategy.findFirst({
    where: clubWideStrategyWhere(tenantId),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return row?.id ?? null;
}

async function ensureClubStrategyRow(tenantId: string, createdByUserId: string) {
  const existingId = await findClubWideStrategyId(tenantId);
  if (existingId) return existingId;
  const created = await prisma.$transaction(async (tx) => {
    const scePublicNumber = await allocateScePublicNumber(tx);
    return tx.clubStrategy.create({
      data: {
        tenantId,
        scePublicNumber,
        scopeType: ClubStrategyScopeType.CLUB,
        createdByUserId,
        updatedByUserId: createdByUserId,
        title: "Gesamtverein",
      },
      select: { id: true },
    });
  });
  return created.id;
}

export type ClubStrategyListItemDto = {
  id: string;
  publicReference: string | null;
  title: string;
  scopeType: ClubStrategyScopeType;
  scopeOrgUnitId: string | null;
  scopeOrgUnitLabel: string | null;
  orgUnitLabels: string[];
  responsibleLabel: string | null;
  focusTargetCount: number;
  focusTargetIds: string[];
  goalAchievementPercent: number;
  goalAchievementCompletedCount: number;
  goalAchievementTotalCount: number;
  goalAchievementCaption: string;
  deliveryProgressPercent: number;
  deliveryProgressCaption: string;
};

export type ListClubStrategiesOptions = {
  orgUnitId?: string | null;
};

export function resolveStrategyTitle(
  title: string | null | undefined,
  scopeType: ClubStrategyScopeType,
  orgUnitLabels: string[],
): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  if (scopeType === ClubStrategyScopeType.CLUB && orgUnitLabels.length === 0) return "Gesamtverein";
  if (orgUnitLabels.length === 1) return `Strategie ${orgUnitLabels[0]}`;
  return "Strategie";
}

export async function listClubStrategies(
  actor: ActorContext,
  options: ListClubStrategiesOptions = {},
): Promise<ClubStrategyListItemDto[]> {
  if (!canViewClubStrategy(actor) || !actor.tenantId) return [];
  const orgUnitFilter = options.orgUnitId?.trim() || null;

  const where: Prisma.ClubStrategyWhereInput = { tenantId: actor.tenantId };
  if (orgUnitFilter) {
    where.OR = [
      { scopeType: ClubStrategyScopeType.CLUB },
      { orgUnitAssignments: { some: { orgUnitId: orgUnitFilter } } },
      { scopeOrgUnitId: orgUnitFilter },
    ];
  }

  const rows = await prisma.clubStrategy.findMany({
    where,
    orderBy: [{ scopeType: "asc" }, { title: "asc" }],
    select: {
      id: true,
      scePublicNumber: true,
      title: true,
      scopeType: true,
      scopeOrgUnitId: true,
      responsibleLabel: true,
      focusTargets: { select: { targetId: true } },
      orgUnitAssignments: { select: { orgUnitId: true } },
      _count: { select: { focusTargets: true } },
    },
  });

  const allOrgUnitIds = new Set<string>();
  for (const row of rows) {
    for (const a of row.orgUnitAssignments) allOrgUnitIds.add(a.orgUnitId);
    if (row.scopeOrgUnitId) allOrgUnitIds.add(row.scopeOrgUnitId);
  }
  const labelByOrgUnitId = new Map<string, string>();
  if (allOrgUnitIds.size > 0) {
    const units = await prisma.orgUnit.findMany({
      where: { tenantId: actor.tenantId, id: { in: [...allOrgUnitIds] } },
      select: { id: true, name: true },
    });
    for (const unit of units) labelByOrgUnitId.set(unit.id, unit.name);
  }

  const items: ClubStrategyListItemDto[] = [];
  for (const row of rows) {
    const orgUnitIdList = [
      ...row.orgUnitAssignments.map((a) => a.orgUnitId),
      ...(row.scopeOrgUnitId &&
      !row.orgUnitAssignments.some((a) => a.orgUnitId === row.scopeOrgUnitId)
        ? [row.scopeOrgUnitId]
        : []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);
    const orgUnitLabels = orgUnitIdList
      .map((id) => labelByOrgUnitId.get(id) ?? "Org-Einheit")
      .sort((a, b) => a.localeCompare(b, "de"));

    const focusIds = row.focusTargets.map((ft) => ft.targetId);
    const [goalAchievement, delivery] = await Promise.all([
      computeStrategyGoalAchievementProgress(actor, focusIds),
      focusIds.length > 0
        ? computeStrategyDeliveryProgress(actor, focusIds)
        : Promise.resolve({ completedCount: 0, totalCount: 0, percent: 0, contributingTaskIds: [] }),
    ]);

    const orgUnitLabelDisplay =
      orgUnitLabels.length === 0
        ? "Gesamtverein"
        : orgUnitLabels.length <= 2
          ? orgUnitLabels.join(", ")
          : `${orgUnitLabels.slice(0, 2).join(", ")} +${orgUnitLabels.length - 2}`;

    items.push({
      id: row.id,
      publicReference: scePublicReferenceFromNumber(row.scePublicNumber),
      title: resolveStrategyTitle(row.title, row.scopeType, orgUnitLabels),
      scopeType: row.scopeType,
      scopeOrgUnitId: row.scopeOrgUnitId,
      scopeOrgUnitLabel: orgUnitLabelDisplay,
      orgUnitLabels,
      responsibleLabel: row.responsibleLabel,
      focusTargetCount: row._count.focusTargets,
      focusTargetIds: focusIds,
      goalAchievementPercent: goalAchievement.percent,
      goalAchievementCompletedCount: goalAchievement.completedCount,
      goalAchievementTotalCount: goalAchievement.totalCount,
      goalAchievementCaption: formatGoalAchievementCountLabel(goalAchievement),
      deliveryProgressPercent: delivery.percent,
      deliveryProgressCaption: formatProgressCountLabel(delivery),
    });
  }
  return items;
}

export async function listAllFocusTargetIds(actor: ActorContext): Promise<string[]> {
  if (!canViewClubStrategy(actor) || !actor.tenantId) return [];
  const rows = await prisma.clubStrategyFocusTarget.findMany({
    where: { tenantId: actor.tenantId },
    select: { targetId: true },
    distinct: ["targetId"],
  });
  return rows.map((r) => r.targetId);
}

async function assertClubStrategyInTenant(tenantId: string, clubStrategyId: string): Promise<string> {
  const row = await prisma.clubStrategy.findFirst({
    where: { id: clubStrategyId, tenantId },
    select: { id: true },
  });
  if (!row) throw new Error("STRATEGY_NOT_FOUND");
  return row.id;
}

async function resolveManagedClubStrategyId(
  actor: ActorContext,
  actorUserId: string,
  clubStrategyId?: string | null,
): Promise<string> {
  if (!actor.tenantId) throw new Error("FORBIDDEN");
  if (clubStrategyId?.trim()) {
    return assertClubStrategyInTenant(actor.tenantId, clubStrategyId.trim());
  }
  return ensureClubStrategyRow(actor.tenantId, actorUserId);
}

export type CreateClubStrategyInput = {
  title: string;
  scopeClubWide?: boolean;
  orgUnitIds?: string[];
  situationText?: string | null;
  responsiblePersonId?: string | null;
  responsibleUserId?: string | null;
  nextReviewAt?: string | null;
};

export async function createClubStrategy(
  actor: ActorContext,
  actorUserId: string,
  input: CreateClubStrategyInput,
): Promise<{ id: string }> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const title = input.title?.trim();
  if (!title) throw new Error("TITLE_REQUIRED");

  const parsedScope = parseCreateClubStrategyScopeInput(input);
  if (parsedScope.kind === "invalid") throw new Error("ORG_SCOPE_REQUIRED");

  const taskCtx = await buildTaskServiceContextForActor(actorUserId, actor.tenantId);
  if (!taskCtx) throw new Error("FORBIDDEN");

  const orgUnitIds =
    parsedScope.kind === "org_units" ? [...new Set(parsedScope.orgUnitIds)] : [];

  if (orgUnitIds.length > 0) {
    for (const orgUnitId of orgUnitIds) {
      if (!canAssignTaskOrgUnit(taskCtx, orgUnitId)) throw new Error("ORG_UNIT_FORBIDDEN");
    }
    const found = await prisma.orgUnit.findMany({
      where: { tenantId: actor.tenantId, id: { in: orgUnitIds }, status: "ACTIVE" },
      select: { id: true },
    });
    if (found.length !== orgUnitIds.length) throw new Error("ORG_UNIT_NOT_FOUND");
  }

  const scopeType =
    orgUnitIds.length === 1 ? ClubStrategyScopeType.ORG_UNIT : ClubStrategyScopeType.CLUB;

  let responsiblePersonId: string | null = null;
  let responsibleLabel: string | null = null;
  if (input.responsiblePersonId?.trim()) {
    const snap = await resolveMeetingPersonSnapshot(actor.tenantId, input.responsiblePersonId.trim());
    if (!snap) throw new Error("RESPONSIBLE_NOT_FOUND");
    responsiblePersonId = snap.personId;
    responsibleLabel = snap.displayName;
  } else if (input.responsibleUserId?.trim()) {
    const { resolvePersonUserIdentityByUserId } = await import("@/lib/people/person-user-identity");
    const identity = await resolvePersonUserIdentityByUserId(
      actor.tenantId,
      input.responsibleUserId.trim(),
    );
    if (!identity) throw new Error("RESPONSIBLE_NOT_FOUND");
    responsiblePersonId = identity.personId;
    responsibleLabel = identity.displayName;
  }

  const situationText = input.situationText?.trim() || null;
  const nextReviewAt = input.nextReviewAt?.trim()
    ? new Date(input.nextReviewAt.trim())
  : null;
  if (nextReviewAt && Number.isNaN(nextReviewAt.getTime())) {
    throw new Error("INVALID_NEXT_REVIEW");
  }

  let created: { id: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      const scePublicNumber = await allocateScePublicNumber(tx);
      const tenantId = actor.tenantId!;
      return tx.clubStrategy.create({
        data: {
          tenantId,
          scePublicNumber,
          scopeType,
          scopeOrgUnitId: orgUnitIds.length === 1 ? orgUnitIds[0] : null,
          title,
          situationText,
          responsiblePersonId,
          responsibleLabel,
          nextReviewAt,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          orgUnitAssignments:
            orgUnitIds.length > 0
              ? {
                  create: orgUnitIds.map((orgUnitId) => ({
                    tenantId,
                    orgUnitId,
                  })),
                }
              : undefined,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      orgUnitIds.length === 0
    ) {
      throw new Error("CLUB_WIDE_STRATEGY_CONFLICT");
    }
    throw error;
  }

  void logAuditEvent({
    actorUserId,
    module: "targets",
    entityId: created.id,
    action: "UPDATE",
    after: { title, orgUnitIds },
    metadata: { clubStrategy: true },
  });

  return { id: created.id };
}

export type ReplaceClubStrategyOrgUnitsInput = {
  clubStrategyId: string;
  orgUnitIds: string[];
};

export async function replaceClubStrategyOrgUnitAssignments(
  actor: ActorContext,
  actorUserId: string,
  input: ReplaceClubStrategyOrgUnitsInput,
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const strategyId = await assertClubStrategyInTenant(actor.tenantId, input.clubStrategyId);
  const orgUnitIds = [...new Set(input.orgUnitIds.map((id) => id.trim()).filter(Boolean))];

  if (orgUnitIds.length > 0) {
    const found = await prisma.orgUnit.findMany({
      where: { tenantId: actor.tenantId, id: { in: orgUnitIds }, status: "ACTIVE" },
      select: { id: true },
    });
    if (found.length !== orgUnitIds.length) throw new Error("ORG_UNIT_NOT_FOUND");
  }

  await prisma.$transaction([
    prisma.clubStrategyOrgUnitAssignment.deleteMany({
      where: { tenantId: actor.tenantId, clubStrategyId: strategyId },
    }),
    ...(orgUnitIds.length > 0
      ? [
          prisma.clubStrategyOrgUnitAssignment.createMany({
            data: orgUnitIds.map((orgUnitId) => ({
              tenantId: actor.tenantId!,
              clubStrategyId: strategyId,
              orgUnitId,
            })),
          }),
        ]
      : []),
    prisma.clubStrategy.update({
      where: { id: strategyId, tenantId: actor.tenantId },
      data: {
        scopeOrgUnitId: orgUnitIds.length === 1 ? orgUnitIds[0] : null,
        scopeType:
          orgUnitIds.length === 0
            ? ClubStrategyScopeType.CLUB
            : orgUnitIds.length === 1
              ? ClubStrategyScopeType.ORG_UNIT
              : ClubStrategyScopeType.CLUB,
        updatedByUserId: actorUserId,
      },
    }),
  ]);
}

function meetingRefsFromRaw(raw: unknown) {
  return parseEntityRefs(raw).map((ref) => ({
    slug: ref.slug,
    title: ref.title,
    url: ref.url ?? `/vereinsleitung/meetings/${ref.slug}`,
  }));
}

function decisionRefsFromRaw(raw: unknown) {
  return parseEntityRefs(raw).map((ref) => ({
    slug: ref.slug,
    title: ref.title,
    url: ref.url ?? `/vereinsleitung/meetings`,
  }));
}

export async function loadClubStrategyAuthoring(
  actor: ActorContext,
  actorUserId: string,
  strategyId?: string | null,
): Promise<ClubStrategyAuthoringDto | null> {
  if (!canViewClubStrategy(actor) || !actor.tenantId) return null;

  const strategyWhere: Prisma.ClubStrategyWhereInput = strategyId?.trim()
    ? { id: strategyId.trim(), tenantId: actor.tenantId }
    : clubWideStrategyWhere(actor.tenantId);

  const row = await prisma.clubStrategy.findFirst({
    where: strategyWhere,
    select: {
      id: true,
      title: true,
      scopeType: true,
      scopeOrgUnitId: true,
      orgUnitAssignments: { select: { orgUnitId: true } },
      situationText: true,
      alignmentText: true,
      responsiblePersonId: true,
      responsibleLabel: true,
      periodLabel: true,
      periodStartsAt: true,
      periodEndsAt: true,
      nextReviewAt: true,
      contentRevision: true,
      linkedMeetingRefs: true,
      linkedDecisionRefs: true,
      focusTargets: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          target: {
            select: {
              id: true,
              title: true,
              status: true,
              visibilityScope: true,
              createdByUserId: true,
              visibleRoleRefs: true,
              visibleUserRefs: true,
              visibleTeamRefs: true,
              visibleOrgUnitRefs: true,
              visiblePersonRefs: true,
              visibleTargetGroupRefs: true,
            },
          },
        },
      },
      documentReferences: {
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kind: true,
          documentId: true,
          workspaceDocumentVersionId: true,
          versionBinding: true,
          createdAt: true,
        },
      },
    },
  });

  if (!row) {
    return {
      id: null,
      title: null,
      scopeType: ClubStrategyScopeType.CLUB,
      scopeOrgUnitIds: [],
      scopeOrgUnitLabels: [],
      situationText: null,
      alignmentText: null,
      responsiblePersonId: null,
      responsibleLabel: null,
      periodLabel: null,
      periodStartsAt: null,
      periodEndsAt: null,
      nextReviewAt: null,
      contentRevision: 0,
      meetingRefs: [],
      decisionRefs: [],
      focusTargets: [],
      documentReferences: [],
    };
  }

  const focusTargets: ClubStrategyFocusTargetDto[] = row.focusTargets
    .filter((ft) => applyVisibilityFilter([ft.target], actor).length > 0)
    .map((ft) => ({
      id: ft.id,
      sortOrder: ft.sortOrder,
      target: { id: ft.target.id, title: ft.target.title, status: ft.target.status },
    }));

  const workspaceCtx = workspaceAccessFromActor(actor, actorUserId);
  const refRows: TaskReferenceRow[] = row.documentReferences.map((r) => ({
    referenceId: r.id,
    documentId: r.documentId,
    workspaceDocumentVersionId: r.workspaceDocumentVersionId,
    versionBinding: r.versionBinding,
  }));
  const presentations = await resolveTaskDocumentReferencePresentations(workspaceCtx, refRows);

  const documentReferences: ClubStrategyDocumentReferenceDto[] = row.documentReferences.map((r) => ({
    referenceId: r.id,
    kind: r.kind,
    linkedAt: r.createdAt.toISOString(),
    presentation:
      presentations.get(r.id) ?? ({ accessible: false, referenceId: r.id } satisfies WorkspaceVersionReferencePresentation),
  }));

  const scopeOrgUnitIds = [
    ...row.orgUnitAssignments.map((a) => a.orgUnitId),
    ...(row.scopeOrgUnitId && !row.orgUnitAssignments.some((a) => a.orgUnitId === row.scopeOrgUnitId)
      ? [row.scopeOrgUnitId]
      : []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const orgUnits =
    scopeOrgUnitIds.length > 0
      ? await prisma.orgUnit.findMany({
          where: { tenantId: actor.tenantId!, id: { in: scopeOrgUnitIds } },
          select: { id: true, name: true },
        })
      : [];
  const orgNameById = new Map(orgUnits.map((u) => [u.id, u.name] as const));
  const scopeOrgUnitLabels = scopeOrgUnitIds.map((id) => orgNameById.get(id) ?? "Org-Einheit");

  return {
    id: row.id,
    title: row.title,
    scopeType: row.scopeType,
    scopeOrgUnitIds,
    scopeOrgUnitLabels,
    situationText: row.situationText,
    alignmentText: row.alignmentText,
    responsiblePersonId: row.responsiblePersonId,
    responsibleLabel: row.responsibleLabel,
    periodLabel: row.periodLabel,
    periodStartsAt: row.periodStartsAt?.toISOString() ?? null,
    periodEndsAt: row.periodEndsAt?.toISOString() ?? null,
    nextReviewAt: row.nextReviewAt?.toISOString() ?? null,
    contentRevision: row.contentRevision,
    meetingRefs: meetingRefsFromRaw(row.linkedMeetingRefs),
    decisionRefs: decisionRefsFromRaw(row.linkedDecisionRefs),
    focusTargets,
    documentReferences,
  };
}

export type UpsertClubStrategyInput = {
  clubStrategyId?: string | null;
  title?: string | null;
  situationText?: string | null;
  alignmentText?: string | null;
  responsiblePersonId?: string | null;
  periodLabel?: string | null;
  periodStartsAt?: string | null;
  periodEndsAt?: string | null;
  nextReviewAt?: string | null;
};

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function upsertClubStrategyAuthoring(
  actor: ActorContext,
  actorUserId: string,
  input: UpsertClubStrategyInput,
): Promise<{ id: string; contentRevision: number }> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) {
    throw new Error("FORBIDDEN");
  }
  const tenantId = actor.tenantId;

  const strategyId = await resolveManagedClubStrategyId(actor, actorUserId, input.clubStrategyId);

  const before = await prisma.clubStrategy.findUnique({
    where: { id: strategyId },
    select: {
      title: true,
      situationText: true,
      alignmentText: true,
      responsiblePersonId: true,
      periodLabel: true,
      periodStartsAt: true,
      periodEndsAt: true,
      nextReviewAt: true,
      contentRevision: true,
    },
  });

  let responsiblePersonId: string | null | undefined =
    input.responsiblePersonId !== undefined ? input.responsiblePersonId?.trim() || null : undefined;
  let responsibleLabel: string | null | undefined = undefined;
  if (responsiblePersonId !== undefined) {
    if (responsiblePersonId) {
      const snap = await resolveMeetingPersonSnapshot(tenantId, responsiblePersonId);
      if (!snap) {
        throw new Error("PERSON_NOT_FOUND");
      }
      responsiblePersonId = snap.personId;
      responsibleLabel = snap.displayName || null;
    } else {
      responsibleLabel = null;
    }
  }

  const data: Record<string, unknown> = {
    updatedByUserId: actorUserId,
  };
  if (input.title !== undefined) data.title = input.title?.trim() || null;
  if (input.situationText !== undefined) data.situationText = input.situationText?.trim() || null;
  if (input.alignmentText !== undefined) data.alignmentText = input.alignmentText?.trim() || null;
  if (responsiblePersonId !== undefined) {
    data.responsiblePersonId = responsiblePersonId;
    data.responsibleLabel = responsibleLabel ?? null;
  }
  if (input.periodLabel !== undefined) data.periodLabel = input.periodLabel?.trim() || null;
  const starts = parseOptionalDate(input.periodStartsAt);
  const ends = parseOptionalDate(input.periodEndsAt);
  const review = parseOptionalDate(input.nextReviewAt);
  if (starts !== undefined) data.periodStartsAt = starts;
  if (ends !== undefined) data.periodEndsAt = ends;
  if (review !== undefined) data.nextReviewAt = review;

  const narrativeChanged =
    before &&
    ((input.title !== undefined && (input.title?.trim() || null) !== before.title) ||
      (input.situationText !== undefined && (input.situationText?.trim() || null) !== before.situationText) ||
      (input.alignmentText !== undefined && (input.alignmentText?.trim() || null) !== before.alignmentText) ||
      (responsiblePersonId !== undefined && responsiblePersonId !== before.responsiblePersonId) ||
      (input.periodLabel !== undefined && (input.periodLabel?.trim() || null) !== before.periodLabel) ||
      (starts !== undefined && (starts?.toISOString() ?? null) !== (before.periodStartsAt?.toISOString() ?? null)) ||
      (ends !== undefined && (ends?.toISOString() ?? null) !== (before.periodEndsAt?.toISOString() ?? null)) ||
      (review !== undefined && (review?.toISOString() ?? null) !== (before.nextReviewAt?.toISOString() ?? null)));

  if (narrativeChanged) {
    data.contentRevision = { increment: 1 };
  }

  const updated = await prisma.clubStrategy.update({
    where: { id: strategyId, tenantId },
    data,
    select: { id: true, contentRevision: true },
  });

  void logAuditEvent({
    actorUserId,
    module: "targets",
    entityId: updated.id,
    action: "UPDATE",
    before: before ?? undefined,
    after: {
      situationText: input.situationText,
      alignmentText: input.alignmentText,
      responsiblePersonId,
      periodLabel: input.periodLabel,
      contentRevision: updated.contentRevision,
    },
    metadata: { clubStrategy: true },
  });

  return { id: updated.id, contentRevision: updated.contentRevision };
}

async function assertTenantMeetingSlugs(tenantId: string, meetingRefs: { slug: string; title: string }[]) {
  if (meetingRefs.length === 0) return;
  const slugs = meetingRefs.map((r) => r.slug);
  const found = await prisma.meeting.findMany({
    where: { tenantId, slug: { in: slugs } },
    select: { slug: true },
  });
  const foundSlugs = new Set(found.map((r) => r.slug));
  const unknown = slugs.find((s) => !foundSlugs.has(s));
  if (unknown) throw new Error(`MEETING_NOT_FOUND:${unknown}`);
}

async function assertTenantDecisionIds(tenantId: string, decisionRefs: { slug: string; title: string }[]) {
  if (decisionRefs.length === 0) return;
  const ids = decisionRefs.map((r) => r.slug);
  const found = await prisma.meetingDecision.findMany({
    where: { id: { in: ids }, meeting: { tenantId } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((r) => r.id));
  const unknown = ids.find((id) => !foundIds.has(id));
  if (unknown) throw new Error(`DECISION_NOT_FOUND:${unknown}`);
}

export async function replaceClubStrategyMeetingRefs(
  actor: ActorContext,
  actorUserId: string,
  meetingRefs: { slug: string; title: string }[],
): Promise<void> {
  await replaceClubStrategyAssociationRefs(actor, actorUserId, { meetingRefs, decisionRefs: undefined });
}

/** Replace Sitzungs- and Beschluss-Verknüpfungen (no strategy approval side effects). */
export async function replaceClubStrategyAssociationRefs(
  actor: ActorContext,
  actorUserId: string,
  input: {
    clubStrategyId?: string | null;
    meetingRefs?: { slug: string; title: string }[];
    decisionRefs?: { slug: string; title: string }[];
  },
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const tenantId = actor.tenantId;
  const strategyId = await resolveManagedClubStrategyId(actor, actorUserId, input.clubStrategyId);

  const meetingRefs = input.meetingRefs;
  const decisionRefs = input.decisionRefs;

  if (meetingRefs !== undefined) {
    await assertTenantMeetingSlugs(tenantId, meetingRefs);
  }
  if (decisionRefs !== undefined) {
    await assertTenantDecisionIds(tenantId, decisionRefs);
  }

  if (meetingRefs === undefined && decisionRefs === undefined) return;

  const before = await prisma.clubStrategy.findUnique({
    where: { id: strategyId },
    select: { linkedMeetingRefs: true, linkedDecisionRefs: true },
  });

  const data: Record<string, unknown> = { updatedByUserId: actorUserId };
  if (meetingRefs !== undefined) data.linkedMeetingRefs = meetingRefs;
  if (decisionRefs !== undefined) data.linkedDecisionRefs = decisionRefs;

  await prisma.clubStrategy.update({
    where: { id: strategyId, tenantId },
    data,
  });

  void logAuditEvent({
    actorUserId,
    module: "targets",
    entityId: strategyId,
    action: "LINKS_UPDATE",
    before: before ?? undefined,
    after: {
      ...(meetingRefs !== undefined ? { linkedMeetingRefs: meetingRefs } : {}),
      ...(decisionRefs !== undefined ? { linkedDecisionRefs: decisionRefs } : {}),
    },
    metadata: { clubStrategy: true, associationOnly: true },
  });
}

export async function addClubStrategyFocusTarget(
  actor: ActorContext,
  actorUserId: string,
  targetId: string,
  clubStrategyId?: string | null,
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const guard = await requireTargetAccess({ actor, id: targetId, access: "read" });
  if (!guard.ok) throw new Error("TARGET_FORBIDDEN");

  const tenantId = actor.tenantId;
  const strategyId = await resolveManagedClubStrategyId(actor, actorUserId, clubStrategyId);

  const existingCount = await prisma.clubStrategyFocusTarget.count({
    where: { clubStrategyId: strategyId },
  });

  await prisma.clubStrategyFocusTarget.upsert({
    where: { clubStrategyId_targetId: { clubStrategyId: strategyId, targetId } },
    create: {
      tenantId,
      clubStrategyId: strategyId,
      targetId,
      sortOrder: existingCount,
    },
    update: {},
  });

  void logAuditEvent({
    actorUserId,
    module: "targets",
    entityId: strategyId,
    action: "LINKS_UPDATE",
    after: { focusTargetId: targetId },
    metadata: { clubStrategyFocus: true },
  });
}

export async function removeClubStrategyFocusTarget(
  actor: ActorContext,
  actorUserId: string,
  targetId: string,
  clubStrategyId?: string | null,
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const tenantId = actor.tenantId;
  const strategyId = clubStrategyId?.trim()
    ? await assertClubStrategyInTenant(tenantId, clubStrategyId.trim())
    : await findClubWideStrategyId(tenantId);
  if (!strategyId) return;

  await prisma.clubStrategyFocusTarget.deleteMany({
    where: { tenantId, clubStrategyId: strategyId, targetId },
  });

  void logAuditEvent({
    actorUserId,
    module: "targets",
    entityId: strategyId,
    action: "LINKS_UPDATE",
    before: { focusTargetId: targetId },
    metadata: { clubStrategyFocus: true },
  });
}

export async function linkClubStrategyDocument(
  actor: ActorContext,
  actorUserId: string,
  input: {
    clubStrategyId?: string | null;
    kind: ClubStrategyDocumentKind;
    documentId: string;
    workspaceDocumentVersionId?: string | null;
  },
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const tenantId = actor.tenantId;
  const strategyId = await resolveManagedClubStrategyId(actor, actorUserId, input.clubStrategyId);
  const workspaceCtx = workspaceAccessFromActor(actor, actorUserId);

  let resolved;
  try {
    resolved = await resolveWorkspaceDocumentVersionForLink(workspaceCtx, {
      documentId: input.documentId,
      workspaceDocumentVersionId: input.workspaceDocumentVersionId,
    });
  } catch (error) {
    if (error instanceof WorkspaceVersionLinkValidationError) throw new Error("DOCUMENT_FORBIDDEN");
    throw error;
  }

  await prisma.clubStrategyDocumentReference.createMany({
    data: [
      {
        tenantId,
        clubStrategyId: strategyId,
        kind: input.kind,
        workspaceDocumentVersionId: resolved.workspaceDocumentVersionId,
        versionBinding: TaskDocumentReferenceVersionBinding.EXACT,
        documentId: null,
        createdByUserId: actorUserId,
      },
    ],
    skipDuplicates: true,
  });
}

export async function unlinkClubStrategyDocument(
  actor: ActorContext,
  actorUserId: string,
  referenceId: string,
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  await prisma.clubStrategyDocumentReference.deleteMany({
    where: { id: referenceId, tenantId: actor.tenantId },
  });
  void logAuditEvent({
    actorUserId,
    module: "targets",
    entityId: referenceId,
    action: "DELETE",
    metadata: { clubStrategyDocument: true },
  });
}

export async function searchClubStrategyDocumentCandidates(
  actor: ActorContext,
  actorUserId: string,
  query: string,
) {
  const workspaceCtx = workspaceAccessFromActor(actor, actorUserId);
  return searchWorkspaceDocumentsForTaskLink(workspaceCtx, query);
}

export async function listClubStrategyDocumentVersions(
  actor: ActorContext,
  actorUserId: string,
  documentId: string,
) {
  const workspaceCtx = workspaceAccessFromActor(actor, actorUserId);
  return listAuthorizedWorkspaceDocumentVersions(workspaceCtx, documentId);
}