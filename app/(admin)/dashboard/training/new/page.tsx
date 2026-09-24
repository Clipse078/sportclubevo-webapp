import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { findTeamSeasonsForTenant } from "@/lib/training/queries";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import TrainingSeriesCreateForm from "@/components/admin/training/TrainingSeriesCreateForm";
import TrainingRecordWorkspaceShell from "@/components/admin/training/record/TrainingRecordWorkspaceShell";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { prisma } from "@/lib/db/prisma";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import type { BreadcrumbItem } from "@/components/ui/page";

export default async function NewTrainingSeriesPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.TRAININGS_VIEW,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const userId = session.user?.effectiveUserId ?? session.user?.id;
  if (!userId) notFound();

  const canValidateDirectly = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const canManageFacilities = hasPermission(session, PERMISSIONS.FACILITIES_MANAGE);
  const canEditTeamPublication = hasPermission(session, PERMISSIONS.TEAMS_MANAGE);

  const policy = createPlanningAuthorizationPolicy(prisma);

  const [teamSeasons, facilities, writableTeamIds, operationalDurationPolicy] = await Promise.all([
    findTeamSeasonsForTenant(tenantId),
    getFacilitiesForTenant(tenantId),
    policy.getWritableTeamIds({ userId, tenantId }, "training"),
    getTenantOperationalDurationPolicy(tenantId),
  ]);

  const defaultTrainingDurationMinutes = operationalDurationPolicy.TRAINING.durationMinutes;

  const writableTeamIdSet = new Set(writableTeamIds);
  const filteredTeamSeasons =
    writableTeamIds.length > 0 ? teamSeasons.filter((ts) => writableTeamIdSet.has(ts.teamId)) : [];

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

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Planung", href: "/dashboard/planner" },
    { label: "Trainings", href: "/dashboard/training" },
    { label: "Training erstellen" },
  ];

  const header = (
    <div className="space-y-1 pt-1">
      <p className="text-xs font-medium text-[var(--text-2)]">Neue Trainingsserie</p>
      <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
        Training erstellen
      </h1>
      <p className="text-sm text-[var(--text-2)]">Team, Termin und Ressourcen für die neue Serie erfassen.</p>
    </div>
  );

  return (
    <TrainingRecordWorkspaceShell
      breadcrumbs={breadcrumbs}
      header={header}
      testId="training-create-page"
    >
      <TrainingSeriesCreateForm
        teamSeasons={filteredTeamSeasons.map((ts) => ({
          id: ts.id,
          teamId: ts.teamId,
          teamName: ts.teamName,
          seasonName: ts.seasonName,
          category: ts.category,
          genderGroup: ts.genderGroup,
        }))}
        pitchHallFacilityGroups={pitchHallFacilityGroups}
        dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        canValidateDirectly={canValidateDirectly}
        defaultTrainingDurationMinutes={defaultTrainingDurationMinutes}
        canManageFacilities={canManageFacilities}
        canEditTeamPublication={canEditTeamPublication}
      />
    </TrainingRecordWorkspaceShell>
  );
}
