import { EventType } from "@prisma/client";
import { getTournament } from "@/lib/tournaments/tournament-service";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import PlanningEditorWorkSection from "@/components/admin/shared/planning-editor/PlanningEditorWorkSection";
import PlanningEditorCollaborationSection from "@/components/admin/shared/planning-editor/PlanningEditorCollaborationSection";
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
import ContextRelatedRequirementsPanel from "@/components/admin/aufgaben/contextual/ContextRelatedRequirementsPanel";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import PlannerTournamentCanonicalWorkspace from "@/components/admin/planner/PlannerTournamentCanonicalWorkspace";

type Props = {
  tenantId: string;
  tenantSlug: string;
  eventId: string;
  canManage: boolean;
  currentUserId: string | null;
  locale: string;
  timeZone: string;
  tenantLogoUrl?: string | null;
};

function facilityGroupsForTypes(
  facilities: Awaited<ReturnType<typeof getFacilitiesForTenant>>,
  types: readonly string[],
): FacilityGroup[] {
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

/**
 * Saisonplaner tournament edit uses the same canonical Event/Tournament id as Turniercenter.
 * Resource and participant editors reuse TournamentCenter contracts and persistence.
 */
export default async function PlannerTournamentOperationalSections({
  tenantId,
  tenantSlug,
  eventId,
  canManage,
  currentUserId,
  locale,
  timeZone,
  tenantLogoUrl = null,
}: Props) {
  let tournament;
  try {
    tournament = await getTournament(tenantId, eventId);
  } catch (err) {
    if (err instanceof TournamentNotFoundError) return null;
    throw err;
  }

  const facilities = await getFacilitiesForTenant(tenantId);
  const pitchHallFacilityGroups = facilityGroupsForTypes(facilities, ["FULL_PITCH", "HALF_PITCH"]);
  const dressingRoomFacilityGroups = facilityGroupsForTypes(facilities, ["DRESSING_ROOM"]);

  return (
    <div className="space-y-6" data-testid="planner-tournament-operational-sections">
      <PlannerTournamentCanonicalWorkspace
        tournament={tournament}
        canManage={canManage}
        pitchHallFacilityGroups={pitchHallFacilityGroups}
        dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        tenantLogoUrl={tenantLogoUrl}
      />

      <PlanningEditorWorkSection
        headingId="planner-tournament-work-heading"
        testId="planner-tournament-work-section"
        persisted
        locale={locale}
        tasksPanel={
          <ContextRelatedTasksPanel
            contextType="TOURNAMENT"
            contextId={eventId}
            locale={locale}
            timeZone={timeZone}
          />
        }
        requirementsPanel={
          <ContextRelatedRequirementsPanel
            resourceType="TOURNAMENT"
            resourceId={eventId}
            locale={locale}
          />
        }
      />

      <PlanningEditorCollaborationSection
        headingId="planner-tournament-collaboration-heading"
        testId="planner-tournament-collaboration-section"
        persisted
        tenantSlug={tenantSlug}
        targetType="TOURNAMENT"
        targetId={eventId}
        canEdit={canManage}
        currentUserId={currentUserId}
        locale={locale}
        timezone={timeZone}
      />
    </div>
  );
}

export function isPlannerTournamentOperationalType(type: EventType): boolean {
  return type === EventType.TOURNAMENT;
}
