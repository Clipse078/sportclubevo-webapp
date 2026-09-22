"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import RequirementPersonMultiPicker from "./RequirementPersonMultiPicker";
import { createRequirementDraftAction } from "@/app/(admin)/dashboard/aufgaben/requirement-actions";

export default function RequirementCreateClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("audiencePersonIds", audienceIds.join(","));
    startTransition(async () => {
      const result = await createRequirementDraftAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.requirementId) {
        router.push(requirementDetailHref(result.requirementId));
      }
    });
  }

  return (
    <div className={`mx-auto w-full max-w-3xl space-y-4 px-1 py-2 ${SCE_DIALOG_WORKSPACE_PANEL}`}>
      <Link
        href={buildAufgabenBereichHref("anforderungen")}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-2)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Anforderungen
      </Link>
      <header>
        <h1 className="text-xl font-semibold">Neue Anforderung</h1>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Mehrere Personen müssen individuell bestätigen. Antwort: Bestätigung.
        </p>
      </header>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <form action={onSubmit} className="space-y-4 rounded-xl border border-[var(--border)] p-4">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
          <input
            name="title"
            required
            disabled={pending}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            placeholder="Trainershandbuch 2026/27 bestätigen"
            data-testid="requirement-create-title"
          />
        </label>
        <TaskDescriptionFormField name="description" disabled={pending} compact />
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">Fällig am</span>
          <input
            type="date"
            name="dueAt"
            disabled={pending}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          />
        </label>
        <RequirementPersonMultiPicker
          selectedIds={audienceIds}
          onSelectedIdsChange={setAudienceIds}
          disabled={pending}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Link href={buildAufgabenBereichHref("anforderungen")} className="fca-button-secondary text-sm">
            Abbrechen
          </Link>
          <button type="submit" className="fca-button-primary text-sm" disabled={pending}>
            Entwurf speichern
          </button>
        </div>
      </form>
    </div>
  );
}
