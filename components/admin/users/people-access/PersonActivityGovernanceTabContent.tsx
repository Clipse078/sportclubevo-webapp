import PersonClubEventGovernanceSection from "./PersonClubEventGovernanceSection";
import PersonMatchGovernanceSection from "./PersonMatchGovernanceSection";
import PersonTournamentGovernanceSection from "./PersonTournamentGovernanceSection";
import PersonTrainingGovernanceSection from "./PersonTrainingGovernanceSection";

type Props = {
  personId: string;
  canManage: boolean;
};

export default function PersonActivityGovernanceTabContent({ personId, canManage }: Props) {
  return (
    <div className="space-y-6" data-testid="person-activity-governance-tab">
      <PersonClubEventGovernanceSection personId={personId} canManage={canManage} />
      <PersonTrainingGovernanceSection personId={personId} canManage={canManage} />
      <PersonMatchGovernanceSection personId={personId} canManage={canManage} />
      <PersonTournamentGovernanceSection personId={personId} canManage={canManage} />
    </div>
  );
}
