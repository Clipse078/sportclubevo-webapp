"use client";

import { useMemo, useState } from "react";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import {
  SceChipMultiSelectorField,
  type SceChipSelection,
} from "@/components/sce/list-selector/SceChipMultiSelectorField";
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";

type Props = {
  fieldName: string;
  options: TaskOrgUnitPickerOption[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
};

function formatLabel(option: TaskOrgUnitPickerOption): string {
  const indent = option.level > 0 ? `${" ".repeat(option.level * 2)}↳ ` : "";
  return `${indent}${option.label}`;
}

export default function TaskOrgUnitMultiPicker({
  fieldName,
  options,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
}: Props) {
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const [addedLabels, setAddedLabels] = useState<Record<string, string>>({});

  const selectedChips: SceChipSelection[] = selectedIds.map((id) => {
    const option = byId.get(id);
    if (option) return { id, label: formatLabel(option) };
    const fallback = addedLabels[id];
    return { id, label: fallback ?? id };
  });

  return (
    <SceChipMultiSelectorField
      fieldName={fieldName}
      selected={selectedChips}
      selectedIds={selectedIds}
      onSelectedIdsChange={onSelectedIdsChange}
      onSelectionKnown={(entries) => {
        const next: Record<string, string> = {};
        for (const entry of entries) {
          next[entry.id] = entry.label;
        }
        setAddedLabels((prev) => ({ ...prev, ...next }));
      }}
      authContext="TASK_ASSIGNMENT"
      sourceTypes={["ORG_UNIT"]}
      mapPickToId={(pick: SceSelectorPick) => (pick.type === "ORG_UNIT" ? pick.id : null)}
      mapPickToChip={(pick) => ({
        id: pick.id,
        label: pick.metadata?.level
          ? `${" ".repeat(Number(pick.metadata.level) * 2)}↳ ${pick.label}`
          : pick.label,
      })}
      disabled={disabled}
      addButtonLabel="Organisationseinheit hinzufügen"
      dialogTitle="Organisationseinheit wählen"
      testIdPrefix="task-org-unit-multi-picker"
    />
  );
}
