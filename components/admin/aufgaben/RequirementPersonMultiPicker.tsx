"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { RequirementPersonOption } from "@/lib/requirements/person-search";
import { REQUIREMENT_PERSON_SEARCH_MIN_CHARS } from "@/lib/requirements/person-search-constants";
import { searchRequirementPersonsAction } from "@/app/(admin)/dashboard/aufgaben/requirement-actions";

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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<RequirementPersonOption[]>([]);
  const [addedKnown, setAddedKnown] = useState<Record<string, RequirementPersonOption>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!addOpen) return undefined;
    clearTimeout(searchDebounceRef.current);
    const term = search.trim();
    if (term.length < REQUIREMENT_PERSON_SEARCH_MIN_CHARS) {
      return undefined;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const result = await searchRequirementPersonsAction(term);
      if (!result.ok) {
        setSearchError(result.message);
        setSearchResults([]);
      } else {
        setSearchError(null);
        setSearchResults(result.options.filter((o) => !selectedIds.includes(o.personId)));
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [addOpen, search, selectedIds]);

  const knownById = useMemo(() => {
    const map = new Map<string, RequirementPersonOption>();
    for (const option of initialKnown) map.set(option.personId, option);
    for (const option of Object.values(addedKnown)) map.set(option.personId, option);
    for (const option of searchResults) map.set(option.personId, option);
    return map;
  }, [initialKnown, addedKnown, searchResults]);

  const selectedOptions = selectedIds
    .map((id) => knownById.get(id))
    .filter((v): v is RequirementPersonOption => !!v);

  const visibleChips = expanded ? selectedOptions : selectedOptions.slice(0, 8);
  const hiddenCount = selectedOptions.length - visibleChips.length;

  function addPerson(option: RequirementPersonOption) {
    setAddedKnown((prev) => ({ ...prev, [option.personId]: option }));
    onSelectedIdsChange([...selectedIds, option.personId]);
    setSearch("");
    setAddOpen(false);
  }

  function removePerson(personId: string) {
    onSelectedIdsChange(selectedIds.filter((id) => id !== personId));
  }

  return (
    <div className="space-y-2" data-testid={testIdPrefix}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
        <span className="text-xs text-[var(--muted)]" data-testid={`${testIdPrefix}-count`}>
          {selectedIds.length === 1 ? "1 Person ausgewählt" : `${selectedIds.length} Personen ausgewählt`}
        </span>
      </div>

      <input type="hidden" name={fieldName} value={selectedIds.join(",")} readOnly />

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {visibleChips.map((person) => (
            <span
              key={person.personId}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/60 px-2 py-0.5 text-xs text-[var(--foreground)]"
              data-testid={`${testIdPrefix}-chip-${person.personId}`}
            >
              <span className="truncate">{person.displayName}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                  aria-label={`${person.displayName} entfernen`}
                  onClick={() => removePerson(person.personId)}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}
          {hiddenCount > 0 ? (
            <button
              type="button"
              className="text-xs text-[var(--link)] hover:underline"
              onClick={() => setExpanded(true)}
              data-testid={`${testIdPrefix}-expand`}
            >
              +{hiddenCount} weitere
            </button>
          ) : null}
          {expanded && selectedOptions.length > 8 ? (
            <button
              type="button"
              className="text-xs text-[var(--link)] hover:underline"
              onClick={() => setExpanded(false)}
            >
              Weniger
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">Noch keine Empfänger ausgewählt.</p>
      )}

      {!disabled ? (
        <div className="relative">
          {!addOpen ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--text-2)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              onClick={() => setAddOpen(true)}
              data-testid={`${testIdPrefix}-add-open`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Person hinzufügen
            </button>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
              <input
                type="search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name oder E-Mail suchen…"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
                data-testid={`${testIdPrefix}-search`}
              />
              {searchError ? <p className="mt-1 text-xs text-red-600">{searchError}</p> : null}
              {searchLoading ? (
                <p className="mt-2 text-xs text-[var(--muted)]">Suche…</p>
              ) : null}
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {searchResults.map((option) => (
                  <li key={option.personId}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-[var(--surface-2)]"
                      onClick={() => addPerson(option)}
                      data-testid={`${testIdPrefix}-result-${option.personId}`}
                    >
                      <span className="font-medium">{option.displayName}</span>
                      {option.email ? (
                        <span className="ml-2 text-xs text-[var(--muted)]">{option.email}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                onClick={() => setAddOpen(false)}
              >
                Schliessen
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
