import { ShieldAlert } from "lucide-react";
import { FutureModuleShell } from "@/components/admin/future-modules/FutureModuleShell";
import { VORFAELLE_DISZIPLIN_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function VorfaelleDisziplinPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <FutureModuleShell
      title="Vorfälle & Disziplin"
      purpose="Vorfälle, Disziplinarfälle und Schutzprozesse strukturiert und diskret bearbeiten."
      icon={ShieldAlert}
      capabilities={VORFAELLE_DISZIPLIN_CAPABILITIES}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Vorfälle & Disziplin" },
      ]}
      footerNote="Dieses Modul ist für professionelle, neutrale und kontrollierte Fallbearbeitung vorgesehen. Es werden keine Vorfälle, Fälle oder vertrauliche Akten angezeigt."
    />
  );
}
