import {
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { accessLevelPermits } from "@/lib/tenant-documentation/authorization";
import {
  loadPageAccessContext,
  resolvePageEffectiveAccess,
} from "@/lib/tenant-documentation/page-access-service";

export type TenantDocumentationTreeNode = {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: TenantDocumentationTreeNode[];
  canView: boolean;
};

export async function listAccessiblePageTree(
  actor: TenantDocumentationActorContext,
  spaceId: string,
): Promise<TenantDocumentationTreeNode[]> {
  const pages = await prisma.tenantDocumentationPage.findMany({
    where: { tenantId: actor.identity.tenantId, spaceId },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      parentId: true,
      sortOrder: true,
    },
  });

  const visibility = new Map<string, boolean>();
  for (const page of pages) {
    const effective = await resolvePageEffectiveAccess(actor, page.id);
    visibility.set(
      page.id,
      accessLevelPermits(effective, TenantDocumentationAccessLevel.VIEW),
    );
  }

  const nodes = new Map<string, TenantDocumentationTreeNode>();
  for (const page of pages) {
    nodes.set(page.id, {
      ...page,
      children: [],
      canView: visibility.get(page.id) === true,
    });
  }

  const roots: TenantDocumentationTreeNode[] = [];
  for (const node of nodes.values()) {
    if (!node.canView) continue;
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function createDocumentationPage(input: {
  actor: TenantDocumentationActorContext;
  actorUserId: string;
  spaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
}) {
  const space = await prisma.tenantDocumentationSpace.findFirst({
    where: { id: input.spaceId, tenantId: input.actor.identity.tenantId },
  });
  if (!space) throw new Error("Space not found");

  const siblingConflict = await prisma.tenantDocumentationPage.findFirst({
    where: {
      spaceId: input.spaceId,
      parentId: input.parentId,
      slug: input.slug,
    },
  });
  if (siblingConflict) {
    throw new Error("Slug conflict");
  }

  if (input.parentId) {
    const parentCtx = await loadPageAccessContext(
      input.parentId,
      input.actor.identity.tenantId,
    );
    if (!parentCtx) throw new Error("Parent not found");
    const effective = await resolvePageEffectiveAccess(input.actor, input.parentId);
    if (!accessLevelPermits(effective, TenantDocumentationAccessLevel.EDIT)) {
      throw new Error("Forbidden");
    }
  }

  return prisma.tenantDocumentationPage.create({
    data: {
      tenantId: input.actor.identity.tenantId,
      spaceId: input.spaceId,
      parentId: input.parentId,
      title: input.title,
      slug: input.slug,
    },
  });
}

export async function moveDocumentationPage(input: {
  actor: TenantDocumentationActorContext;
  pageId: string;
  newParentId: string | null;
}) {
  const ctx = await loadPageAccessContext(
    input.pageId,
    input.actor.identity.tenantId,
  );
  if (!ctx) throw new Error("Page not found");
  const sourceAccess = await resolvePageEffectiveAccess(input.actor, input.pageId);
  if (!accessLevelPermits(sourceAccess, TenantDocumentationAccessLevel.EDIT)) {
    throw new Error("Forbidden");
  }

  if (input.newParentId) {
    const destAccess = await resolvePageEffectiveAccess(
      input.actor,
      input.newParentId,
    );
    if (!accessLevelPermits(destAccess, TenantDocumentationAccessLevel.EDIT)) {
      throw new Error("Forbidden destination");
    }
  }

  return prisma.tenantDocumentationPage.update({
    where: { id: input.pageId },
    data: { parentId: input.newParentId },
  });
}

export async function ensureDefaultSpace(
  tenantId: string,
  ownerUserId: string | null,
) {
  const existing = await prisma.tenantDocumentationSpace.findFirst({
    where: { tenantId, slug: "vereinsleitung" },
  });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const space = await tx.tenantDocumentationSpace.create({
      data: {
        tenantId,
        slug: "vereinsleitung",
        title: "Vereinsleitung",
        ownerUserId,
        description: "Dokumentation der Vereinsleitung",
      },
    });

    await tx.tenantDocumentationAccessGrant.create({
      data: {
        tenantId,
        resourceType: TenantDocumentationResourceType.SPACE,
        spaceId: space.id,
        subjectType: TenantDocumentationAccessSubjectType.CLUB,
        accessLevel: TenantDocumentationAccessLevel.VIEW,
      },
    });

    const folder = await tx.tenantDocumentationPage.create({
      data: {
        tenantId,
        spaceId: space.id,
        title: "Sitzungsprotokolle",
        slug: "sitzungsprotokolle",
        sortOrder: 0,
      },
    });

    await tx.tenantDocumentationPage.create({
      data: {
        tenantId,
        spaceId: space.id,
        parentId: folder.id,
        title: "Sitzung vom 15. Dezember",
        slug: "sitzung-vom-15-dezember",
        sortOrder: 0,
      },
    });

    return space;
  });
}