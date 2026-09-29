"use client";

import { useMemo, useState } from "react";
import type { RequirementPersonOption } from "@/lib/requirements/person-search";
import {
  SceChipMultiSelectorField,
  type SceChipSelection,
} from "@/components/sce/list-selector/SceChipMultiSelectorField";
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";

type Props = {
  label?: string;
  fieldName?: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  initialKnown?: RequirementPersonOption[];
  testIdPrefix?: string;
};

export default function RequirementPersonMultiPicker({
  label = "Personen",
  fieldName = "audiencePersonIds",
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
  initialKnown = [],
  testIdPrefix = "requirement-person-picker",
}: Props) {
  const [addedKnown, setAddedKnown] = useState<Record<string, RequirementPersonOption>>({});

  const knownById = useMemo(() => {
    const map = new Map<string, RequirementPersonOption>();
    for (const option of initialKnown) map.set(option.personId, option);
    for (const option of Object.values(addedKnown)) map.set(option.personId, option);
    return map;
  }, [initialKnown, addedKnown]);

  const selectedChips: SceChipSelection[] = selectedIds.map((id) => {
    const known = knownById.get(id);
    return known
      ? { id, label: known.displayName, description: known.email }
      : { id, label: id };
  });

  return (
    <div className="space-y-2" data-testid={testIdPrefix}>
      <SceChipMultiSelectorField
        label={label}
        fieldName={fieldName}
        selected={selectedChips}
        selectedIds={selectedIds}
        onSelectedIdsChange={onSelectedIdsChange}
        onSelectionKnown={(entries) => {
          const next: Record<string, RequirementPersonOption> = {};
          for (const entry of entries) {
            next[entry.id] = {
              personId: entry.id,
              firstName: entry.label.split(" ")[0] ?? entry.label,
              lastName: entry.label.split(" ").slice(1).join(" "),
              displayName: entry.label,
              email: entry.description ?? null,
            };
          }
          setAddedKnown((prev) => ({ ...prev, ...next }));
        }}
        authContext="REQUIREMENT_AUDIENCE"
        sourceTypes={["PERSON"]}
        mapPickToId={(pick: SceSelectorPick) => (pick.type === "PERSON" ? pick.id : null)}
        mapPickToChip={(pick) => ({
          id: pick.id,
          label: pick.label,
          description: pick.description,
        })}
        disabled={disabled}
        addButtonLabel="Person hinzufügen"
        dialogTitle="Empfänger auswählen"
        dialogDescription="Personen für diese Anforderung."
        testIdPrefix={testIdPrefix}
      />
      <span className="sr-only" data-testid={`${testIdPrefix}-count`}>
        {selectedIds.length === 1 ? "1 Person ausgewählt" : `${selectedIds.length} Personen ausgewählt`}
      </span>
    </div>
  );
}
