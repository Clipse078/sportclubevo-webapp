import {
  TenantDocumentationAccessLevel,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { accessLevelPermits } from "@/lib/tenant-documentation/authorization";
import { resolvePageEffectiveAccess } from "@/lib/tenant-documentation/page-access-service";

export type TenantDocumentationSearchHit = {
  pageId: string;
  title: string;
  spaceTitle: string;
  snippet: string;
  publishedVersionId: string;
};

export async function searchPublishedDocumentation(
  actor: TenantDocumentationActorContext,
  query: string,
): Promise<TenantDocumentationSearchHit[]> {
  const normalized = query.trim();
  if (normalized.length < 2) return [];

  const tenantId = actor.identity.tenantId;
  const like = `%${normalized}%`;

  const pages = await prisma.tenantDocumentationPage.findMany({
    where: {
      tenantId,
      publishedVersionId: { not: null },
      OR: [
        { title: { contains: normalized, mode: "insensitive" } },
        {
          publishedVersion: {
            plainText: { contains: normalized, mode: "insensitive" },
          },
        },
      ],
    },
    include: {
      space: { select: { title: true } },
      publishedVersion: {
        select: { id: true, plainText: true },
      },
    },
    take: 25,
  });

  const hits: TenantDocumentationSearchHit[] = [];
  for (const page of pages) {
    if (!page.publishedVersion) continue;
    const effective = await resolvePageEffectiveAccess(actor, page.id);
    if (!accessLevelPermits(effective, TenantDocumentationAccessLevel.VIEW)) {
      continue;
    }
    const plain = page.publishedVersion.plainText;
    const idx = plain.toLowerCase().indexOf(normalized.toLowerCase());
    const snippet =
      idx >= 0
        ? plain.slice(Math.max(0, idx - 40), idx + normalized.length + 80)
        : page.title;

    hits.push({
      pageId: page.id,
      title: page.title,
      spaceTitle: page.space.title,
      snippet,
      publishedVersionId: page.publishedVersion.id,
    });
  }

  return hits;
}