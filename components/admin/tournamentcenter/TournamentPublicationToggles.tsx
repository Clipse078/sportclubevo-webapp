"use client";

import PlanningEditorPublicationControls from "@/components/admin/shared/planning-editor/PlanningEditorPublicationControls";
import { TOURNAMENT_PUBLICATION_CHANNELS } from "@/lib/planning/planning-publication-channels";

export type TournamentPublicationState = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  teamPageVisible: boolean;
};

type Props = {
  value: TournamentPublicationState;
  onChange: (patch: Partial<TournamentPublicationState>) => void;
  disabled?: boolean;
  testIdPrefix?: string;
  showHeading?: boolean;
};

export default function TournamentPublicationToggles({
  value,
  onChange,
  disabled = false,
  testIdPrefix = "tournament-publication",
  showHeading = true,
}: Props) {
  return (
    <PlanningEditorPublicationControls
      channels={TOURNAMENT_PUBLICATION_CHANNELS}
      value={value}
      onChange={onChange}
      disabled={disabled}
      testIdPrefix={testIdPrefix}
      showHeading={showHeading}
    />
  );
}
