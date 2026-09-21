"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { TaskPriority } from "@prisma/client";
import { Plus, X } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS } from "@/lib/tasks/quick-create-assignee-search";
import {
  createQuickAufgabeAction,
  searchQuickCreateAssigneesAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { TaskReminderFields } from "./TaskReminderFields";
import TaskDescriptionFormField from "./TaskDescriptionFormField";

export type QuickCreateCurrentUser = {
  userId: string;
  firstName: string;
  lastName: string;
};

type Props = {
  canCreateSelf: boolean;
  canAssignOthers: boolean;
  currentUser: QuickCreateCurrentUser;
  timeZone: string;
  canOpenFullCreate?: boolean;
};

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export default function MeineAufgabenQuickCreateDialog({
  canCreateSelf,
  canAssignOthers,
  currentUser,
  timeZone,
  canOpenFullCreate = false,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([currentUser.userId]);
  const [addOpen, setAddOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [searchResults, setSearchResults] = useState<TaskAssigneeOption[]>([]);
  const [knownAssignees, setKnownAssignees] = useState<Record<string, TaskAssigneeOption>>(
    {},
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  function resetDialogState() {
    setSelectedIds([currentUser.userId]);
    setAddOpen(false);
    setAssigneeSearch("");
    setSearchResults([]);
    setKnownAssignees({});
    setSearchLoading(false);
    setSearchError(null);
    setError(null);
  }

  function openDialog() {
    resetDialogState();
    setOpen(true);
    window.setTimeout(() => titleRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!addOpen || !canAssignOthers) return undefined;
    clearTimeout(searchDebounceRef.current);
    const term = assigneeSearch.trim();
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
        setSearchResults(
          result.options.filter((o) => !selectedIds.includes(o.userId)),
        );
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [addOpen, assigneeSearch, canAssignOthers, selectedIds]);

  const assigneeSearchTerm = assigneeSearch.trim();
  const assigneeSearchReady =
    assigneeSearchTerm.length >= ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS;

  if (!canCreateSelf) return null;

  const selectedPeople = selectedIds
    .map((id) => {
      if (id === currentUser.userId) {
        return {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
        };
      }
      return knownAssignees[id] ?? searchResults.find((a) => a.userId === id);
    })
    .filter(Boolean) as TaskAssigneeOption[];

  function closeDialog() {
    if (!pending) setOpen(false);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("assigneeUserIds", selectedIds.join(","));
    startTransition(async () => {
      const result = await createQuickAufgabeAction(formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  function removeAssignee(userId: string) {
    if (!canAssignOthers) return;
    if (userId === currentUser.userId && selectedIds.length === 1) return;
    setSelectedIds((prev) => prev.filter((id) => id !== userId));
  }

  function addAssignee(userId: string, person?: TaskAssigneeOption) {
    if (!canAssignOthers || !userId) return;
    if (person) {
      setKnownAssignees((prev) => ({ ...prev, [userId]: person }));
    }
    setSelectedIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    setAddOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        onClick={openDialog}
        data-testid="meine-aufgaben-create-open"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Aufgabe
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          role="presentation"
          onClick={closeDialog}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeDialog();
          }}
          data-testid="meine-aufgaben-create-dialog-backdrop"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="meine-aufgaben-create-title"
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="meine-aufgaben-create-dialog"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="meine-aufgaben-create-title"
                  className="text-base font-semibold text-[var(--foreground)]"
                >
                  Neue Aufgabe
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Schnell etwas für dich oder dein Team erfassen.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                onClick={closeDialog}
                aria-label="Dialog schliessen"
                disabled={pending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error ? (
              <p className="mb-3 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <form action={onSubmit} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">
                  Titel <span className="text-red-400">*</span>
                </span>
                <input
                  ref={titleRef}
                  name="title"
                  required
                  className="fca-input w-full text-sm"
                  data-testid="meine-aufgaben-create-title"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
              </label>

              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Zugewiesen an</span>
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  data-testid="meine-aufgaben-create-assignees"
                >
                  {selectedPeople.map((person) => (
                    <span
                      key={person.userId}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 pl-1 pr-1.5 py-0.5 text-xs text-[var(--text-2)]"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-3)] text-[0.625rem] font-semibold">
                        {initials(person.firstName, person.lastName)}
                      </span>
                      {formatName(person.firstName, person.lastName)}
                      {canAssignOthers &&
                      !(person.userId === currentUser.userId && selectedIds.length === 1) ? (
                        <button
                          type="button"
                          className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                          aria-label={`${formatName(person.firstName, person.lastName)} entfernen`}
                          onClick={() => removeAssignee(person.userId)}
                          disabled={pending}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                  {canAssignOthers ? (
                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
                        onClick={() => setAddOpen((v) => !v)}
                        disabled={pending}
                        data-testid="meine-aufgaben-create-add-person"
                      >
                        <Plus className="h-3 w-3" />
                        Person
                      </button>
                      {addOpen ? (
                        <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
                          <input
                            type="search"
                            className="fca-input w-full text-sm"
                            placeholder="Name oder E-Mail …"
                            value={assigneeSearch}
                            onChange={(e) => setAssigneeSearch(e.target.value)}
                            data-testid="meine-aufgaben-create-assignee-search"
                            disabled={pending}
                          />
                          <div className="mt-1 max-h-36 overflow-y-auto">
                            {searchLoading ? (
                              <p className="px-2 py-1.5 text-xs text-[var(--muted)]">Suche …</p>
                            ) : searchError ? (
                              <p className="px-2 py-1.5 text-xs text-red-300">{searchError}</p>
                            ) : !assigneeSearchReady ? (
                              <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
                                Mindestens {ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS} Zeichen
                              </p>
                            ) : searchResults.length === 0 ? (
                              <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
                                Keine Treffer
                              </p>
                            ) : (
                              searchResults.map((a) => (
                                <button
                                  key={a.userId}
                                  type="button"
                                  className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                                  onClick={() => addAssignee(a.userId, a)}
                                >
                                  {a.firstName} {a.lastName}
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

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-2)]">Termin</span>
                  <input
                    type="date"
                    name="dueAt"
                    className="fca-input w-full text-sm"
                    data-testid="meine-aufgaben-create-due"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-2)]">Priorität</span>
                  <select name="priority" className="fca-input w-full text-sm" defaultValue="NORMAL">
                    {(["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {TASK_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <TaskDescriptionFormField compact inputId="meine-aufgaben-create-description" />

              <TaskReminderFields
                timeZone={timeZone}
                values={{
                  reminder1PresetKey: null,
                  reminder2PresetKey: null,
                  reminder1At: null,
                  reminder2At: null,
                }}
                disabled={pending}
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {canOpenFullCreate ? (
                  <Link
                    href="/dashboard/aufgaben/neu"
                    className="mr-auto text-xs font-medium text-[var(--primary)] hover:underline"
                    onClick={() => setOpen(false)}
                    data-testid="meine-aufgaben-create-more-options"
                  >
                    Weitere Optionen
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="fca-button-secondary text-sm"
                  onClick={closeDialog}
                  disabled={pending}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="fca-button-primary text-sm"
                  disabled={pending}
                  data-testid="meine-aufgaben-create-submit"
                >
                  {pending ? "Erstellen …" : "Aufgabe erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
