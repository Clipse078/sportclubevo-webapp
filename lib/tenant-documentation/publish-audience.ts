/**
 * Published-page read audience (Sichtbarkeit) — inherits parent, may narrow; VIEW grants only.
 */

import {
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
  type TenantDocumentationAccessGrant,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { actorMatchesAudience } from "@/lib/workspace/access/audience-match";
import type { AudienceRef } from "@/lib/workspace/access/audience";

export type TenantDocumentationPublishAudience =
  | { mode: "club" }
  | { mode: "org_units"; orgUnitIds: readonly string[] };

export type TenantDocumentationPublishAudienceView = {
  /** Explicit on this page, or null when inherited only. */
  explicit: TenantDocumentationPublishAudience | null;
  inherited: TenantDocumentationPublishAudience;
  effective: TenantDocumentationPublishAudience;
  explicitOrgUnitLabels?: Array<{ id: string; name: string }>;
};

function viewPublishGrants(
  grants: readonly TenantDocumentationAccessGrant[],
): TenantDocumentationAccessGrant[] {
  return grants.filter(
    (g) =>
      g.accessLevel === TenantDocumentationAccessLevel.VIEW &&
      (g.subjectType === TenantDocumentationAccessSubjectType.CLUB ||
        g.subjectType === TenantDocumentationAccessSubjectType.ORG_UNIT),
  );
}

function grantsToAudience(
  grants: readonly TenantDocumentationAccessGrant[],
): TenantDocumentationPublishAudience | null {
  const view = viewPublishGrants(grants);
  if (view.length === 0) return null;
  const club = view.some((g) => g.subjectType === TenantDocumentationAccessSubjectType.CLUB);
  if (club) return { mode: "club" };
  const orgUnitIds = view
    .filter((g) => g.subjectType === TenantDocumentationAccessSubjectType.ORG_UNIT && g.orgUnitId)
    .map((g) => g.orgUnitId!);
  if (orgUnitIds.length === 0) return null;
  return { mode: "org_units", orgUnitIds };
}

async function loadParentId(pageId: string, tenantId: string): Promise<string | null> {
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId },
    select: { parentId: true, spaceId: true },
  });
  return page?.parentId ?? null;
}

async function loadSpaceDefaultAudience(
  spaceId: string,
  tenantId: string,
): Promise<TenantDocumentationPublishAudience> {
  const grants = await prisma.tenantDocumentationAccessGrant.findMany({
    where: {
      tenantId,
      spaceId,
      resourceType: TenantDocumentationResourceType.SPACE,
    },
  });
  return grantsToAudience(grants) ?? { mode: "club" };
}

export async function resolveInheritedPublishAudience(
  pageId: string,
  tenantId: string,
): Promise<TenantDocumentationPublishAudience> {
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId },
    select: { parentId: true, spaceId: true },
  });
  if (!page) return { mode: "club" };
  if (page.parentId) {
    return resolveEffectivePublishAudience(page.parentId, tenantId);
  }
  return loadSpaceDefaultAudience(page.spaceId, tenantId);
}

export async function resolveExplicitPublishAudience(
  pageId: string,
  tenantId: string,
): Promise<TenantDocumentationPublishAudience | null> {
  const grants = await prisma.tenantDocumentationAccessGrant.findMany({
    where: {
      tenantId,
      pageId,
      resourceType: TenantDocumentationResourceType.PAGE,
    },
  });
  return grantsToAudience(grants);
}

export async function resolveEffectivePublishAudience(
  pageId: string,
  tenantId: string,
): Promise<TenantDocumentationPublishAudience> {
  const explicit = await resolveExplicitPublishAudience(pageId, tenantId);
  if (explicit) return explicit;
  return resolveInheritedPublishAudience(pageId, tenantId);
}

export async function resolvePublishAudienceView(
  pageId: string,
  tenantId: string,
): Promise<TenantDocumentationPublishAudienceView> {
  const inherited = await resolveInheritedPublishAudience(pageId, tenantId);
  const explicit = await resolveExplicitPublishAudience(pageId, tenantId);
  const effective = explicit ?? inherited;

  let explicitOrgUnitLabels: Array<{ id: string; name: string }> | undefined;
  if (explicit?.mode === "org_units") {
    const units = await prisma.orgUnit.findMany({
      where: { tenantId, id: { in: [...explicit.orgUnitIds] } },
      select: { id: true, name: true },
    });
    explicitOrgUnitLabels = units.map((u) => ({ id: u.id, name: u.name }));
  }

  return { explicit, inherited, effective, explicitOrgUnitLabels };
}

async function loadOrgUnitAncestorMap(tenantId: string): Promise<Map<string, string | null>> {
  const rows = await prisma.orgUnit.findMany({
    where: { tenantId },
    select: { id: true, parentId: true },
  });
  return new Map(rows.map((r) => [r.id, r.parentId]));
}

