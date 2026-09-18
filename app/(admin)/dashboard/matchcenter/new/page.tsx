import Link from "next/link";
import MatchCreateForm from "@/components/admin/matchcenter/MatchCreateForm";
import SpieleRecordWorkspaceShell from "@/components/admin/matchcenter/record/SpieleRecordWorkspaceShell";
import { SPIELE_RECORD_WORKSPACE_SURFACE_CLASS } from "@/components/admin/matchcenter/record/spiele-record-layout";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { notFound } from "next/navigation";

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
    <div className="space-y-2 pt-1">
      <p className="text-xs text-[var(--text-2)]">Spiel erstellen</p>
      <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
        Neues Spiel
      </h1>
      <p className="max-w-2xl text-sm text-[var(--text-2)]">
        Heim/Auswärts, Gegner, Termin und — bei Heimspielen — Ressourcen in einem geführten Ablauf.
      </p>
      <Link
        href="/dashboard/matchcenter"
        className="fca-button-secondary inline-flex w-fit text-xs"
      >
        Abbrechen
      </Link>
    </div>
  );

  return (
    <SpieleRecordWorkspaceShell
      breadcrumbs={[
        { label: "Spiele", href: "/dashboard/matchcenter" },
        { label: "Neues Spiel" },
      ]}
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
