import { getTenantPermissionCatalog } from "@/lib/roles/tenant-queries";
import { getPersonNavEffectiveAccessSections } from "@/lib/admin/users/person-nav-effective-access";
import PersonNavEffectiveAccessView from "@/components/admin/users/PersonNavEffectiveAccessView";

type Props = {
  tenantId: string;
  userId: string;
};

export default async function PersonNavEffectiveAccessCard({ tenantId, userId }: Props) {
  const moduleGroups = await getTenantPermissionCatalog();
  const sections = await getPersonNavEffectiveAccessSections(tenantId, userId, moduleGroups);

  return (
    <div className="space-y-3" data-testid="person-zugriff-panel">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Effektiver Zugriff</h2>
        <p className="max-w-3xl text-sm text-[var(--text-2)]">
          Effektiver Zugriff ist das Ergebnis aus Rollen, Zuständigkeiten und individuellen
          Anpassungen — gruppiert nach Produktbereich. Klappe Bereiche auf, um Details inklusive
          Herkunft zu prüfen.
        </p>
      </div>
      <PersonNavEffectiveAccessView sections={sections} collapsible />
    </div>
  );
}
