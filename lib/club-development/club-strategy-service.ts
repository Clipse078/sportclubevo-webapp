import "server-only";

import {
  ClubStrategyDocumentKind,
  ClubStrategyScopeType,
  TaskDocumentReferenceVersionBinding,
  type Prisma,
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
  resolveTaskDocumentReferencePresentations,
  type TaskReferenceRow,
} from "@/lib/workspace/reference/resolve-workspace-version-references";
import type { WorkspaceVersionReferencePresentation } from "@/lib/workspace/reference/workspace-version-reference-presentation";
import {
  listAuthorizedWorkspaceDocumentVersions,
  resolveWorkspaceDocumentVersionForLink,
  WorkspaceVersionLinkValidationError,
} from "@/lib/workspace/reference/workspace-version-link-validation";

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
    select: { id: true },
  });
  return row?.id ?? null;
}

async function ensureClubStrategyRow(tenantId: string, createdByUserId: string) {
  const existingId = await findClubWideStrategyId(tenantId);
  if (existingId) return existingId;
  const created = await prisma.clubStrategy.create({
    data: {
      tenantId,
      scopeType: ClubStrategyScopeType.CLUB,
      createdByUserId,
      updatedByUserId: createdByUserId,
      title: "Gesamtverein",
    },
    select: { id: true },
  });
  return created.id;
}

export type ClubStrategyListItemDto = {
  id: string;
  title: string;
  scopeType: ClubStrategyScopeType;
  scopeOrgUnitId: string | null;
  scopeOrgUnitLabel: string | null;
  focusTargetCount: number;
};

export async function listClubStrategies(actor: ActorContext): Promise<ClubStrategyListItemDto[]> {
  if (!canViewClubStrategy(actor) || !actor.tenantId) return [];
  const rows = await prisma.clubStrategy.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: [{ scopeType: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      scopeType: true,
      scopeOrgUnitId: true,
      _count: { select: { focusTargets: true } },
    },
  });
  const orgUnitIds = rows.map((r) => r.scopeOrgUnitId).filter((id): id is string => Boolean(id));
  const orgLabels = new Map<string, string>();
  if (orgUnitIds.length > 0) {
    const units = await prisma.orgUnit.findMany({
      where: { tenantId: actor.tenantId, id: { in: orgUnitIds } },
      select: { id: true, name: true },
    });
    for (const unit of units) orgLabels.set(unit.id, unit.name);
  }
  return rows.map((row) => ({
    id: row.id,
    title:
      row.title?.trim() ||
      (row.scopeType === ClubStrategyScopeType.CLUB
        ? "Gesamtverein"
        : orgLabels.get(row.scopeOrgUnitId ?? "") || "Strategie"),
    scopeType: row.scopeType,
    scopeOrgUnitId: row.scopeOrgUnitId,
    scopeOrgUnitLabel:
      row.scopeType === ClubStrategyScopeType.CLUB
        ? "Gesamtverein"
        : orgLabels.get(row.scopeOrgUnitId ?? "") ?? null,
    focusTargetCount: row._count.focusTargets,
  }));
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

  return {
    id: row.id,
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

  const strategyId = await ensureClubStrategyRow(tenantId, actorUserId);

  const before = await prisma.clubStrategy.findUnique({
    where: { id: strategyId },
    select: {
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
    ((input.situationText !== undefined && (input.situationText?.trim() || null) !== before.situationText) ||
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
    meetingRefs?: { slug: string; title: string }[];
    decisionRefs?: { slug: string; title: string }[];
  },
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const tenantId = actor.tenantId;
  const strategyId = await ensureClubStrategyRow(tenantId, actorUserId);

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
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const guard = await requireTargetAccess({ actor, id: targetId, access: "read" });
  if (!guard.ok) throw new Error("TARGET_FORBIDDEN");

  const tenantId = actor.tenantId;
  const strategyId = await ensureClubStrategyRow(tenantId, actorUserId);

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
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const tenantId = actor.tenantId;
  const strategyId = await findClubWideStrategyId(tenantId);
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
    kind: ClubStrategyDocumentKind;
    documentId: string;
    workspaceDocumentVersionId?: string | null;
  },
): Promise<void> {
  if (!canManageClubStrategy(actor) || !actor.tenantId) throw new Error("FORBIDDEN");
  const tenantId = actor.tenantId;
  const strategyId = await ensureClubStrategyRow(tenantId, actorUserId);
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