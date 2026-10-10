"use client";

import { useCallback, useMemo, useState } from "react";
import type { PersonPickerResult } from "@/components/shared/PeoplePicker";
import TeamTrainerManagementCard from "@/components/admin/teams/TeamTrainerManagementCard";
import TeamTrainerAssignmentOnlyPanel from "@/components/admin/teams/roster/TeamTrainerAssignmentOnlyPanel";
import type { TrainerAssignmentOnlySuggestion } from "@/lib/teams/roster-onboarding-queries";
import { getCanonicalSeasonLabel } from "@/lib/teams/jahrgang-rules";

type TrainerMember = {
  id: string;
  status: string;
  roleLabel: string | null;
  isWebsiteVisible: boolean;
  sortOrder: number;
  remarks: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
};

type Props = {
  teamId: string;
  canManage: boolean;
  canManagePeople: boolean;
  teamSeason: {
    id: string;
    displayName: string;
    status: string;
    trainerTeamWebsiteVisible: boolean;
    season: {
      id: string;
      key: string;
      name: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    };
    trainerTeamMembers: TrainerMember[];
  };
  assignmentOnlySuggestions: TrainerAssignmentOnlySuggestion[];
};

export default function TeamTrainerRosterSection({
  teamId,
  canManage,
  canManagePeople,
  teamSeason,
  assignmentOnlySuggestions,
}: Props) {
  const [initialAddPerson, setInitialAddPerson] = useState<PersonPickerResult | null>(null);
  const [addingPersonId, setAddingPersonId] = useState<string | null>(null);

  const seasonLabel = useMemo(
    () => getCanonicalSeasonLabel(teamSeason.season.startDate) ?? teamSeason.season.name,
    [teamSeason.season.startDate, teamSeason.season.name],
  );

  const clearInitial = useCallback(() => setInitialAddPerson(null), []);

  function handleAssignmentOnlyAdd(person: TrainerAssignmentOnlySuggestion["person"]) {
    setAddingPersonId(person.id);
    setInitialAddPerson({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      displayName: person.displayName,
      email: person.email,
      phone: person.phone,
      isTrainer: person.isTrainer,
    });
    setAddingPersonId(null);
  }

  return (
    <div className="space-y-4">
      <TeamTrainerAssignmentOnlyPanel
        suggestions={assignmentOnlySuggestions}
        seasonLabel={seasonLabel}
        canManage={canManage}
        addingPersonId={addingPersonId}
        onAdd={handleAssignmentOnlyAdd}
      />
      <TeamTrainerManagementCard
        teamId={teamId}
        canManage={canManage}
        canManagePeople={canManagePeople}
        sectionId="trainerteam"
        teamSeason={teamSeason}
        initialAddPerson={initialAddPerson}
        onInitialAddPersonConsumed={clearInitial}
      />
    </div>
  );
}
