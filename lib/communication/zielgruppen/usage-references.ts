/**
 * SCE-COMM-UX-06 — bounded usage visibility for saved Zielgruppen (persisted refs only).
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

const MAX_COMMUNICATION_SCAN = 200;
const MAX_LIST_ITEMS = 8;

export type ZielgruppeUsageReference = {
  kind: "CAMPAIGN" | "CLUB_MESSAGE" | "TEMPLATE" | "REQUIREMENT" | "REGISTRATION";
  id: string;
  label: string;
  href: string | null;
  statusHint?: string | null;
};

export type ZielgruppeUsageSummary = {
  references: ZielgruppeUsageReference[];
  truncated: boolean;
};

function audienceSpecReferencesTargetGroup(
  audienceSpec: unknown,
  targetGroupId: string,
): boolean {
  if (!audienceSpec || typeof audienceSpec !== "object") return false;
  const spec = audienceSpec as CommunicationAudienceSpec;
  for (const component of spec.components ?? []) {
    if (component.savedTargetGroupIds?.includes(targetGroupId)) return true;
  }
  return false;
}

export async function getZielgruppeUsageSummary(
  tenantId: string,
  targetGroupId: string,
): Promise<ZielgruppeUsageSummary> {
  const references: ZielgruppeUsageReference[] = [];

  const [requirements, communications, templates, registrationCount] = await Promise.all([
    prisma.requirementDraftAudienceTargetGroup.findMany({
      where: { tenantId, targetGroupId },
      take: MAX_LIST_ITEMS,
      orderBy: { createdAt: "desc" },
      select: {
        requirement: {
          select: { id: true, title: true, status: true },
        },
      },
    }),
    prisma.platformCommunication.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: MAX_COMMUNICATION_SCAN,
      select: {
        id: true,
        kind: true,
        status: true,
        internalName: true,
        subject: true,
        audienceSpecJson: true,
      },
    }),
    prisma.platformCommunicationTemplate.findMany({
      where: { tenantId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: MAX_COMMUNICATION_SCAN,
      select: {
        id: true,
        name: true,
        kind: true,
        status: true,
        audienceSpecJson: true,
      },
    }),
    prisma.registration.count({
      where: { tenantId, targetGroupId },
    }),
  ]);

  for (const row of requirements) {
    const req = row.requirement;
    references.push({
      kind: "REQUIREMENT",
      id: req.id,
      label: req.title,
      href: `/dashboard/aufgaben/${req.id}`,
      statusHint: req.status,
    });
  }

  for (const comm of communications) {
    if (!audienceSpecReferencesTargetGroup(comm.audienceSpecJson, targetGroupId)) continue;
    if (references.length >= MAX_LIST_ITEMS) break;
    const title =
      comm.internalName?.trim() ||
      comm.subject?.trim() ||
      (comm.kind === "CAMPAIGN" ? "Kampagne" : "Mitteilung");
    references.push({
      kind: comm.kind === "CAMPAIGN" ? "CAMPAIGN" : "CLUB_MESSAGE",
      id: comm.id,
      label: title,
      href:
        comm.kind === "CAMPAIGN"
          ? `/dashboard/communication/kampagnen/${comm.id}`
          : `/dashboard/communication/mitteilungen/${comm.id}`,
      statusHint: comm.status,
    });
  }

  for (const tpl of templates) {
    if (!audienceSpecReferencesTargetGroup(tpl.audienceSpecJson, targetGroupId)) continue;
    if (references.length >= MAX_LIST_ITEMS) break;
    references.push({
      kind: "TEMPLATE",
      id: tpl.id,
      label: tpl.name,
      href: `/dashboard/communication/vorlagen/${tpl.id}`,
      statusHint: tpl.status,
    });
  }

  if (registrationCount > 0 && references.length < MAX_LIST_ITEMS) {
    references.push({
      kind: "REGISTRATION",
      id: targetGroupId,
      label: `${registrationCount} Anmeldung${registrationCount === 1 ? "" : "en"}`,
      href: null,
      statusHint: null,
    });
  }

  const truncated =
    requirements.length >= MAX_LIST_ITEMS ||
    references.length >= MAX_LIST_ITEMS;

  return { references: references.slice(0, MAX_LIST_ITEMS), truncated };
}
