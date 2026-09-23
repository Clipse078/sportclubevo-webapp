"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createRequirementLinkedToWorkspaceDocumentAction } from "@/app/(admin)/dashboard/workspace/document-inspector-actions";

type Props = {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WorkspaceDocumentRequirementCreateDialog({
  documentId,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createRequirementLinkedToWorkspaceDocumentAction(documentId, title);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onOpenChange(false);
      setTitle("");
      router.refresh();
      router.push(`/dashboard/aufgaben/anforderungen/${result.requirementId}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={() => onOpenChange(false)}
      data-testid="document-requirement-create-dialog-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-requirement-create-title"
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        data-testid="document-requirement-create-dialog"
      >
        <h2 id="document-requirement-create-title" className="text-base font-semibold text-[var(--text)]">
          Anforderung verknüpfen
        </h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Entwurf mit der aktuellen Dokumentversion verknüpfen.
        </p>
        <form className="mt-4 space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block text-sm">
            <span className="font-medium text-[var(--text)]">Titel</span>
            <input
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              autoFocus
              data-testid="document-requirement-create-title"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending}
              className="fca-button-primary px-3 py-2 text-sm disabled:opacity-50"
              data-testid="document-requirement-create-submit"
            >
              {pending ? "Wird erstellt…" : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
