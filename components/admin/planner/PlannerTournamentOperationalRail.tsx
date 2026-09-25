import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { getTournament } from "@/lib/tournaments/tournament-service";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";

type Props = {
  tenantId: string;
  eventId: string;
  canManage: boolean;
  timeZone: string;
};

export default async function PlannerTournamentOperationalRail({
  tenantId,
  eventId,
  canManage,
  timeZone,
}: Props) {
  let tournament;
  try {
    tournament = await getTournament(tenantId, eventId);
  } catch (err) {
    if (err instanceof TournamentNotFoundError) return null;
    throw err;
  }

  if (tournament.status === "CANCELLED") return null;

  return (
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
  );
}
