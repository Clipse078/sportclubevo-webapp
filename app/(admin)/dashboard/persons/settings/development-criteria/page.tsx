/**
 * PERSON-UX-06: Development Criterion Management page.
 *
 * /dashboard/persons/settings/development-criteria
 *
 * Authorized managers can:
 *   - View all criteria (active + inactive)
 *   - Create new criteria with free-text name, category, rating mode
 *   - Edit name, description, category, rating mode, benchmark settings
 *   - Activate/deactivate criteria
 *   - Reorder criteria
 *
 * Authorization: requires people.assessments.manage
 * No role-name checks. Permission-driven only.
 */

import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenantId } from "@/lib/tenants/active-tenant";
import { getTenantAllCriteria } from "@/lib/people/queries";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import DevelopmentCriteriaManager from "@/components/admin/persons/DevelopmentCriteriaManager";

export default async function DevelopmentCriteriaPage() {
  await requirePermission(PERMISSIONS.PEOPLE_ASSESSMENTS_MANAGE);
  const tenantId = await getActiveTenantId();
  const criteria = tenantId ? await getTenantAllCriteria(tenantId) : [];

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Personen"
        title="Bewertungs-Kriterien"
        description="Konfigurieren Sie die Kriterien für Entwicklungs-Bewertungen in Ihrem Verein."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Personen", href: "/dashboard/persons" },
          { label: "Bewertungs-Kriterien" },
        ]}
      >
        <DevelopmentCriteriaManager initialCriteria={criteria} />
      </ListPagePattern>
    </PageShell>
  );
}
