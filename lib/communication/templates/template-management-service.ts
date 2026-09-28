/**
 * SCE-COMM-UX-07 — Vorlagen list/detail helpers (COMM-16 canonical model).
 */

import { prisma } from "@/lib/db/prisma";
import type { PlatformCommunicationTemplateStatus } from "@prisma/client";
import {
  buildVorlageContentPreview,
  kindMatchesMitteilungenFilter,
  vorlageApplicabilityLabel,
} from "@/lib/communication/templates/vorlagen-display";
import {
  getPlatformCommunicationTemplate,
  type PlatformTemplateListItem,
} from "@/lib/communication/templates/platform-template-service";
import { countTemplateUsageByIds } from "@/lib/communication/templates/template-usage-references";
import type { PlatformCommunicationTemplateKind } from "@/lib/communication/templates/platform-template-constants";
import { summarizeClubAudienceSpec } from "@/lib/communication/club/club-audience-summary";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export type VorlagenKindFilter = "ALL" | "CAMPAIGN" | "MITTEILUNGEN";
export type VorlagenStatusFilter = "ACTIVE" | "ARCHIVED" | "ALL";

export type VorlageOverviewRow = PlatformTemplateListItem & {
  applicabilityLabel: string;
  contentPreview: string;
  usageCount: number;
  creatorDisplayName: string | null;
};

export async function listVorlagenForManagement(input: {
  tenantId: string;
  search?: string;
  kindFilter?: VorlagenKindFilter;
  statusFilter?: VorlagenStatusFilter;
}): Promise<VorlageOverviewRow[]> {
  const statusFilter = input.statusFilter ?? "ACTIVE";
  const statusWhere: PlatformCommunicationTemplateStatus | { not: PlatformCommunicationTemplateStatus } | undefined =
    statusFilter === "ARCHIVED"
      ? "ARCHIVED"
      : statusFilter === "ALL"
        ? undefined
        : { not: "ARCHIVED" };

  const rows = await prisma.platformCommunicationTemplate.findMany({
    where: {
      tenantId: input.tenantId,
      ...(statusWhere ? { status: statusWhere } : {}),
      ...(input.kindFilter === "CAMPAIGN" ? { kind: "CAMPAIGN" } : {}),
      ...(input.kindFilter === "MITTEILUNGEN"
        ? { kind: { in: ["MESSAGE", "ANNOUNCEMENT", "ALERT"] } }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    include: {
      createdByUser: {
        select: {
          person: {
            select: { displayName: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const q = input.search?.trim().toLowerCase();
  const filtered = q
    ? rows.filter((row) => {
        const haystack = [
          row.name,
          row.description ?? "",
          row.subject ?? "",
          row.bodyText,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : rows;

  const usageCounts = await countTemplateUsageByIds(
    input.tenantId,
    filtered.map((r) => r.id),
  );

  return filtered.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind as PlatformCommunicationTemplateKind,
    status: row.status,
    subject: row.subject,
    updatedAt: row.updatedAt.toISOString(),
    applicabilityLabel: vorlageApplicabilityLabel(row.kind),
    contentPreview: buildVorlageContentPreview(row.bodyText, row.subject),
    usageCount: usageCounts[row.id] ?? 0,
    creatorDisplayName: resolveCreatorDisplayName(row.createdByUser),
  }));
}

function resolveCreatorDisplayName(
  user: {
    person: {
      displayName: string | null;
      firstName: string;
      lastName: string;
    } | null;
  } | null,
): string | null {
  if (!user?.person) return null;
  const named =
    user.person.displayName?.trim() ||
    `${user.person.firstName} ${user.person.lastName}`.trim();
  return named || null;
}

export async function getVorlageForManagement(input: { tenantId: string; templateId: string }) {
  const row = await prisma.platformCommunicationTemplate.findFirst({
    where: { id: input.templateId, tenantId: input.tenantId },
    include: {
      createdByUser: {
        select: {
          person: {
            select: { displayName: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!row) return null;

  const template = await getPlatformCommunicationTemplate(input);
  const audience = template.audienceSpec;
  const audienceSummary = audience ? summarizeClubAudienceSpec(audience) : null;

  return {
    ...template,
    audienceSpecJson: audience,
    orchestrationMetaJson: template.orchestration,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    creatorDisplayName: resolveCreatorDisplayName(row.createdByUser),
    audienceSummary,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

export function templateKindAllowedForMitteilungComposer(kind: string): boolean {
  return kindMatchesMitteilungenFilter(kind) && kind !== "MESSAGE";
}

/** Direct inbox composer (COMM-UX-04A) stays template-free; MESSAGE templates remain for club drafts only. */
export const DIRECT_MESSAGE_TEMPLATE_BOUNDARY =
  "Leichte Direktnachrichten im Posteingang nutzen keine Vorlagen. MESSAGE-Vorlagen gelten für Vereins-Mitteilungsentwürfe.";

export type { CommunicationAudienceSpec };
