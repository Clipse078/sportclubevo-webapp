"use client";

import { useMemo, useState } from "react";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import {
  SceInlineOrgUnitMultiPicker,
  type SceInlineOrgUnitChip,
} from "@/components/sce/list-selector/SceInlineOrgUnitMultiPicker";

type Props = {
  fieldName: string;
  options: TaskOrgUnitPickerOption[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  form?: string;
  omitHiddenField?: boolean;
};

export default function TaskOrgUnitMultiPicker({
  fieldName,
  options,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
  form,
  omitHiddenField = false,
}: Props) {
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const [addedKnown, setAddedKnown] = useState<Record<string, SceInlineOrgUnitChip>>({});

  const knownById = useMemo(() => {
    const map = new Map<string, SceInlineOrgUnitChip>();
    for (const option of options) {
      map.set(option.id, {
        id: option.id,
        label: option.label,
        level: option.level,
        description: option.level > 0 ? `Ebene ${option.level + 1}` : "Organisationseinheit",
      });
    }
    for (const [id, chip] of Object.entries(addedKnown)) {
      map.set(id, chip);
    }
    return map;
  }, [addedKnown, options]);

  return (
    <SceInlineOrgUnitMultiPicker
      hideLabel
      fieldName={fieldName}
      form={form}
      omitHiddenField={omitHiddenField}
      selectedIds={selectedIds}
      onSelectedIdsChange={onSelectedIdsChange}
      onSelectionKnown={(entries) => {
        const next: Record<string, SceInlineOrgUnitChip> = {};
        for (const entry of entries) {
          next[entry.id] = entry;
        }
        setAddedKnown((prev) => ({ ...prev, ...next }));
      }}
      knownById={knownById}
      disabled={disabled}
      allowAdd
      authContext="TASK_ASSIGNMENT"
      placeholder="Organisationseinheit suchen …"
      testIdPrefix="task-org-unit-multi-picker"
    />
  );
}