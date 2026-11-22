import { prisma } from "@/lib/db/prisma";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE } from "@/lib/tenant-documentation/page-lifecycle";
import { actorCanViewPublishedPage } from "@/lib/tenant-documentation/page-visibility-service";

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
      ...TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE,
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
    if (!(await actorCanViewPublishedPage(actor, page.id))) {
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