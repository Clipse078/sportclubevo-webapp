"use client";

import { useMemo, useState } from "react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import {
  SceInlineTaskAssigneeMultiPicker,
  type SceInlineTaskAssigneeChip,
} from "@/components/sce/list-selector/SceInlineTaskAssigneeMultiPicker";

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
  testIdPrefix = "task-people-picker",
  initialKnown = [],
  lockedUserIds = [],
  hideLabel = false,
  omitHiddenField = false,
  allowAdd = true,
  form,
  addButtonLabel: _addButtonLabel,
}: Props) {
  void _addButtonLabel;
  const [addedKnown, setAddedKnown] = useState<Record<string, TaskAssigneeOption>>({});

  const effectiveKnown = useMemo(() => {
    const map: Record<string, TaskAssigneeOption> = {};
    for (const person of initialKnown) {
      map[person.userId] = person;
    }
    return { ...map, ...addedKnown };
  }, [initialKnown, addedKnown]);

  const knownByUserId = useMemo(() => {
    const map = new Map<string, SceInlineTaskAssigneeChip>();
    for (const option of Object.values(effectiveKnown)) {
      map.set(option.userId, {
        userId: option.userId,
        label: formatName(option.firstName, option.lastName, option.displayName),
        description: option.email,
      });
    }
    return map;
  }, [effectiveKnown]);

  return (
    <SceInlineTaskAssigneeMultiPicker
      label={label}
      hideLabel={hideLabel}
      fieldName={fieldName}
      form={form}
      omitHiddenField={omitHiddenField}
      selectedUserIds={selectedIds}
      onSelectedUserIdsChange={onSelectedIdsChange}
      onSelectionKnown={(entries) => {
        const next: Record<string, TaskAssigneeOption> = {};
        for (const entry of entries) {
          const parts = entry.label.split(/\s+/).filter(Boolean);
          next[entry.userId] = {
            personId: entry.personId,
            userId: entry.userId,
            firstName: parts[0] ?? entry.label,
            lastName: parts.slice(1).join(" "),
            email: entry.description ?? "",
            displayName: entry.label,
          };
        }
        setAddedKnown((prev) => ({ ...prev, ...next }));
      }}
      knownByUserId={knownByUserId}
      disabled={disabled}
      lockedUserIds={lockedUserIds}
      allowAdd={allowAdd}
      testIdPrefix={testIdPrefix}
      placeholder="Personen suchen …"
    />
  );
}
