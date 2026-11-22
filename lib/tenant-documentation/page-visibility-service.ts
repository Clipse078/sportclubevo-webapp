import { TenantDocumentationAccessLevel } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  accessLevelPermits,
  type TenantDocumentationActorContext,
} from "@/lib/tenant-documentation/authorization";
import { resolvePageEffectiveAccess } from "@/lib/tenant-documentation/page-access-service";
import {
  deriveTenantDocumentationPageLifecycle,
  type TenantDocumentationPageLifecycleState,
} from "@/lib/tenant-documentation/page-lifecycle";
import {
  actorMatchesPublishAudience,
  resolveEffectivePublishAudience,
} from "@/lib/tenant-documentation/publish-audience";

/** Tree, search, direct links, version history, mentions — published read gate. */
export async function actorCanViewPublishedPage(
  actor: TenantDocumentationActorContext,
  pageId: string,
): Promise<boolean> {
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId: actor.identity.tenantId },
    select: { publishedVersionId: true },
  });
  if (!page?.publishedVersionId) return false;

  const audience = await resolveEffectivePublishAudience(pageId, actor.identity.tenantId);
  return actorMatchesPublishAudience(actor, audience);
}

/** Draft/collaboration visibility — does not grant publish read by itself. */
export async function actorCanCollaborateOnPage(
  actor: TenantDocumentationActorContext,
  pageId: string,
  required: TenantDocumentationAccessLevel,
): Promise<boolean> {
  const effective = await resolvePageEffectiveAccess(actor, pageId);
  return accessLevelPermits(effective, required);
}

export async function actorCanDiscoverPage(
  actor: TenantDocumentationActorContext,
  pageId: string,
): Promise<boolean> {
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId: actor.identity.tenantId },
    select: { publishedVersionId: true, archivedAt: true, trashedAt: true },
  });
  if (!page) return false;

  const lifecycle = deriveTenantDocumentationPageLifecycle(page);
  if (lifecycle !== "ACTIVE") {
    return actorCanCollaborateOnPage(
      actor,
      pageId,
      TenantDocumentationAccessLevel.MANAGE,
    );
  }

  if (page.publishedVersionId) {
    return actorCanViewPublishedPage(actor, pageId);
  }

  return actorCanCollaborateOnPage(actor, pageId, TenantDocumentationAccessLevel.VIEW);
}

export async function loadPageLifecycleState(
  pageId: string,
  tenantId: string,
): Promise<TenantDocumentationPageLifecycleState | null> {
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId },
    select: { archivedAt: true, trashedAt: true },
  });
  if (!page) return null;
  return deriveTenantDocumentationPageLifecycle(page);
}