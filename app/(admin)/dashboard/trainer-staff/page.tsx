import { BadgeCheck } from "lucide-react";
import { FutureModuleShell } from "@/components/admin/future-modules/FutureModuleShell";
import { TRAINER_STAFF_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function TrainerStaffPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <FutureModuleShell
      title="Trainer & Staff"
      purpose="Qualifikationen, Verantwortlichkeiten, Verfügbarkeit und den Staff-Lebenszykl im Verein verwalten."
      icon={BadgeCheck}
      capabilities={TRAINER_STAFF_CAPABILITIES}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Trainer & Staff" },
      ]}
      footerNote="Dieses Modul bereitet die Verwaltung von Trainer- und Staffprofilen vor — ohne Arbeitsverträge, rechtliche Workflows oder erfundene Qualifikationsdaten."
    />
  );
}
