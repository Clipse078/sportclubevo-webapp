import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";
import { listPlatformCommunicationTemplates } from "@/lib/communication/templates/platform-template-service";
import { templateKindAllowedForMitteilungComposer } from "@/lib/communication/templates/template-management-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export async function bootstrapMitteilungComposer(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  tenantTimezone: string | null;
}) {
  const targetGroups = await listZielgruppenForManagement({
    tenantId: input.tenantId,
    statusFilter: "ACTIVE",
  });

  const templateAuthz = await resolvePlatformTemplateAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
  });

  const templateOptions = templateAuthz.canView
    ? (await listPlatformCommunicationTemplates({ tenantId: input.tenantId }))
        .filter(
          (t) =>
            templateKindAllowedForMitteilungComposer(t.kind) &&
            (t.status === "ACTIVE" || t.status === "DRAFT"),
        )
        .map((t) => ({ id: t.id, name: t.name, kind: t.kind }))
    : [];

  return {
    targetGroups: targetGroups.map((tg) => ({
      id: tg.id,
      name: tg.name,
      status: tg.status,
    })),
    templateOptions,
    tenantTimezone: resolveTenantEventTimezone(input.tenantTimezone),
    tenantId: input.tenantId,
  };
}
