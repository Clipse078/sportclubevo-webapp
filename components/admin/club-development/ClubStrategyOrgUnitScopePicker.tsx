"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import TaskOrgUnitMultiPicker from "@/components/admin/aufgaben/TaskOrgUnitMultiPicker";
import {
  CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE,
  CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN,
  isGesamtvereinScopeToken,
  mergeOrgUnitPickerSelection,
  selectGesamtvereinScope,
} from "@/lib/club-development/club-strategy-org-scope";

const GESAMTVEREIN_LABEL = "Gesamtverein";

type Props = {
  options: TaskOrgUnitPickerOption[];
  selectedScope: string[];
  onSelectedScopeChange: (scope: string[]) => void;
  disabled?: boolean;
  showRequiredHint?: boolean;
};

export default function ClubStrategyOrgUnitScopePicker({
  options,
  selectedScope,
  onSelectedScopeChange,
  disabled = false,
  showRequiredHint = false,
}: Props) {
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const pickerOrgUnitIds = useMemo(
    () => selectedScope.filter((id) => !isGesamtvereinScopeToken(id)),
    [selectedScope],
  );
  const hasGesamtverein = selectedScope.some(isGesamtvereinScopeToken);

  function removeToken(token: string) {
    onSelectedScopeChange(selectedScope.filter((id) => id !== token));
  }

  return (
    <div className="space-y-1.5" data-testid="club-strategy-org-unit-scope-picker">
      <span className="text-xs font-medium text-[var(--text-2)]">
        Org-Einheiten
        <span className="text-[var(--muted)]"> (erforderlich)</span>
      </span>
      <div className="flex flex-wrap items-center gap-1.5" data-testid="club-strategy-org-unit-scope-chips">
        {selectedScope.map((id) => {
          const label = isGesamtvereinScopeToken(id) ? GESAMTVEREIN_LABEL : (byId.get(id)?.label ?? id);
          return (
            <span
              key={id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 pl-2 pr-1 py-0.5 text-xs font-medium text-[var(--sce-primary)]"
              data-testid={
                isGesamtvereinScopeToken(id)
                  ? "club-strategy-scope-gesamtverein-chip"
                  : `club-strategy-org-unit-chip-${id}`
              }
            >
              <span className="truncate">{label}</span>
              {disabled ? null : (
                <button
                  type="button"
                  className="rounded p-0.5 text-[var(--sce-primary)] hover:bg-[var(--sce-primary)]/20"
                  aria-label={`${label} entfernen`}
                  onClick={() => removeToken(id)}
                  data-testid={
                    isGesamtvereinScopeToken(id)
                      ? "club-strategy-scope-gesamtverein-remove"
                      : `club-strategy-org-unit-remove-${id}`
                  }
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </span>
          );
        })}
        {!hasGesamtverein ? (
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-0.5 text-xs text-[var(--text-2)] hover:border-[var(--border-strong)]"
            onClick={() => onSelectedScopeChange(selectGesamtvereinScope())}
            data-testid="club-strategy-scope-gesamtverein-add"
          >
            {GESAMTVEREIN_LABEL}
          </button>
        ) : null}
      </div>
      {options.length > 0 ? (
        <TaskOrgUnitMultiPicker
          fieldName="clubStrategyOrgUnitIds"
          options={options}
          selectedIds={pickerOrgUnitIds}
          onSelectedIdsChange={(ids) => onSelectedScopeChange(mergeOrgUnitPickerSelection(selectedScope, ids))}
          disabled={disabled}
          omitHiddenField
          placeholder="Org-Einheit suchen …"
          testIdPrefix="club-strategy-org-unit-multi-picker"
        />
      ) : null}
      {showRequiredHint ? (
        <p className="text-xs text-amber-800" role="alert" data-testid="club-strategy-org-scope-required">
          {CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}