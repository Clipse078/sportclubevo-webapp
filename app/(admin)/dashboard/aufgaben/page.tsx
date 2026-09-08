import { ListChecks } from "lucide-react";
import { FutureModuleShell } from "@/components/admin/future-modules/FutureModuleShell";
import { AUFGABEN_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function AufgabenPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <FutureModuleShell
      title="Aufgaben"
      purpose="Vereinsübergreifende Verantwortlichkeiten, Follow-ups und Arbeitspunkte aus allen SCE-Modulen bündeln."
      icon={ListChecks}
      capabilities={AUFGABEN_CAPABILITIES}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Aufgaben" },
      ]}
      footerNote="Aufgaben ist als querschnittliches Modul gedacht: Es verbindet Anmeldungen, Planung, Meetings und weitere Bereiche — statt ein isoliertes Aufgaben-Silo zu werden."
    />
  );
}
