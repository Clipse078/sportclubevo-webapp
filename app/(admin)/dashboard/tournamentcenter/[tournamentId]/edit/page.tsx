import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getTournament } from "@/lib/tournaments/tournament-service";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { PageShell } from "@/components/ui/page";
import TournamentEditForm from "@/components/admin/tournamentcenter/TournamentEditForm";
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
import ContextualTaskCreateTriggerServer from "@/components/admin/aufgaben/contextual/ContextualTaskCreateTriggerServer";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import PlanningEditorCollaborationSection from "@/components/admin/shared/planning-editor/PlanningEditorCollaborationSection";
import PlanningEditorParticipantsSection from "@/components/admin/shared/planning-editor/PlanningEditorParticipantsSection";
import PlanningParticipantsList from "@/components/admin/shared/planning-editor/PlanningParticipantsList";
import { loadTournamentPlanningParticipants } from "@/lib/planning/load-tournament-planning-participants";

type Props = { params: Promise<{ tournamentId: string }> };

export default async function TournamentEditPage({ params }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.TOURNAMENTS_DELETE,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const canManage = hasPermission(session, PERMISSIONS.EVENTS_MANAGE);
  const canDelete = hasPermission(session, PERMISSIONS.TOURNAMENTS_DELETE);
  const canManageFacilitiesTimeStandards = hasPermission(session, PERMISSIONS.FACILITIES_MANAGE);

  const { tournamentId } = await params;

  let tournament;
  try {
    tournament = await getTournament(tenantContext.id, tournamentId);
  } catch (err) {
    if (err instanceof TournamentNotFoundError) notFound();
    throw err;
  }

  const [facilities, operationalDurationPolicy] = await Promise.all([
    getFacilitiesForTenant(tenantContext.id),
    getTenantOperationalDurationPolicy(tenantContext.id),
  ]);

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

  const locale = tenantContext.locale ?? "de-CH";
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";
  const participantPresentation = await loadTournamentPlanningParticipants(tenantContext.id, tournament);

  const participantsSection = (
    <PlanningEditorParticipantsSection
      headingId="turniere-edit-participants-heading"
      testId="turniere-edit-participants-section"
      persisted
    >
      <PlanningParticipantsList
        people={participantPresentation.people}
        teams={participantPresentation.teams}
      />
    </PlanningEditorParticipantsSection>
  );

  const collaborationSection = (
    <PlanningEditorCollaborationSection
      headingId="turniere-edit-collaboration-heading"
      testId="turniere-edit-collaboration-section"
      persisted
      tenantSlug={tenantContext.key}
      targetType="TOURNAMENT"
      targetId={tournament.id}
      canEdit={canManage}
      currentUserId={session.user?.id ?? null}
      locale={locale}
      timezone={timeZone}
    />
  );

  return (
    <PageShell fullWidth>
      <ToastProvider>
        <TournamentEditForm
          tournament={tournament}
          canManage={canManage}
          canDelete={canDelete}
          pitchHallFacilityGroups={pitchHallFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          timezone={tenantContext.timezone ?? "Europe/Zurich"}
          tenantLogoUrl={tenantContext.logoUrl}
          defaultTournamentDurationMinutes={operationalDurationPolicy.TOURNAMENT.durationMinutes}
          canManageFacilitiesTimeStandards={canManageFacilitiesTimeStandards}
          createTaskAction={
            <ContextualTaskCreateTriggerServer
              contextType="TOURNAMENT"
              contextId={tournament.id}
              variant="menuItem"
              locale={locale}
              timeZone={timeZone}
            />
          }
          relatedTasksPanel={
            <ContextRelatedTasksPanel
              contextType="TOURNAMENT"
              contextId={tournament.id}
              locale={locale}
              timeZone={timeZone}
            />
          }
          participantsSection={participantsSection}
          collaborationSection={collaborationSection}
        />
      </ToastProvider>
    </PageShell>
  );
}
