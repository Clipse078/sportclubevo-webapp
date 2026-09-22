"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";

type Props = {
  fieldName: string;
  options: TaskOrgUnitPickerOption[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
};

function formatLabel(option: TaskOrgUnitPickerOption): string {
  const indent = option.level > 0 ? `${"  ".repeat(option.level)}↳ ` : "";
  return `${indent}${option.label}`;
}

export default function TaskOrgUnitMultiPicker({
  fieldName,
  options,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const available = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return options.filter((o) => {
      if (selectedIds.includes(o.id)) return false;
      if (!term) return true;
      return o.label.toLowerCase().includes(term);
    });
  }, [filter, options, selectedIds]);

  function add(id: string) {
    if (!selectedIds.includes(id)) {
      onSelectedIdsChange([...selectedIds, id]);
    }
    setAddOpen(false);
    setFilter("");
  }

  return (
    <div data-testid="task-org-unit-multi-picker">
      <input type="hidden" name={fieldName} value={selectedIds.join(",")} />
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedIds.map((id) => {
          const option = byId.get(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 pl-2 pr-1 py-0.5 text-xs text-[var(--text-2)]"
            >
              {option ? formatLabel(option) : id}
              <button
                type="button"
                className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                onClick={() => onSelectedIdsChange(selectedIds.filter((x) => x !== id))}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
            onClick={() => setAddOpen((v) => !v)}
            disabled={disabled}
            data-testid="task-org-unit-multi-add"
          >
            <Plus className="h-3 w-3" />
            Organisationseinheit hinzufügen
          </button>
          {addOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
              <input
                className="fca-input w-full text-sm"
                placeholder="Organisationseinheit suchen …"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                data-testid="task-org-unit-multi-search"
              />
              <div className="mt-1 max-h-44 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-[var(--muted)]">Keine Treffer</p>
                ) : (
                  available.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                      onClick={() => add(option.id)}
                    >
                      {formatLabel(option)}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
