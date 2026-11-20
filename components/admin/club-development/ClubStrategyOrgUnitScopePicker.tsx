"use client";

import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import TaskOrgUnitMultiPicker from "@/components/admin/aufgaben/TaskOrgUnitMultiPicker";

const GESAMTVEREIN_LABEL = "Gesamtverein";

type Props = {
  options: TaskOrgUnitPickerOption[];
  selectedOrgUnitIds: string[];
  onSelectedOrgUnitIdsChange: (ids: string[]) => void;
  disabled?: boolean;
};

/**
 * Strategy scope picker: default club-wide (Gesamtverein) or one/more Org-Einheiten.
 * Reuses Aufgaben Org-Einheit search picker (SceInlineOrgUnitMultiPicker).
 */
export default function ClubStrategyOrgUnitScopePicker({
  options,
  selectedOrgUnitIds,
  onSelectedOrgUnitIdsChange,
  disabled = false,
}: Props) {
  const clubWide = selectedOrgUnitIds.length === 0;

  return (
    <div className="space-y-1.5" data-testid="club-strategy-org-unit-scope-picker">
      <span className="text-xs font-medium text-[var(--text-2)]">Org-Einheiten</span>
      <div className="flex flex-wrap items-center gap-1.5" data-testid="club-strategy-org-unit-scope-chips">
        <button
          type="button"
          aria-pressed={clubWide}
          disabled={disabled}
          className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
            clubWide
              ? "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 font-medium text-[var(--sce-primary)]"
              : "border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--text-2)] hover:border-[var(--border-strong)]"
          }`}
          onClick={() => onSelectedOrgUnitIdsChange([])}
          data-testid="club-strategy-scope-gesamtverein"
        >
          {GESAMTVEREIN_LABEL}
        </button>
      </div>
      {options.length > 0 ? (
        <TaskOrgUnitMultiPicker
          fieldName="clubStrategyOrgUnitIds"
          options={options}
          selectedIds={selectedOrgUnitIds}
          onSelectedIdsChange={onSelectedOrgUnitIdsChange}
          disabled={disabled}
          omitHiddenField
          placeholder="Org-Einheit suchen …"
          testIdPrefix="club-strategy-org-unit-multi-picker"
        />
      ) : null}
    </div>
  );
}