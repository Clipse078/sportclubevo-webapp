"use client";

import PlanningEditorPublicationControls from "@/components/admin/shared/planning-editor/PlanningEditorPublicationControls";
import { VERANSTALTUNG_PUBLICATION_CHANNELS } from "@/lib/planning/planning-publication-channels";

export type VeranstaltungAusspielungValues = {
  websiteVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
};

type VeranstaltungAusspielungFieldsProps = {
  values: VeranstaltungAusspielungValues;
  onChange: (patch: Partial<VeranstaltungAusspielungValues>) => void;
  disabled?: boolean;
  testIdPrefix?: string;
  showHeading?: boolean;
};

/**
 * Shared Ausspielung controls for Veranstaltung create/edit.
 * Infoboard is operational (automatic) — not configured here.
 */
export default function VeranstaltungAusspielungFields({
  values,
  onChange,
  disabled,
  testIdPrefix = "veranstaltung-ausspielung",
  showHeading = true,
}: VeranstaltungAusspielungFieldsProps) {
  return (
    <PlanningEditorPublicationControls
      channels={VERANSTALTUNG_PUBLICATION_CHANNELS}
      value={values}
      onChange={onChange}
      disabled={disabled}
      testIdPrefix={testIdPrefix}
      showHeading={showHeading}
    />
  );
}
