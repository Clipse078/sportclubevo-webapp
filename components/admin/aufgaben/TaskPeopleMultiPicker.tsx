"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS } from "@/lib/tasks/quick-create-assignee-search";
import { searchQuickCreateAssigneesAction } from "@/app/(admin)/dashboard/aufgaben/actions";

type Props = {
  label: string;
  fieldName: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  addButtonLabel?: string;
  testIdPrefix?: string;
  initialKnown?: TaskAssigneeOption[];
  /** Selected users that cannot be removed (e.g. self on Meine Aufgaben quick create). */
  lockedUserIds?: string[];
  hideLabel?: boolean;
  omitHiddenField?: boolean;
  allowAdd?: boolean;
  /** Associates hidden field with an external form (e.g. series workspace edit). */
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
  const locked = new Set(lockedUserIds);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<TaskAssigneeOption[]>([]);
  const [addedKnown, setAddedKnown] = useState<Record<string, TaskAssigneeOption>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!addOpen) return undefined;
    clearTimeout(searchDebounceRef.current);
    const term = search.trim();
    if (term.length < ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS) {
      return undefined;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const result = await searchQuickCreateAssigneesAction(term);
      if (!result.ok) {
        setSearchError(result.message);
        setSearchResults([]);
      } else {
        setSearchError(null);
        setSearchResults(result.options.filter((o) => !selectedIds.includes(o.userId)));
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [addOpen, search, selectedIds]);

  const searchReady = search.trim().length >= ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS;
  const searchLoadingVisible = searchReady && searchLoading;

  const effectiveKnown = useMemo(() => {
    const map: Record<string, TaskAssigneeOption> = {};
    for (const person of initialKnown) {
      map[person.userId] = person;
    }
    return { ...map, ...addedKnown };
  }, [initialKnown, addedKnown]);

  const selectedPeople = selectedIds
    .map((id) => effectiveKnown[id] ?? searchResults.find((p) => p.userId === id))
    .filter(Boolean) as TaskAssigneeOption[];

  function addPerson(userId: string, person?: TaskAssigneeOption) {
    if (person) {
      setAddedKnown((prev) => ({ ...prev, [userId]: person }));
    }
    if (!selectedIds.includes(userId)) {
      onSelectedIdsChange([...selectedIds, userId]);
    }
    setAddOpen(false);
    setSearch("");
  }

  function removePerson(userId: string) {
    onSelectedIdsChange(selectedIds.filter((id) => id !== userId));
  }

  return (
    <div className="space-y-1" data-testid={testIdPrefix}>
      {hideLabel ? null : (
        <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
      )}
      {omitHiddenField ? null : (
        <input type="hidden" name={fieldName} form={form} value={selectedIds.join(",")} />
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedPeople.map((person) => (
          <span
            key={person.userId}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 pl-2 pr-1 py-0.5 text-xs text-[var(--text-2)]"
          >
            {formatName(person.firstName, person.lastName, person.displayName)}
            {locked.has(person.userId) ? null : (
              <button
                type="button"
                className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                aria-label={`${formatName(person.firstName, person.lastName, person.displayName)} entfernen`}
                onClick={() => removePerson(person.userId)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {allowAdd ? (
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
            onClick={() => setAddOpen((v) => !v)}
            disabled={disabled}
            data-testid={`${testIdPrefix}-add`}
          >
            <Plus className="h-3 w-3" />
            {addButtonLabel}
          </button>
          {addOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
              <input
                type="search"
                className="fca-input w-full text-sm"
                placeholder="Name oder E-Mail …"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid={`${testIdPrefix}-search`}
                disabled={disabled}
              />
              <div className="mt-1 max-h-40 overflow-y-auto">
                {searchLoadingVisible ? (
                  <p className="px-2 py-1.5 text-xs text-[var(--muted)]">Suche …</p>
                ) : searchError ? (
                  <p className="px-2 py-1.5 text-xs text-red-300">{searchError}</p>
                ) : !searchReady ? (
                  <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
                    Mindestens {ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS} Zeichen
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-[var(--muted)]">Keine Treffer</p>
                ) : (
                  searchResults.map((person) => (
                    <button
                      key={person.userId}
                      type="button"
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                      onClick={() => addPerson(person.userId, person)}
                    >
                      <span className="font-medium text-[var(--foreground)]">
                        {formatName(person.firstName, person.lastName, person.displayName)}
                      </span>
                      {person.email ? (
                        <span className="ml-1 text-xs text-[var(--muted)]">{person.email}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  );
}
