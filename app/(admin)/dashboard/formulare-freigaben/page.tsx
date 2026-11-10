import { FutureModulePageContent } from "@/components/admin/future-modules/FutureModulePageContent";
import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { FORMULARE_FREIGABEN_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function FormulareFreigabenPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Formulare & Freigaben"
        title="Formulare & Freigaben"
        description="Anfragen, Freigaben, Erklärungen und Einwilligungsprozesse zentral bündeln."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Formulare & Freigaben" },
        ]}
        headerBadge={<Badge variant="warning">In Vorbereitung</Badge>}
      >
        <FutureModulePageContent
          sceIcon="form"
          capabilities={FORMULARE_FREIGABEN_CAPABILITIES}
          footerNote="Unterschriftsprozesse werden vorbereitet, ohne rechtsgültige elektronische Signatur zu behaupten. Es gibt keine simulierten Einreichungen oder Signaturen."
        />
      </ListPagePattern>
    </PageShell>
  );
}
