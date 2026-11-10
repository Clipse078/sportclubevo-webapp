import { FutureModulePageContent } from "@/components/admin/future-modules/FutureModulePageContent";
import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { TRAINER_STAFF_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function TrainerStaffPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Trainer & Staff"
        title="Trainer & Staff"
        description="Qualifikationen, Verantwortlichkeiten, Verfügbarkeit und den Staff-Lebenszykl im Verein verwalten."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trainer & Staff" },
        ]}
        headerBadge={<Badge variant="warning">In Vorbereitung</Badge>}
      >
        <FutureModulePageContent
          sceIcon="coach"
          capabilities={TRAINER_STAFF_CAPABILITIES}
          footerNote="Dieses Modul bereitet die Verwaltung von Trainer- und Staffprofilen vor — ohne Arbeitsverträge, rechtliche Workflows oder erfundene Qualifikationsdaten."
        />
      </ListPagePattern>
    </PageShell>
  );
}
