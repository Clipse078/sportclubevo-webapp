import { ShieldAlert } from "lucide-react";
import { FutureModulePageContent } from "@/components/admin/future-modules/FutureModulePageContent";
import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { VORFAELLE_DISZIPLIN_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function VorfaelleDisziplinPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vorfälle & Disziplin"
        title="Vorfälle & Disziplin"
        description="Vorfälle, Disziplinarfälle und Schutzprozesse strukturiert und diskret bearbeiten."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vorfälle & Disziplin" },
        ]}
        headerBadge={<Badge variant="warning">In Vorbereitung</Badge>}
      >
        <FutureModulePageContent
          icon={ShieldAlert}
          capabilities={VORFAELLE_DISZIPLIN_CAPABILITIES}
          footerNote="Dieses Modul ist für professionelle, neutrale und kontrollierte Fallbearbeitung vorgesehen. Es werden keine Vorfälle, Fälle oder vertrauliche Akten angezeigt."
        />
      </ListPagePattern>
    </PageShell>
  );
}
