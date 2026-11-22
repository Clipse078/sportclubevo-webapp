import {
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
  TenantDocumentationDraftSaveStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { accessLevelPermits } from "@/lib/tenant-documentation/authorization";
import {
  loadPageAccessContext,
  resolvePageEffectiveAccess,
} from "@/lib/tenant-documentation/page-access-service";
import { actorCanDiscoverPage } from "@/lib/tenant-documentation/page-visibility-service";
import {
  wouldMoveBroadenPublishAudience,
} from "@/lib/tenant-documentation/publish-audience";
import { TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE } from "@/lib/tenant-documentation/page-lifecycle";
import { emptyYjsState, yjsStateToRichTextSnapshot } from "@/lib/tenant-documentation/yjs-document";

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
    where: {
      tenantId: actor.identity.tenantId,
      spaceId,
      ...TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE,
    },
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
    visibility.set(page.id, await actorCanDiscoverPage(actor, page.id));
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

  const maxSort = await prisma.tenantDocumentationPage.aggregate({
    where: { spaceId: input.spaceId, parentId: input.parentId },
    _max: { sortOrder: true },
  });

  return prisma.$transaction(async (tx) => {
    const page = await tx.tenantDocumentationPage.create({
      data: {
        tenantId: input.actor.identity.tenantId,
        spaceId: input.spaceId,
        parentId: input.parentId,
        title: input.title,
        slug: input.slug,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    const initialState = emptyYjsState();
    const contentJson = yjsStateToRichTextSnapshot(initialState);
    await tx.tenantDocumentationPageDraft.create({
      data: {
        pageId: page.id,
        tenantId: input.actor.identity.tenantId,
        contentJson,
        yjsState: Buffer.from(initialState),
        revision: BigInt(0),
        saveStatus: TenantDocumentationDraftSaveStatus.SAVED,
        updatedByUserId: input.actorUserId,
      },
    });

    return page;
  });
}

export function slugifyDocumentationTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `seite-${Date.now()}`;
}

export async function moveDocumentationPage(input: {
  actor: TenantDocumentationActorContext;
  pageId: string;
  newParentId: string | null;
  confirmAudienceBroaden?: boolean;
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

  const broaden = await wouldMoveBroadenPublishAudience({
    pageId: input.pageId,
    tenantId: input.actor.identity.tenantId,
    newParentId: input.newParentId,
  });
  if (broaden.broadens && !input.confirmAudienceBroaden) {
    throw new Error("AUDIENCE_BROADEN_CONFIRM_REQUIRED");
  }

  return prisma.tenantDocumentationPage.update({
    where: { id: input.pageId },
    data: { parentId: input.newParentId },
  });
}

async function seedDocumentationPageDraft(
  tx: Pick<typeof prisma, "tenantDocumentationPageDraft">,
  tenantId: string,
  pageId: string,
) {
  const initialState = emptyYjsState();
  const contentJson = yjsStateToRichTextSnapshot(initialState);
  await tx.tenantDocumentationPageDraft.create({
    data: {
      pageId,
      tenantId,
      contentJson,
      yjsState: Buffer.from(initialState),
      revision: BigInt(0),
      saveStatus: TenantDocumentationDraftSaveStatus.SAVED,
    },
  });
}

async function seedDefaultVereinsleitungPages(
  tx: Pick<
    typeof prisma,
    | "tenantDocumentationPage"
    | "tenantDocumentationAccessGrant"
    | "tenantDocumentationPageDraft"
  >,
  tenantId: string,
  spaceId: string,
) {
  const pageCount = await tx.tenantDocumentationPage.count({
    where: { tenantId, spaceId },
  });
  if (pageCount > 0) return;

  const grantCount = await tx.tenantDocumentationAccessGrant.count({
    where: { tenantId, spaceId, resourceType: TenantDocumentationResourceType.SPACE },
  });
  if (grantCount === 0) {
    await tx.tenantDocumentationAccessGrant.create({
      data: {
        tenantId,
        resourceType: TenantDocumentationResourceType.SPACE,
        spaceId,
        subjectType: TenantDocumentationAccessSubjectType.CLUB,
        accessLevel: TenantDocumentationAccessLevel.VIEW,
      },
    });
  }

  const folder = await tx.tenantDocumentationPage.create({
    data: {
      tenantId,
      spaceId,
      title: "Sitzungsprotokolle",
      slug: "sitzungsprotokolle",
      sortOrder: 0,
    },
  });
  await seedDocumentationPageDraft(tx, tenantId, folder.id);

  const child = await tx.tenantDocumentationPage.create({
    data: {
      tenantId,
      spaceId,
      parentId: folder.id,
      title: "Sitzung vom 15. Dezember",
      slug: "sitzung-vom-15-dezember",
      sortOrder: 0,
    },
  });
  await seedDocumentationPageDraft(tx, tenantId, child.id);
}

export async function ensureDefaultSpace(
  tenantId: string,
  ownerUserId: string | null,
) {
  const existing = await prisma.tenantDocumentationSpace.findFirst({
    where: { tenantId, slug: "vereinsleitung" },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await seedDefaultVereinsleitungPages(tx, tenantId, existing.id);
    });
    return existing;
  }

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

    await seedDefaultVereinsleitungPages(tx, tenantId, space.id);

    return space;
  });
}