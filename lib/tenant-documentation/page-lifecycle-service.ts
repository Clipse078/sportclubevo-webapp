import { TenantDocumentationAccessLevel } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assertTenantDocumentationAccess,
  TenantDocumentationAuthorizationError,
  type TenantDocumentationActorContext,
} from "@/lib/tenant-documentation/authorization";
import { resolvePageEffectiveAccess } from "@/lib/tenant-documentation/page-access-service";
import {
  deriveTenantDocumentationPageLifecycle,
  TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE,
} from "@/lib/tenant-documentation/page-lifecycle";
import {
  actorMatchesPublishAudience,
  resolveEffectivePublishAudience,
} from "@/lib/tenant-documentation/publish-audience";
import {
  TENANT_DOCUMENTATION_HUB_PATH,
  tenantDocumentationPagePath,
} from "@/lib/tenant-documentation/sce-tenant-documentation-handoff";

export type TenantDocumentationLifecycleErrorCode =
  | "PAGE_NOT_FOUND"
  | "FORBIDDEN"
  | "HAS_ACTIVE_CHILDREN"
  | "INVALID_STATE"
  | "RESTORE_PARENT_UNAVAILABLE"
  | "RESTORE_ACCESS_BLOCKED";

export class TenantDocumentationLifecycleError extends Error {
  readonly code: TenantDocumentationLifecycleErrorCode;

  constructor(code: TenantDocumentationLifecycleErrorCode, message: string) {
    super(message);
    this.name = "TenantDocumentationLifecycleError";
    this.code = code;
  }
}

async function assertManageOnPage(
  actor: TenantDocumentationActorContext,
  pageId: string,
) {
  const effective = await resolvePageEffectiveAccess(actor, pageId);
  try {
    assertTenantDocumentationAccess(effective, TenantDocumentationAccessLevel.MANAGE);
  } catch (error) {
    if (error instanceof TenantDocumentationAuthorizationError) {
      throw new TenantDocumentationLifecycleError("FORBIDDEN", "Forbidden");
    }
    throw error;
  }
}

async function countActiveChildren(
  tenantId: string,
  parentId: string,
): Promise<number> {
  return prisma.tenantDocumentationPage.count({
    where: {
      tenantId,
      parentId,
      ...TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE,
    },
  });
}

export async function archiveDocumentationPage(input: {
  actor: TenantDocumentationActorContext;
  pageId: string;
}): Promise<{ pageId: string; archivedAt: Date; redirectHref: string }> {
  const tenantId = input.actor.identity.tenantId;
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: input.pageId, tenantId },
    select: { id: true, parentId: true, archivedAt: true, trashedAt: true },
  });
  if (!page) {
    throw new TenantDocumentationLifecycleError("PAGE_NOT_FOUND", "Seite nicht gefunden.");
  }

  await assertManageOnPage(input.actor, input.pageId);

  const lifecycle = deriveTenantDocumentationPageLifecycle(page);
  if (lifecycle !== "ACTIVE") {
    throw new TenantDocumentationLifecycleError(
      "INVALID_STATE",
      "Nur aktive Seiten können archiviert werden.",
    );
  }

  const activeChildren = await countActiveChildren(tenantId, input.pageId);
  if (activeChildren > 0) {
    throw new TenantDocumentationLifecycleError(
      "HAS_ACTIVE_CHILDREN",
      "Diese Seite hat aktive Unterseiten. Verschieben oder archivieren Sie die Unterseiten zuerst.",
    );
  }

  const archivedAt = new Date();
  await prisma.tenantDocumentationPage.update({
    where: { id: input.pageId },
    data: { archivedAt },
  });

  return {
    pageId: input.pageId,
    archivedAt,
    redirectHref: await resolvePostLifecycleRedirectHref(input.actor, page.parentId),
  };
}

export async function trashDocumentationPage(input: {
  actor: TenantDocumentationActorContext;
  pageId: string;
}): Promise<{ pageId: string; trashedAt: Date; redirectHref: string }> {
  const tenantId = input.actor.identity.tenantId;
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: input.pageId, tenantId },
    select: { id: true, parentId: true, archivedAt: true, trashedAt: true },
  });
  if (!page) {
    throw new TenantDocumentationLifecycleError("PAGE_NOT_FOUND", "Seite nicht gefunden.");
  }

  await assertManageOnPage(input.actor, input.pageId);

  const lifecycle = deriveTenantDocumentationPageLifecycle(page);
  if (lifecycle === "TRASHED") {
    throw new TenantDocumentationLifecycleError(
      "INVALID_STATE",
      "Die Seite ist bereits im Papierkorb.",
    );
  }

  const activeChildren = await countActiveChildren(tenantId, input.pageId);
  if (activeChildren > 0) {
    throw new TenantDocumentationLifecycleError(
      "HAS_ACTIVE_CHILDREN",
      "Diese Seite hat aktive Unterseiten. Verschieben oder löschen Sie die Unterseiten zuerst.",
    );
  }

  const trashedAt = new Date();
  await prisma.tenantDocumentationPage.update({
    where: { id: input.pageId },
    data: { trashedAt },
  });

  return {
    pageId: input.pageId,
    trashedAt,
    redirectHref: await resolvePostLifecycleRedirectHref(input.actor, page.parentId),
  };
}

