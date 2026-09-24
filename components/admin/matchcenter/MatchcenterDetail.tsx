import type { MatchcenterMatchDetail } from "@/lib/matchcenter/types";
import type { FacilityResourceOption } from "@/lib/facilities/resource-options";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PageShell } from "@/components/ui/page/PageShell";
import SpieleMatchRecordWorkspace from "@/components/admin/matchcenter/record/SpieleMatchRecordWorkspace";
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
import ContextualTaskCreateTriggerServer from "@/components/admin/aufgaben/contextual/ContextualTaskCreateTriggerServer";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";

type MatchcenterDetailProps = {
  match: MatchcenterMatchDetail;
  locale?: string;
  timezone?: string;
  canManageMappings?: boolean;
  canDelete?: boolean;
  pitchOptions?: FacilityResourceOption[];
  dressingRoomOptions?: FacilityResourceOption[];
  pitchHallFacilityGroups?: FacilityGroup[];
  dressingRoomFacilityGroups?: FacilityGroup[];
  canSubmitPlanning?: boolean;
  canValidatePlanning?: boolean;
  isProtectedSource?: boolean;
  tenantLogoUrl?: string | null;
  participantsSection?: React.ReactNode;
  collaborationSection?: React.ReactNode;
};

export default function MatchcenterDetail({
  match,
  locale = "de-CH",
  timezone = "Europe/Zurich",
  canManageMappings = false,
  canDelete = false,
  pitchOptions = [],
  dressingRoomOptions = [],
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  canSubmitPlanning = false,
  canValidatePlanning = false,
  isProtectedSource = false,
  tenantLogoUrl = null,
  participantsSection,
  collaborationSection,
}: MatchcenterDetailProps) {
  void canSubmitPlanning;

  const wochenplanerHref = buildMatchWochenplanerHref({
    startAt: match.startAt,
    teamId: match.teamId,
    timezone,
  });

  return (
    <PageShell fullWidth>
      <SpieleMatchRecordWorkspace
        match={match}
        locale={locale}
        timezone={timezone}
        canManageMappings={canManageMappings}
        canDelete={canDelete}
        pitchOptions={pitchOptions}
        dressingRoomOptions={dressingRoomOptions}
        pitchHallFacilityGroups={pitchHallFacilityGroups}
        dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        canSubmitPlanning={canSubmitPlanning}
        canValidatePlanning={canValidatePlanning}
        isProtectedSource={isProtectedSource}
        tenantLogoUrl={tenantLogoUrl}
        wochenplanerHref={wochenplanerHref}
        createTaskAction={
          <ContextualTaskCreateTriggerServer
            contextType="MATCH"
            contextId={match.id}
            variant="menuItem"
            locale={locale}
            timeZone={timezone}
          />
        }
        relatedTasksPanel={
          <ContextRelatedTasksPanel
            contextType="MATCH"
            contextId={match.id}
            locale={locale}
            timeZone={timezone}
          />
        }
        participantsSection={participantsSection}
        collaborationSection={collaborationSection}
      />
    </PageShell>
  );
}
