import Link from "next/link";
import TournamentEventCreateForm from "@/components/admin/events/TournamentEventCreateForm";
import { FormPagePattern } from "@/components/ui/patterns";
import { PageShell } from "@/components/ui/page";
import { buildPlanningActivitiesBreadcrumbs } from "@/components/admin/planning/PlanningActivitiesPageFrame";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NewTournamentEventPage() {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Planung"
        title="Turnier-Event erstellen"
        description="Manuelle Erfassung eines Turnier-Events pro Team und Saison."
        breadcrumbs={buildPlanningActivitiesBreadcrumbs("Turnier-Event", [
          { label: "Events", href: "/dashboard/events" },
        ])}
        cancelAction={
          <Link href="/dashboard/events?type=TOURNAMENT" className="fca-button-secondary">
            Zurück zu Events
          </Link>
        }
      >
        <TournamentEventCreateForm />
      </FormPagePattern>
    </PageShell>
  );
}
