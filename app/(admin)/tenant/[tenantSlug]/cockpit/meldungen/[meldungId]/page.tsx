import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContextForSlug } from "@/lib/tenants/active-tenant";
import { getClubMeldungDetail, listClubMeldungReporterTimeline } from "@/lib/club-meldungen/queries";
import { canMutateMeldungInternal, canViewMeldungInternal } from "@/lib/club-meldungen/access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import ClubMeldungHandlerDetailView from "@/components/admin/club-meldungen/ClubMeldungHandlerDetailView";
import ClubMeldungSchemaUnavailable from "@/components/admin/club-meldungen/ClubMeldungSchemaUnavailable";
import { loadClubMeldungAssignOptions } from "@/lib/club-meldungen/assign-lookup";
import { isClubMeldungSchemaReady } from "@/lib/club-meldungen/schema-ready";
import { CLUB_MELDUNG_WORKSPACE_COPY } from "@/lib/club-meldungen/copy";

type Props = { params: Promise<{ tenantSlug: string; meldungId: string }> };

export default async function TenantMeldungCockpitDetailPage({ params }: Props) {
  const { tenantSlug, meldungId } = await params;
  const tenant = await requireTenantContextForSlug(tenantSlug);
  const session = await requireAnyPermission(
    [PERMISSIONS.MELDUNGEN_HANDLE, PERMISSIONS.MELDUNGEN_VIEW_ALL],
    tenant.id,
  );
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const resolver = createEffectivePermissionResolver(prisma);
  const effective = await resolver.getEffectivePermissions({ userId: actorUserId, tenantId: tenant.id });
  const permissionKeys = [...effective.platform, ...effective.tenant];

  const schemaReady = await isClubMeldungSchemaReady();
  if (!schemaReady) {
    return (
      <PageShell fullWidth>
        <DetailPagePattern
          eyebrow={CLUB_MELDUNG_WORKSPACE_COPY.moduleTitle}
          title={CLUB_MELDUNG_WORKSPACE_COPY.moduleTitle}
          description="Detail"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: CLUB_MELDUNG_WORKSPACE_COPY.moduleTitle, href: `/tenant/${tenantSlug}/cockpit/meldungen` },
          ]}
        >
          <ClubMeldungSchemaUnavailable />
        </DetailPagePattern>
      </PageShell>
    );
  }

  const meldung = await getClubMeldungDetail(tenant.id, meldungId);
  if (
    !meldung ||
    !canViewMeldungInternal(meldung, {
      actorUserId,
      permissionKeys,
      collaboratorUserIds: meldung.collaborators.map((c) => c.userId),
    })
  ) {
    notFound();
  }

  const timeline = await listClubMeldungReporterTimeline(tenant.id, meldungId, true);
  const canMutate = canMutateMeldungInternal(meldung, {
    actorUserId,
    permissionKeys,
    collaboratorUserIds: meldung.collaborators.map((c) => c.userId),
  });
  const assignOptions = canMutate
    ? await loadClubMeldungAssignOptions(tenant.id)
    : null;

  return (
    <PageShell fullWidth>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: CLUB_MELDUNG_WORKSPACE_COPY.moduleTitle,
            href: `/tenant/${tenantSlug}/cockpit/meldungen`,
          },
          { label: meldung.caseNumber },
        ]}
      >
        <ClubMeldungHandlerDetailView
          tenantSlug={tenantSlug}
          meldungId={meldung.id}
          version={meldung.version}
          canMutate={canMutate}
          actorUserId={actorUserId}
          caseNumber={meldung.caseNumber}
          subject={meldung.subject}
          description={meldung.description}
          category={meldung.category}
          status={meldung.status}
          locationHint={meldung.locationHint}
          urgent={meldung.urgent}
          resolutionSummary={meldung.resolutionSummary}
          waitReason={meldung.waitReason}
          followUpAt={meldung.followUpAt?.toISOString() ?? null}
          nextStep={meldung.nextStep}
          accountableUser={meldung.accountableUser}
          orgUnit={meldung.orgUnit}
          reporterUser={meldung.reporterUser}
          duplicateOf={meldung.duplicateOf}
          attachments={meldung.attachments.map((row) => ({
            id: row.id,
            originalFilename: row.attachment.originalFilename,
          }))}
          messages={timeline.messages.map((m) => ({
            id: m.id,
            body: m.body,
            audience: m.audience,
            createdAt: m.createdAt.toISOString(),
            author: m.author,
          }))}
          history={timeline.history.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            createdAt: event.createdAt.toISOString(),
            actor: event.actor ?? { firstName: "System", lastName: "" },
            payloadJson: event.payloadJson,
          }))}
          assignOptions={assignOptions}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}