"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus, X } from "lucide-react";
import type { TaskDocumentReferenceDto } from "@/lib/tasks/task-document-reference-service";
import type { WorkspaceDocumentPickerOption } from "@/lib/workspace/document-access";
import {
  linkTaskDocumentAction,
  searchTaskDocumentLinkCandidatesAction,
  unlinkTaskDocumentAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";

type Props = {
  taskId: string;
  references: TaskDocumentReferenceDto[];
  canLink: boolean;
};

export function TaskDocumentReferencesSection({ taskId, references, canLink }: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<WorkspaceDocumentPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadOptions = useCallback(
    async (search: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchTaskDocumentLinkCandidatesAction(taskId, search);
        if (!result.ok) {
          setOptions([]);
          setError(result.message);
          return;
        }
        setOptions(result.options);
      } finally {
        setLoading(false);
      }
    },
    [taskId],
  );

  useEffect(() => {
    if (!pickerOpen) return;
    const handle = window.setTimeout(() => {
      void loadOptions(query);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [pickerOpen, query, loadOptions]);

  function linkDocument(documentId: string) {
    startTransition(async () => {
      const result = await linkTaskDocumentAction(taskId, documentId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPickerOpen(false);
      setQuery("");
      router.refresh();
    });
  }

  function unlinkDocument(documentId: string) {
    startTransition(async () => {
      const result = await unlinkTaskDocumentAction(taskId, documentId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  const count = references.length;

  return (
    <section
      className="rounded-lg border border-[var(--border)]/70 px-3 py-2.5"
      data-testid="task-document-references"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Dokumente · {count}
        </p>
        {canLink ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-[var(--sce-primary)] hover:underline"
            onClick={() => setPickerOpen((open) => !open)}
            data-testid="task-document-link-open"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Dokument verknüpfen
          </button>
        ) : null}
      </div>

      {count === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Noch keine Dokumente verknüpft.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {references.map((ref) => {
            const presentation = ref.presentation;
            if (presentation.access === "restricted") {
              return (
                <li
                  key={ref.referenceId}
                  className="flex items-center gap-2 rounded-md bg-[var(--surface-2)]/60 px-2 py-1.5 text-sm text-[var(--text-2)]"
                  data-testid={`task-document-row-restricted-${ref.documentId}`}
                >
                  <FileText className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                  <span>Dokument (kein Zugriff)</span>
                </li>
              );
            }

            return (
              <li
                key={ref.referenceId}
                className="flex items-center gap-2 rounded-md bg-[var(--surface-2)]/40 px-2 py-1.5"
                data-testid={`task-document-row-${ref.documentId}`}
              >
                <FileText className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={presentation.href}
                    className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                    data-testid={`task-document-open-${ref.documentId}`}
                  >
                    {presentation.title}
                  </Link>
                  {presentation.folderBreadcrumb ? (
                    <p className="truncate text-xs text-[var(--muted)]">
                      {presentation.folderBreadcrumb}
                    </p>
                  ) : null}
                </div>
                {canLink ? (
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-red-300"
                    aria-label="Verknüpfung entfernen"
                    disabled={pending}
                    onClick={() => unlinkDocument(ref.documentId)}
                    data-testid={`task-document-unlink-${ref.documentId}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && canLink ? (
        <div
          className="mt-3 space-y-2 rounded-md border border-[var(--border)]/60 bg-[var(--surface)] p-2.5"
          data-testid="task-document-picker"
        >
          <input
            type="search"
            className="fca-input w-full text-sm"
            placeholder="Dokument suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="task-document-picker-search"
          />
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Suche…
            </p>
          ) : null}
          {!loading && options.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Keine Dokumente gefunden.</p>
          ) : null}
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                  disabled={pending}
                  onClick={() => linkDocument(option.id)}
                  data-testid={`task-document-picker-option-${option.id}`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-medium text-[var(--foreground)]">{option.title}</span>
                    {option.folderBreadcrumb ? (
                      <span className="block truncate text-xs text-[var(--muted)]">
                        {option.folderBreadcrumb}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
