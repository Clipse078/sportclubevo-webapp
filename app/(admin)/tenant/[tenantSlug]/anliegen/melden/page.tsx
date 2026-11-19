import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContextForSlug } from "@/lib/tenants/active-tenant";
import { CLUB_MELDUNG_WORKSPACE_COPY } from "@/lib/club-meldungen/copy";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import ClubMeldungReporterForm from "@/components/admin/club-meldungen/ClubMeldungReporterForm";
import ClubMeldungSchemaUnavailable from "@/components/admin/club-meldungen/ClubMeldungSchemaUnavailable";
import { isClubMeldungSchemaReady } from "@/lib/club-meldungen/schema-ready";

type Props = { params: Promise<{ tenantSlug: string }> };

export default async function TenantAnliegenMeldenPage({ params }: Props) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantContextForSlug(tenantSlug);
  await requireAnyPermission([PERMISSIONS.MELDUNGEN_SUBMIT], tenant.id);
  const schemaReady = await isClubMeldungSchemaReady();

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Vereinsbetrieb"
        title={CLUB_MELDUNG_WORKSPACE_COPY.reporterPortalTitle}
        description="Einmal melden — der Verein koordiniert die Bearbeitung intern."
        breadcrumbs={[
          { label: "Anliegen", href: `/tenant/${tenantSlug}/anliegen` },
          { label: "Melden" },
        ]}
      >
        {schemaReady ? (
          <ClubMeldungReporterForm tenantSlug={tenantSlug} />
        ) : (
          <ClubMeldungSchemaUnavailable />
        )}
      </FormPagePattern>
    </PageShell>
  );
}