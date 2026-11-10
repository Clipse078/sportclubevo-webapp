import EventImportUploader from "@/components/admin/events/EventImportUploader";
import EventImportRunsTable from "@/components/admin/events/EventImportRunsTable";
import { PlanningActivitiesPageFrame } from "@/components/admin/planning/PlanningActivitiesPageFrame";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function EventImportPage() {
  await requireAnyPermission([
    PERMISSIONS.EVENTS_IMPORT,
    PERMISSIONS.EVENTS_MANAGE,
  ]);

  return (
    <PlanningActivitiesPageFrame
      breadcrumbLeaf="Import"
      breadcrumbTrail={[{ label: "Events", href: "/dashboard/events" }]}
      title="Import von Events"
      description="CSV / Excel Upload für Matches, Turniere und Trainings. Grundlage für ClubCorner Integration."
      contentClassName="space-y-8"
    >
      <EventImportUploader />
      <EventImportRunsTable />
    </PlanningActivitiesPageFrame>
  );
}
