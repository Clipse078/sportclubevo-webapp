import MatchCreateForm from "@/components/admin/matchcenter/MatchCreateForm";
import SpieleRecordWorkspaceShell from "@/components/admin/matchcenter/record/SpieleRecordWorkspaceShell";
import { SPIELE_RECORD_WORKSPACE_SURFACE_CLASS } from "@/components/admin/matchcenter/record/spiele-record-layout";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function NewMatchCenterPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.EVENTS_VIEW,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const canValidateDirectly =
    hasPermission(session, PERMISSIONS.EVENTS_PUBLISH_WEBSITE) ||
    hasPermission(session, PERMISSIONS.EVENTS_PUBLISH_INFOBOARD);

  const facilities = await getFacilitiesForTenant(tenantId);
  const t = await getTranslations("PlanningEditor.match.create");

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

  const header = (
    <div className="space-y-1 pt-1" data-testid="spiele-match-create-header">
      <p className="text-xs text-[var(--text-2)]">{t("eyebrow")}</p>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{t("title")}</h1>
      <p className="max-w-2xl text-sm text-[var(--text-2)]">{t("description")}</p>
    </div>
  );

  return (
    <SpieleRecordWorkspaceShell
      breadcrumbs={[
        { label: t("backNav"), href: "/dashboard/matchcenter" },
        { label: t("title") },
      ]}
      backLabel={t("backNav")}
      header={header}
      testId="spiele-match-create-workspace"
    >
      <div className={SPIELE_RECORD_WORKSPACE_SURFACE_CLASS}>
        <MatchCreateForm
          pitchHallFacilityGroups={pitchHallFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          canValidateDirectly={canValidateDirectly}
        />
      </div>
    </SpieleRecordWorkspaceShell>
  );
}
