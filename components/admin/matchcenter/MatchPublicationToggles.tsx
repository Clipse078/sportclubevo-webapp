"use client";

import PlanningEditorPublicationControls from "@/components/admin/shared/planning-editor/PlanningEditorPublicationControls";
import {
  MATCH_PUBLICATION_CHANNELS,
  type PlanningPublicationChannelKey,
  type PlanningPublicationValues,
} from "@/lib/planning/planning-publication-channels";

type Props = {
  value: PlanningPublicationValues;
  onChange: (patch: Partial<PlanningPublicationValues>) => void;
  disabled?: boolean;
  disabledChannelKeys?: PlanningPublicationChannelKey[];
  testIdPrefix?: string;
  showHeading?: boolean;
};

export default function MatchPublicationToggles({
  value,
  onChange,
  disabled = false,
  disabledChannelKeys = [],
  testIdPrefix = "match-publication",
  showHeading = false,
}: Props) {
  const disabledSet = new Set(disabledChannelKeys);

  return (
    <PlanningEditorPublicationControls
      channels={MATCH_PUBLICATION_CHANNELS}
      value={value}
      onChange={(patch) => {
        if (disabledSet.has("infoboardVisible") && patch.infoboardVisible !== undefined) {
          return;
        }
        onChange(patch);
      }}
      disabled={disabled}
      testIdPrefix={testIdPrefix}
      showHeading={showHeading}
      disabledChannelKeys={disabledChannelKeys}
    />
  );
}
