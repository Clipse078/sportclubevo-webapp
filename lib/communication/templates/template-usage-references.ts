/**
 * SCE-COMM-UX-07 — bounded usage visibility via persisted template provenance only.
 */

import { prisma } from "@/lib/db/prisma";
import { vorlageKindLabel } from "@/lib/communication/templates/vorlagen-display";

const MAX_LIST_ITEMS = 12;

export type TemplateUsageReference = {
  id: string;
  label: string;
  href: string;
  status: string;
  kind: string;
};

export type TemplateUsageSummary = {
  references: TemplateUsageReference[];
  totalCount: number;
  truncated: boolean;
};

function communicationHref(kind: string, id: string): string {
  if (kind === "CAMPAIGN") {
    return `/dashboard/communication/kampagnen/${id}`;
  }
  return `/dashboard/communication/mitteilungen/${id}`;
}

function communicationLabel(input: {
  kind: string;
  internalName: string | null;
  subject: string | null;
}): string {
  const title = input.internalName?.trim() || input.subject?.trim();
  if (title) return title;
  return vorlageKindLabel(input.kind);
}

export async function getTemplateUsageSummary(
  tenantId: string,
  templateId: string,
): Promise<TemplateUsageSummary> {
  const [totalCount, rows] = await Promise.all([
    prisma.platformCommunication.count({
      where: { tenantId, sourcePlatformTemplateId: templateId },
    }),
    prisma.platformCommunication.findMany({
      where: { tenantId, sourcePlatformTemplateId: templateId },
      orderBy: { updatedAt: "desc" },
      take: MAX_LIST_ITEMS,
      select: {
        id: true,
        kind: true,
        status: true,
        internalName: true,
        subject: true,
      },
    }),
  ]);

  return {
    totalCount,
    truncated: totalCount > rows.length,
    references: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      label: communicationLabel(row),
      href: communicationHref(row.kind, row.id),
    })),
  };
}

export async function countTemplateUsageByIds(
  tenantId: string,
  templateIds: string[],
): Promise<Record<string, number>> {
  if (templateIds.length === 0) return {};
  const grouped = await prisma.platformCommunication.groupBy({
    by: ["sourcePlatformTemplateId"],
    where: {
      tenantId,
      sourcePlatformTemplateId: { in: templateIds },
    },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const row of grouped) {
    if (row.sourcePlatformTemplateId) {
      out[row.sourcePlatformTemplateId] = row._count._all;
    }
  }
  return out;
}
