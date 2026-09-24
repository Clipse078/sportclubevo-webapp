import Link from "next/link";
import { EventType } from "@prisma/client";
import { getTournament } from "@/lib/tournaments/tournament-service";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import PlanningEditorWorkSection from "@/components/admin/shared/planning-editor/PlanningEditorWorkSection";
import PlanningEditorCollaborationSection from "@/components/admin/shared/planning-editor/PlanningEditorCollaborationSection";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
import ContextRelatedRequirementsPanel from "@/components/admin/aufgaben/contextual/ContextRelatedRequirementsPanel";
import { loadTournamentPlanningParticipants } from "@/lib/planning/load-tournament-planning-participants";
import PlanningEditorParticipantsSection from "@/components/admin/shared/planning-editor/PlanningEditorParticipantsSection";
import PlanningParticipantsList from "@/components/admin/shared/planning-editor/PlanningParticipantsList";

type Props = {
  tenantId: string;
  tenantSlug: string;
  eventId: string;
  canManage: boolean;
  currentUserId: string | null;
  locale: string;
  timeZone: string;
};

/**
 * Saisonplaner tournament edit uses the same canonical Event/Tournament id as Turniercenter.
 * Full resource editing remains in Turniercenter; operational sections reuse tournament contracts.
 */
export default async function PlannerTournamentOperationalSections({
  tenantId,
  tenantSlug,
  eventId,
  canManage,
  currentUserId,
  locale,
  timeZone,
}: Props) {
  let tournament;
  try {
    tournament = await getTournament(tenantId, eventId);
  } catch (err) {
    if (err instanceof TournamentNotFoundError) return null;
    throw err;
  }

  const participantPresentation = await loadTournamentPlanningParticipants(tenantId, tournament);

  return (
    <div className="space-y-6" data-testid="planner-tournament-operational-sections">
      <PlanningEditorSection
        testId="planner-tournament-resources-bridge"
        ariaLabelledBy="planner-tournament-resources-heading"
      >
        <PlanningEditorSectionHeading
          id="planner-tournament-resources-heading"
          title="Ressourcen"
          description="Plätze, Hallen und Garderoben im Turniercenter verwalten."
        />
        <Link
          href={`/dashboard/tournamentcenter/${eventId}/edit`}
          className="inline-flex text-sm font-semibold text-[var(--sce-primary)] hover:underline"
          data-testid="planner-tournament-open-turniercenter"
        >
          Im Turniercenter bearbeiten
        </Link>
      </PlanningEditorSection>

      {tournament.status !== "CANCELLED" ? (
        <PlanningEditorSection
          testId="planner-tournament-participation-section"
          ariaLabelledBy="planner-tournament-participation-heading"
        >
          <PlanningEditorSectionHeading
            id="planner-tournament-participation-heading"
            title="Teilnahme"
            description="Fristen und Erinnerungen für die Teilnahmeabfrage."
          />
          <ParticipationRequestConfigEditor
            apiPath={`/api/tournaments/${eventId}/participation-request`}
            timeZone={timeZone}
            disabled={!canManage}
            layout="sessionEdit"
            values={{
              participationResponseDueAt: tournament.participationResponseDueAt,
              participationReminder1At: tournament.participationReminder1At,
              participationReminder2At: tournament.participationReminder2At,
              participationReminder1PresetKey: tournament.participationReminder1PresetKey,
              participationReminder2PresetKey: tournament.participationReminder2PresetKey,
            }}
          />
        </PlanningEditorSection>
      ) : null}

      <PlanningEditorParticipantsSection
        headingId="planner-tournament-participants-heading"
        testId="planner-tournament-participants-section"
        persisted
      >
        <PlanningParticipantsList
          people={participantPresentation.people}
          teams={participantPresentation.teams}
        />
      </PlanningEditorParticipantsSection>

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