export async function restoreArchivedDocumentationPage(input: {
  actor: TenantDocumentationActorContext;
  pageId: string;
}): Promise<{ pageId: string; href: string }> {
  const tenantId = input.actor.identity.tenantId;
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: input.pageId, tenantId },
    select: {
      id: true,
      parentId: true,
      archivedAt: true,
      trashedAt: true,
      publishedVersionId: true,
    },
  });
  if (!page) {
    throw new TenantDocumentationLifecycleError("PAGE_NOT_FOUND", "Seite nicht gefunden.");
  }

  await assertManageOnPage(input.actor, input.pageId);

  if (deriveTenantDocumentationPageLifecycle(page) !== "ARCHIVED") {
    throw new TenantDocumentationLifecycleError(
      "INVALID_STATE",
      "Nur archivierte Seiten können hier wiederhergestellt werden.",
    );
  }

  await assertRestorePlacementAllowed(input.actor, page.parentId);

  await prisma.tenantDocumentationPage.update({
    where: { id: input.pageId },
    data: { archivedAt: null },
  });

  return { pageId: input.pageId, href: tenantDocumentationPagePath(input.pageId) };
}

export async function restoreTrashedDocumentationPage(input: {
  actor: TenantDocumentationActorContext;
  pageId: string;
}): Promise<{ pageId: string; href: string }> {
  const tenantId = input.actor.identity.tenantId;
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: input.pageId, tenantId },
    select: {
      id: true,
      parentId: true,
      archivedAt: true,
      trashedAt: true,
      publishedVersionId: true,
    },
  });
  if (!page) {
    throw new TenantDocumentationLifecycleError("PAGE_NOT_FOUND", "Seite nicht gefunden.");
  }

  await assertManageOnPage(input.actor, input.pageId);

  if (deriveTenantDocumentationPageLifecycle(page) !== "TRASHED") {
    throw new TenantDocumentationLifecycleError(
      "INVALID_STATE",
      "Nur Seiten im Papierkorb können wiederhergestellt werden.",
    );
  }

  await assertRestorePlacementAllowed(input.actor, page.parentId);

  await prisma.tenantDocumentationPage.update({
    where: { id: input.pageId },
    data: { trashedAt: null },
  });

  return { pageId: input.pageId, href: tenantDocumentationPagePath(input.pageId) };
}

async function assertRestorePlacementAllowed(
  actor: TenantDocumentationActorContext,
  parentId: string | null,
): Promise<void> {
  if (!parentId) return;

  const parent = await prisma.tenantDocumentationPage.findFirst({
    where: { id: parentId, tenantId: actor.identity.tenantId },
    select: { id: true, archivedAt: true, trashedAt: true, publishedVersionId: true },
  });

  if (!parent || deriveTenantDocumentationPageLifecycle(parent) !== "ACTIVE") {
    throw new TenantDocumentationLifecycleError(
      "RESTORE_PARENT_UNAVAILABLE",
      "Die übergeordnete Seite ist nicht mehr verfügbar. Verschieben Sie die Seite zuerst oder stellen Sie die übergeordnete Seite wieder her.",
    );
  }

  if (parent.publishedVersionId) {
    const audience = await resolveEffectivePublishAudience(
      parent.id,
      actor.identity.tenantId,
    );
    if (!(await actorMatchesPublishAudience(actor, audience))) {
      throw new TenantDocumentationLifecycleError(
        "RESTORE_ACCESS_BLOCKED",
        "Die ursprüngliche Sichtbarkeit kann nicht beibehalten werden, ohne den Leserkreis zu erweitern.",
      );
    }
  }
}

export async function resolvePostLifecycleRedirectHref(
  actor: TenantDocumentationActorContext,
  parentId: string | null,
): Promise<string> {
  const tenantId = actor.identity.tenantId;
  let cursor: string | null = parentId;

  while (cursor) {
    const parent = await prisma.tenantDocumentationPage.findFirst({
      where: { id: cursor, tenantId },
      select: {
        id: true,
        parentId: true,
        archivedAt: true,
        trashedAt: true,
        publishedVersionId: true,
      },
    });
    if (!parent) break;
    if (deriveTenantDocumentationPageLifecycle(parent) !== "ACTIVE") {
      cursor = parent.parentId;
      continue;
    }
    if (parent.publishedVersionId) {
      const audience = await resolveEffectivePublishAudience(parent.id, tenantId);
      if (await actorMatchesPublishAudience(actor, audience)) {
        return tenantDocumentationPagePath(parent.id);
      }
    }
    const effective = await resolvePageEffectiveAccess(actor, parent.id);
    if (effective) {
      return tenantDocumentationPagePath(parent.id);
    }
    cursor = parent.parentId;
  }

  return TENANT_DOCUMENTATION_HUB_PATH;
}

export type ArchivedPageListItem = {
  id: string;
  title: string;
  archivedAt: string;
  spaceTitle: string;
};

export async function listArchivedDocumentationPages(
  actor: TenantDocumentationActorContext,
  spaceId: string,
): Promise<ArchivedPageListItem[]> {
  if (!actor.permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_MANAGE)) {
    throw new TenantDocumentationLifecycleError("FORBIDDEN", "Forbidden");
  }

  const pages = await prisma.tenantDocumentationPage.findMany({
    where: {
      tenantId: actor.identity.tenantId,
      spaceId,
      archivedAt: { not: null },
      trashedAt: null,
    },
    orderBy: [{ archivedAt: "desc" }],
    select: {
      id: true,
      title: true,
      archivedAt: true,
      space: { select: { title: true } },
    },
  });

  return pages
    .filter((p) => p.archivedAt)
    .map((p) => ({
      id: p.id,
      title: p.title,
      archivedAt: p.archivedAt!.toISOString(),
      spaceTitle: p.space.title,
    }));
}