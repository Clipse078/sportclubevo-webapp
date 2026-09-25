import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { ToastProvider } from "@/components/ui/ToastProvider";
import PlanningEditorShell from "@/components/admin/shared/planning-editor/PlanningEditorShell";
import PlanningEditorHeader from "@/components/admin/shared/planning-editor/PlanningEditorHeader";
import VeranstaltungCreateForm from "@/components/admin/veranstaltungen/VeranstaltungCreateForm";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function NewVeranstaltungPage() {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);
  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const facilities = await getFacilitiesForTenant(tenantContext.id);

  function facilityGroupsForTypes(types: readonly string[]): FacilityGroup[] {
    return facilities
      .filter((f) => f.status !== "ARCHIVED")
      .map((f) => ({
        facilityId: f.id,
        facilityName: f.name,
        facilityType: f.type as string,
        resources: f.resources
          .filter((r) => r.status !== "ARCHIVED" && types.includes(r.type))
          .map((r) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            type: r.type,
            facilityId: f.id,
            facilityName: f.name,
            facilityType: f.type as string,
          })),
      }))
      .filter((fg) => fg.resources.length > 0);
  }

  const pitchHallFacilityGroups = facilityGroupsForTypes(["FULL_PITCH", "HALF_PITCH"]);
  const dressingRoomFacilityGroups = facilityGroupsForTypes(["DRESSING_ROOM"]);

  const t = await getTranslations("Veranstaltungen.editor.create");

  return (
    <ToastProvider>
      <PlanningEditorShell testId="veranstaltung-create-page">
        <PlanningEditorHeader
          backHref="/dashboard/veranstaltungen"
          backLabel={t("backNav")}
          title={t("title")}
          scheduleContext={t("description")}
          backLinkTestId="veranstaltung-create-back-link"
          testId="veranstaltung-create-header"
        />
        <p className="text-xs leading-snug text-[var(--text-2)]" data-testid="veranstaltung-create-intro">
          {t("intro")}
        </p>
        <VeranstaltungCreateForm
          pitchHallFacilityGroups={pitchHallFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          timeZone={tenantContext.timezone ?? "Europe/Zurich"}
        />
      </PlanningEditorShell>
    </ToastProvider>
  );
}
