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
    <div className="sce-detail-section">
      <div className="sce-detail-section-header">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          Effektiver Zugriff
        </p>
      </div>
      <div className="sce-detail-section-body">
        <PersonNavEffectiveAccessView sections={sections} />
      </div>
    </div>
  );
}
