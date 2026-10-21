import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveSponsorAudienceAuthorization } from "@/lib/sponsoring/sponsor-authorization";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";
import { listPlatformCommunicationTemplates } from "@/lib/communication/templates/platform-template-service";
import { prisma } from "@/lib/db/prisma";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export async function bootstrapCampaignComposer(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  tenantTimezone: string | null;
}) {
  const targetGroups = await listZielgruppenForManagement({
    tenantId: input.tenantId,
    statusFilter: "ACTIVE",
  });

  const sponsorAuth = await resolveSponsorAudienceAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
  });

  const sponsorOrganisations = sponsorAuth.canViewSponsorData
    ? await prisma.sponsorOrganisation.findMany({
        where: { tenantId: input.tenantId, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          contacts: {
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true, isPrimary: true },
            orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
          },
        },
        orderBy: { name: "asc" },
        take: 200,
      })
    : [];

  const templateAuthz = await resolvePlatformTemplateAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
  });

  const templateOptions = templateAuthz.canView
    ? (await listPlatformCommunicationTemplates({ tenantId: input.tenantId }))
        .filter((t) => t.kind === "CAMPAIGN" && (t.status === "ACTIVE" || t.status === "DRAFT"))
        .map((t) => ({ id: t.id, name: t.name }))
    : [];

  return {
    tenantId: input.tenantId,
    tenantTimezone: resolveTenantEventTimezone(input.tenantTimezone),
    targetGroups: targetGroups.map((tg) => ({
      id: tg.id,
      name: tg.name,
      status: tg.status,
    })),
    sponsorOrganisations: sponsorOrganisations.map((org) => ({
      id: org.id,
      name: org.name,
      contacts: org.contacts.map((c) => ({
        id: c.id,
        displayName: `${c.firstName} ${c.lastName}`.trim(),
        isPrimary: c.isPrimary,
      })),
    })),
    templateOptions,
    canManageTemplates: templateAuthz.canManage,
    initialAudienceMode: "WHOLE_ORG" as const,
    initialSponsorMode: "ALL_ACTIVE" as const,
    initialSponsorOrganisationIds: [] as string[],
    initialSponsorContactIds: [] as string[],
  };
}
