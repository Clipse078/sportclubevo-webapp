import Link from "next/link";
import TrainingEventCreateForm from "@/components/admin/events/TrainingEventCreateForm";
import { FormPagePattern } from "@/components/ui/patterns";
import { PageShell } from "@/components/ui/page";
import { buildPlanningActivitiesBreadcrumbs } from "@/components/admin/planning/PlanningActivitiesPageFrame";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NewTrainingEventPage() {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Planung"
        title="Training-Event erstellen"
        description="Manuelle Erfassung eines Trainings pro Team und Saison."
        breadcrumbs={buildPlanningActivitiesBreadcrumbs("Training-Event", [
          { label: "Events", href: "/dashboard/events" },
        ])}
        cancelAction={
          <Link href="/dashboard/events?type=TRAINING" className="fca-button-secondary">
            Zurück zu Events
          </Link>
        }
      >
        <TrainingEventCreateForm />
      </FormPagePattern>
    </PageShell>
  );
}
