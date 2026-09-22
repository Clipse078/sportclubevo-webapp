"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, X } from "lucide-react";
import type { RequirementDocumentReferenceDto } from "@/lib/requirements/requirement-document-reference-service";
import {
  linkRequirementDocumentAction,
  listRequirementDocumentVersionsForLinkAction,
  searchRequirementDocumentLinkCandidatesAction,
  unlinkRequirementDocumentReferenceAction,
} from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import { WorkspaceDocumentVersionReferencePicker } from "./WorkspaceDocumentVersionReferencePicker";

type Props = {
  requirementId: string;
  references: RequirementDocumentReferenceDto[];
  canLink: boolean;
};

function lifecycleLabel(lifecycle: string): string {
  if (lifecycle === "ARCHIVED") return "Archiviert";
  if (lifecycle === "TRASHED") return "Papierkorb";
  return "Aktiv";
}

export function RequirementDocumentReferencesSection({
  requirementId,
  references,
  canLink,
}: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function linkDocument(input: { documentId: string; workspaceDocumentVersionId: string }) {
    startTransition(async () => {
      const result = await linkRequirementDocumentAction(requirementId, input);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPickerOpen(false);
      router.refresh();
    });
  }

  function unlinkReference(referenceId: string) {
    startTransition(async () => {
      const result = await unlinkRequirementDocumentReferenceAction(requirementId, referenceId);
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
      data-testid="requirement-document-references"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Workspace-Dokumente · {count}
        </p>
        {canLink ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-[var(--sce-primary)] hover:underline"
            onClick={() => setPickerOpen((open) => !open)}
            data-testid="requirement-document-link-open"
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
            if (presentation.accessible === false) {
              return (
                <li
                  key={ref.referenceId}
                  className="flex items-center gap-2 rounded-md bg-[var(--surface-2)]/60 px-2 py-1.5 text-sm text-[var(--text-2)]"
                  data-testid={`requirement-document-row-restricted-${ref.referenceId}`}
                >
                  <FileText className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                  <span>Dokument (kein Zugriff)</span>
                </li>
              );
            }

            if (presentation.accessible !== true) {
              return null;
            }

            return (
              <li
                key={ref.referenceId}
                className="flex items-center gap-2 rounded-md bg-[var(--surface-2)]/40 px-2 py-1.5"
                data-testid={`requirement-document-row-${ref.referenceId}`}
              >
                <FileText className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={presentation.canonicalWorkspaceUrl}
                    className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                    data-testid={`requirement-document-open-${ref.referenceId}`}
                  >
                    {presentation.documentTitle}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    Version {presentation.versionNumber} ·{" "}
                    {lifecycleLabel(presentation.documentLifecycle)}
                  </p>
                </div>
                {canLink ? (
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-red-300"
                    aria-label="Verknüpfung entfernen"
                    disabled={pending}
                    onClick={() => unlinkReference(ref.referenceId)}
                    data-testid={`requirement-document-unlink-${ref.referenceId}`}
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
        <div className="mt-3">
          <WorkspaceDocumentVersionReferencePicker
            disabled={pending}
            searchAction={(q) => searchRequirementDocumentLinkCandidatesAction(requirementId, q)}
            listVersionsAction={(documentId) =>
              listRequirementDocumentVersionsForLinkAction(requirementId, documentId)
            }
            onConfirm={linkDocument}
            testIdPrefix="requirement-document"
          />
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
