"use client";

import { useMemo, useState } from "react";
import type { EventType } from "@prisma/client";
import PlannerEntryPublicationFields from "@/components/admin/planner/PlannerEntryPublicationFields";
import {
  getPlannerPublicationRowsForType,
  hiddenPublicationFieldKeys,
  type PlannerPublicationFieldKey,
  type PlannerPublicationValues,
} from "@/lib/planner/planner-entry-publication-config";

type Props = {
  eventType: EventType;
  defaults?: Partial<PlannerPublicationValues>;
};

function buildInitialValues(
  type: EventType,
  defaults?: Partial<PlannerPublicationValues>,
): PlannerPublicationValues {
  const base: PlannerPublicationValues = {
    websiteVisible: defaults?.websiteVisible ?? true,
    wochenplanVisible: defaults?.wochenplanVisible ?? true,
    infoboardVisible: defaults?.infoboardVisible ?? false,
    homepageVisible: defaults?.homepageVisible ?? false,
    trainingsplanVisible: defaults?.trainingsplanVisible ?? false,
    teamPageVisible: defaults?.teamPageVisible ?? false,
  };
  for (const key of hiddenPublicationFieldKeys(type)) {
    base[key] = false;
  }
  return base;
}

export default function PlannerEntryCreatePublicationFields({ eventType, defaults }: Props) {
  const [values, setValues] = useState<PlannerPublicationValues>(() =>
    buildInitialValues(eventType, defaults),
  );

  const rows = useMemo(() => getPlannerPublicationRowsForType(eventType), [eventType]);

  return (
    <>
      <PlannerEntryPublicationFields
        rows={rows}
        values={values}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
        formFieldPrefix=""
      />
      {hiddenPublicationFieldKeys(eventType).map((key: PlannerPublicationFieldKey) => (
        <input key={key} type="hidden" name={key} value="off" />
      ))}
    </>
  );
}
