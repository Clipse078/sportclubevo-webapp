"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { SceListSelectorPanel } from "@/components/sce/list-selector/SceListSelectorPanel";
import { sceGenericDiscoverFetch } from "@/lib/sce/list-selector/sce-generic-discover-client";
import type { SceSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";
import type { SceSelectorPick, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import { sceSelectorPickKey } from "@/lib/sce/list-selector/types";

export type SceChipSelection = {
  id: string;
  label: string;
  description?: string | null;
};

type Props = {
  label?: string;
  fieldName?: string;
  form?: string;
  omitHiddenField?: boolean;
  hideLabel?: boolean;
  selected: SceChipSelection[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onSelectionKnown?: (entries: SceChipSelection[], picks?: SceSelectorPick[]) => void;
  authContext: SceSelectorAuthorizationContext;
  sourceTypes: readonly SceSelectorSourceType[];
  mapPickToId: (pick: SceSelectorPick) => string | null;
  mapPickToChip: (pick: SceSelectorPick) => SceChipSelection;
  disabled?: boolean;
  addButtonLabel?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  testIdPrefix?: string;
  lockedIds?: readonly string[];
  allowAdd?: boolean;
  excludeUserIds?: readonly string[];
  /** When ids in selectedIds differ from selector pick ids (e.g. task assignee userId vs personId). */
  committedPickKeys?: ReadonlySet<string>;
  searchPlaceholder?: string;
};

export function SceChipMultiSelectorField({
  label,
  fieldName,
  form,
  omitHiddenField = false,
  hideLabel = false,
  selected,
  selectedIds,
  onSelectedIdsChange,
  onSelectionKnown,
  authContext,
  sourceTypes,
  mapPickToId,
  mapPickToChip,
  disabled = false,
  addButtonLabel = "Hinzufügen",
  dialogTitle = "Auswahl",
  dialogDescription,
  testIdPrefix = "sce-chip-multi-selector",
  lockedIds = [],
  allowAdd = true,
  excludeUserIds,
  committedPickKeys,
  searchPlaceholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);

  const fetchResults = useMemo(
    () =>
      sceGenericDiscoverFetch({
        authContext,
        sourceTypes,
        // Already-selected ids are suppressed in the panel via committedPickKeys only.
        // Do not pass persistence ids (e.g. assignee userIds) as excludeUserIds — that
        // wrongly hides eligible Persons server-side (TASK_ASSIGNMENT / Person.id vs User.id).
        excludeUserIds: excludeUserIds ?? [],
      }),
    [authContext, excludeUserIds, sourceTypes],
  );

  const committedKeys = useMemo(() => {
    if (committedPickKeys) return committedPickKeys;
    const type = sourceTypes[0] ?? "PERSON";
    return new Set(selectedIds.map((id) => sceSelectorPickKey(type, id)));
  }, [committedPickKeys, selectedIds, sourceTypes]);

  function removeId(id: string) {
    onSelectedIdsChange(selectedIds.filter((x) => x !== id));
  }

  function handleConfirm(picks: SceSelectorPick[]) {
    const nextKnown: SceChipSelection[] = [];
    const appliedPicks: SceSelectorPick[] = [];
    const nextIds = [...selectedIds];
    for (const pick of picks) {
      const id = mapPickToId(pick);
      if (!id || nextIds.includes(id)) continue;
      nextIds.push(id);
      nextKnown.push(mapPickToChip(pick));
      appliedPicks.push(pick);
    }
    if (nextKnown.length > 0) {
      onSelectionKnown?.(nextKnown, appliedPicks);
    }
    onSelectedIdsChange(nextIds);
    setOpen(false);
  }

  return (
    <div className="space-y-1" data-testid={testIdPrefix}>
      {hideLabel || !label ? null : (
        <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
      )}
      {omitHiddenField || !fieldName ? null : (
        <input type="hidden" name={fieldName} form={form} value={selectedIds.join(",")} readOnly />
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((entry) => (
          <span
            key={entry.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 pl-2 pr-1 py-0.5 text-xs text-[var(--text-2)]"
            data-testid={`${testIdPrefix}-chip-${entry.id}`}
          >
            <span className="truncate">{entry.label}</span>
            {locked.has(entry.id) || disabled ? null : (
              <button
                type="button"
                className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                aria-label={`${entry.label} entfernen`}
                onClick={() => removeId(entry.id)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {allowAdd && !disabled ? (
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
            onClick={() => setOpen(true)}
            data-testid={`${testIdPrefix}-add`}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {addButtonLabel}
          </button>
        ) : null}
      </div>

      <SceListSelectorPanel
        open={open}
        onOpenChange={setOpen}
        title={dialogTitle}
        description={dialogDescription}
        enabledTypes={sourceTypes}
        mode="multiple"
        committedKeys={committedKeys}
        fetchResults={fetchResults}
        onConfirm={handleConfirm}
        disabled={disabled}
        testIdPrefix={testIdPrefix}
        searchPlaceholder={searchPlaceholder ?? "Name oder E-Mail suchen …"}
      />
    </div>
  );
}

export { sceSelectorPickKey };
