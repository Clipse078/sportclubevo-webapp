import {
  TenantDocumentationAccessLevel,
  TenantDocumentationResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  assertTenantDocumentationAccess,
  resolveEffectivePageAccess,
  type TenantDocumentationActorContext,
} from "@/lib/tenant-documentation/authorization";

export async function loadPageAccessContext(pageId: string, tenantId: string) {
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId },
    select: {
      id: true,
      tenantId: true,
      spaceId: true,
      title: true,
      slug: true,
      parentId: true,
      publishedVersionId: true,
      space: { select: { id: true, slug: true, title: true } },
    },
  });
  if (!page) return null;

  const grants = await prisma.tenantDocumentationAccessGrant.findMany({
    where: {
      tenantId,
      OR: [
        { spaceId: page.spaceId, resourceType: TenantDocumentationResourceType.SPACE },
        { pageId: page.id, resourceType: TenantDocumentationResourceType.PAGE },
      ],
    },
  });

  const spaceGrants = grants.filter((g) => g.resourceType === TenantDocumentationResourceType.SPACE);
  const pageGrants = grants.filter((g) => g.resourceType === TenantDocumentationResourceType.PAGE);

  return {
    page,
    spaceGrants,
    pageGrants,
    spaceHasExplicitGrants: spaceGrants.length > 0,
  };
}

export async function resolvePageEffectiveAccess(
  actor: TenantDocumentationActorContext,
  pageId: string,
) {
  const ctx = await loadPageAccessContext(pageId, actor.identity.tenantId);
  if (!ctx) return null;
  if (ctx.page.tenantId !== actor.identity.tenantId) return null;

  return resolveEffectivePageAccess(actor, {
    spaceGrants: ctx.spaceGrants,
    pageGrants: ctx.pageGrants,
    spaceHasExplicitGrants: ctx.spaceHasExplicitGrants,
  });
}

export async function assertPageAccess(
  actor: TenantDocumentationActorContext,
  pageId: string,
  required: TenantDocumentationAccessLevel,
) {
  const effective = await resolvePageEffectiveAccess(actor, pageId);
  assertTenantDocumentationAccess(effective, required);
  return effective!;
}