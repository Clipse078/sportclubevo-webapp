import Link from "next/link";
import MatchEventCreateForm from "@/components/admin/events/MatchEventCreateForm";
import { FormPagePattern } from "@/components/ui/patterns";
import { PageShell } from "@/components/ui/page";
import { buildPlanningActivitiesBreadcrumbs } from "@/components/admin/planning/PlanningActivitiesPageFrame";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NewMatchEventPage() {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Planung"
        title="Match erstellen"
        description="Manuelle Erfassung eines Matches pro Team. Dieser Flow speist später Homepage, Spielplan, Wochenplan, Teamseiten und Infoboard direkt aus dem WebApp Backend."
        breadcrumbs={buildPlanningActivitiesBreadcrumbs("Match erstellen", [
          { label: "Events", href: "/dashboard/events" },
        ])}
        cancelAction={
          <Link href="/dashboard/events?type=MATCH" className="fca-button-secondary">
            Zurück zu Events
          </Link>
        }
      >
        <MatchEventCreateForm />
      </FormPagePattern>
    </PageShell>
  );
}
