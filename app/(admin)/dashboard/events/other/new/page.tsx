import Link from "next/link";
import OtherEventCreateForm from "@/components/admin/events/OtherEventCreateForm";
import { FormPagePattern } from "@/components/ui/patterns";
import { PageShell } from "@/components/ui/page";
import { buildPlanningActivitiesBreadcrumbs } from "@/components/admin/planning/PlanningActivitiesPageFrame";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NewOtherEventPage() {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Planung"
        title="Sonstiges Event erstellen"
        description="Manuelle Erfassung weiterer Vereinsanlässe pro Saison."
        breadcrumbs={buildPlanningActivitiesBreadcrumbs("Sonstiges Event", [
          { label: "Events", href: "/dashboard/events" },
        ])}
        cancelAction={
          <Link href="/dashboard/events" className="fca-button-secondary">
            Zurück zu Events
          </Link>
        }
      >
        <OtherEventCreateForm />
      </FormPagePattern>
    </PageShell>
  );
}
