"use client";

import { useMemo, useState } from "react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import {
  SceChipMultiSelectorField,
  type SceChipSelection,
} from "@/components/sce/list-selector/SceChipMultiSelectorField";
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";

type Props = {
  label: string;
  fieldName: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  addButtonLabel?: string;
  testIdPrefix?: string;
  initialKnown?: TaskAssigneeOption[];
  lockedUserIds?: string[];
  hideLabel?: boolean;
  omitHiddenField?: boolean;
  allowAdd?: boolean;
  form?: string;
};

function formatName(firstName: string, lastName: string, displayName?: string): string {
  return displayName?.trim() || `${firstName} ${lastName}`.trim();
}

export default function TaskPeopleMultiPicker({
  label,
  fieldName,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
  addButtonLabel = "Person hinzufügen",
  testIdPrefix = "task-people-picker",
  initialKnown = [],
  lockedUserIds = [],
  hideLabel = false,
  omitHiddenField = false,
  allowAdd = true,
  form,
}: Props) {
  const [addedKnown, setAddedKnown] = useState<Record<string, TaskAssigneeOption>>({});

  const effectiveKnown = useMemo(() => {
    const map: Record<string, TaskAssigneeOption> = {};
    for (const person of initialKnown) {
      map[person.userId] = person;
    }
    return { ...map, ...addedKnown };
  }, [initialKnown, addedKnown]);

  const selectedChips: SceChipSelection[] = selectedIds
    .map((id) => {
      const person = effectiveKnown[id];
      if (!person) return { id, label: id };
      return {
        id,
        label: formatName(person.firstName, person.lastName, person.displayName),
        description: person.email,
      };
    });

  return (
    <SceChipMultiSelectorField
      label={label}
      hideLabel={hideLabel}
      fieldName={fieldName}
      form={form}
      omitHiddenField={omitHiddenField}
      selected={selectedChips}
      selectedIds={selectedIds}
      onSelectedIdsChange={onSelectedIdsChange}
      onSelectionKnown={(entries) => {
        const next: Record<string, TaskAssigneeOption> = {};
        for (const entry of entries) {
          next[entry.id] = {
            userId: entry.id,
            firstName: entry.label.split(" ")[0] ?? entry.label,
            lastName: entry.label.split(" ").slice(1).join(" "),
            email: entry.description ?? "",
            displayName: entry.label,
          };
        }
        setAddedKnown((prev) => ({ ...prev, ...next }));
      }}
      authContext="TASK_ASSIGNMENT"
      sourceTypes={["USER"]}
      mapPickToId={(pick: SceSelectorPick) => (pick.type === "USER" ? pick.id : null)}
      mapPickToChip={(pick) => ({
        id: pick.id,
        label: pick.label,
        description: pick.description,
      })}
      disabled={disabled}
      addButtonLabel={addButtonLabel}
      dialogTitle="Person zuweisen"
      dialogDescription="Wähle eine oder mehrere Personen mit Benutzerkonto."
      testIdPrefix={testIdPrefix}
      lockedIds={lockedUserIds}
      allowAdd={allowAdd}
    />
  );
}