function orgUnitInSubtree(
  actorUnitId: string,
  grantUnitId: string,
  parentById: Map<string, string | null>,
): boolean {
  let current: string | null = actorUnitId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current === grantUnitId) return true;
    current = parentById.get(current) ?? null;
  }
  return false;
}

export async function actorMatchesPublishAudience(
  actor: TenantDocumentationActorContext,
  audience: TenantDocumentationPublishAudience,
): Promise<boolean> {
  if (audience.mode === "club") {
    return actorMatchesAudience(actor.identity, actor.membership, {
      kind: "ORGANISATION",
    });
  }

  const parentById = await loadOrgUnitAncestorMap(actor.identity.tenantId);
  for (const grantUnitId of audience.orgUnitIds) {
    for (const actorUnitId of actor.membership.orgUnitIds) {
      if (
        actorUnitId === grantUnitId ||
        orgUnitInSubtree(actorUnitId, grantUnitId, parentById)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function audienceBreadthRank(audience: TenantDocumentationPublishAudience): number {
  if (audience.mode === "club") return 1000;
  return audience.orgUnitIds.length;
}

export function isAudienceBroaderThan(
  next: TenantDocumentationPublishAudience,
  prev: TenantDocumentationPublishAudience,
): boolean {
  if (prev.mode === "org_units" && next.mode === "club") return true;
  if (prev.mode === "club" && next.mode === "club") return false;
  if (prev.mode === "club" && next.mode === "org_units") return false;
  if (prev.mode === "org_units" && next.mode === "org_units") {
    const prevSet = new Set(prev.orgUnitIds);
    return next.orgUnitIds.some((id) => !prevSet.has(id)) || next.orgUnitIds.length > prev.orgUnitIds.length;
  }
  return false;
}

export async function wouldMoveBroadenPublishAudience(input: {
  pageId: string;
  tenantId: string;
  newParentId: string | null;
}): Promise<{
  broadens: boolean;
  current: TenantDocumentationPublishAudience;
  afterMoveInherited: TenantDocumentationPublishAudience;
}> {
  const explicit = await resolveExplicitPublishAudience(input.pageId, input.tenantId);
  const current = await resolveEffectivePublishAudience(input.pageId, input.tenantId);

  let afterMoveInherited: TenantDocumentationPublishAudience;
  if (explicit) {
    afterMoveInherited = await resolveInheritedPublishAudience(input.pageId, input.tenantId);
  } else if (input.newParentId) {
    afterMoveInherited = await resolveEffectivePublishAudience(
      input.newParentId,
      input.tenantId,
    );
  } else {
    const page = await prisma.tenantDocumentationPage.findFirst({
      where: { id: input.pageId, tenantId: input.tenantId },
      select: { spaceId: true },
    });
    afterMoveInherited = page
      ? await loadSpaceDefaultAudience(page.spaceId, input.tenantId)
      : { mode: "club" };
  }

  const broadens = !explicit && isAudienceBroaderThan(afterMoveInherited, current);
  return { broadens, current, afterMoveInherited };
}

export async function replacePagePublishAudienceGrants(input: {
  tenantId: string;
  pageId: string;
  audience: TenantDocumentationPublishAudience;
}) {
  await prisma.tenantDocumentationAccessGrant.deleteMany({
    where: {
      tenantId: input.tenantId,
      pageId: input.pageId,
      resourceType: TenantDocumentationResourceType.PAGE,
      accessLevel: TenantDocumentationAccessLevel.VIEW,
      subjectType: {
        in: [
          TenantDocumentationAccessSubjectType.CLUB,
          TenantDocumentationAccessSubjectType.ORG_UNIT,
        ],
      },
    },
  });

  if (input.audience.mode === "club") {
    await prisma.tenantDocumentationAccessGrant.create({
      data: {
        tenantId: input.tenantId,
        resourceType: TenantDocumentationResourceType.PAGE,
        pageId: input.pageId,
        subjectType: TenantDocumentationAccessSubjectType.CLUB,
        accessLevel: TenantDocumentationAccessLevel.VIEW,
      },
    });
    return;
  }

  for (const orgUnitId of input.audience.orgUnitIds) {
    await prisma.tenantDocumentationAccessGrant.create({
      data: {
        tenantId: input.tenantId,
        resourceType: TenantDocumentationResourceType.PAGE,
        pageId: input.pageId,
        subjectType: TenantDocumentationAccessSubjectType.ORG_UNIT,
        orgUnitId,
        accessLevel: TenantDocumentationAccessLevel.VIEW,
      },
    });
  }
}

export function publishAudienceToLabel(audience: TenantDocumentationPublishAudience): string {
  if (audience.mode === "club") return "Gesamtverein";
  return `${audience.orgUnitIds.length} Org-Einheit(en)`;
}