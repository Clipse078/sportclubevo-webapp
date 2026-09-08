import { FileCheck2 } from "lucide-react";
import { FutureModuleShell } from "@/components/admin/future-modules/FutureModuleShell";
import { FORMULARE_FREIGABEN_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function FormulareFreigabenPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <FutureModuleShell
      title="Formulare & Freigaben"
      purpose="Anfragen, Freigaben, Erklärungen und Einwilligungsprozesse zentral bündeln."
      icon={FileCheck2}
      capabilities={FORMULARE_FREIGABEN_CAPABILITIES}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Formulare & Freigaben" },
      ]}
      footerNote="Unterschriftsprozesse werden vorbereitet, ohne rechtsgültige elektronische Signatur zu behaupten. Es gibt keine simulierten Einreichungen oder Signaturen."
    />
  );
}
