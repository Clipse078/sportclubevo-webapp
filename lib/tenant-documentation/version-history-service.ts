import { TenantDocumentationAccessLevel } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { assertPageAccess } from "@/lib/tenant-documentation/page-access-service";
import { actorCanViewPublishedPage } from "@/lib/tenant-documentation/page-visibility-service";

export class TenantDocumentationVersionHistoryError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "TenantDocumentationVersionHistoryError";
  }
}

export type TenantDocumentationVersionListItem = {
  id: string;
  versionNumber: number;
  publishedAt: string;
  publishedByLabel: string | null;
  isCurrent: boolean;
};

export async function listPageVersionHistory(
  actor: TenantDocumentationActorContext,
  pageId: string,
): Promise<TenantDocumentationVersionListItem[]> {
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId: actor.identity.tenantId },
    select: { id: true, publishedVersionId: true },
  });
  if (!page) {
    throw new TenantDocumentationVersionHistoryError("Seite nicht gefunden.", "NOT_FOUND");
  }

  try {
    await assertPageAccess(actor, pageId, TenantDocumentationAccessLevel.VIEW);
  } catch {
    const canViewPublished = await actorCanViewPublishedPage(actor, pageId);
    if (!canViewPublished) {
      throw new TenantDocumentationVersionHistoryError("Forbidden", "FORBIDDEN");
    }
  }

  const versions = await prisma.tenantDocumentationPageVersion.findMany({
    where: { pageId, tenantId: actor.identity.tenantId },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      publishedAt: true,
      publishedByUser: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  return versions.map((version) => {
    const name = version.publishedByUser
      ? `${version.publishedByUser.firstName ?? ""} ${version.publishedByUser.lastName ?? ""}`.trim() ||
        version.publishedByUser.email
      : null;
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt.toISOString(),
      publishedByLabel: name,
      isCurrent: version.id === page.publishedVersionId,
    };
  });
}

export async function loadPageVersionSnapshot(
  actor: TenantDocumentationActorContext,
  pageId: string,
  versionId: string,
) {
  const version = await prisma.tenantDocumentationPageVersion.findFirst({
    where: {
      id: versionId,
      pageId,
      tenantId: actor.identity.tenantId,
    },
    include: {
      page: {
        select: {
          id: true,
          title: true,
          publishedVersionId: true,
          spaceId: true,
          space: { select: { title: true } },
          parent: { select: { title: true } },
        },
      },
    },
  });
  if (!version) {
    throw new TenantDocumentationVersionHistoryError("Version nicht gefunden.", "NOT_FOUND");
  }

  const canViewPublished = await actorCanViewPublishedPage(actor, pageId);
  const hasView =
    canViewPublished ||
    (await assertPageAccess(actor, pageId, TenantDocumentationAccessLevel.VIEW).then(
      () => true,
      () => false,
    ));

  if (!hasView) {
    throw new TenantDocumentationVersionHistoryError("Forbidden", "FORBIDDEN");
  }

  return {
    version,
    isCurrent: version.id === version.page.publishedVersionId,
  };
}
