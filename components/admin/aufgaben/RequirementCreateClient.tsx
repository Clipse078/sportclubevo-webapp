"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { SceSemanticFeedback } from "@/components/sce/feedback/SceSemanticFeedback";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import { emptyRequirementAudienceSelection } from "@/lib/requirements/requirement-audience-selection";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
import { createRequirementDraftAction } from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import {
  RequirementCreateForm,
  appendRequirementAudienceToFormData,
} from "./RequirementCreateForm";

const FORM_ID = "requirement-fallback-create-form";

type Props = {
  timeZone: string;
};

export default function RequirementCreateClient({ timeZone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<RequirementAudienceSelection>(
    emptyRequirementAudienceSelection(),
  );

  function onSubmit(formData: FormData) {
    setError(null);
    appendRequirementAudienceToFormData(formData, audience);
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
    <SceWorkspaceChrome
      className="mx-auto max-w-4xl"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Aufgaben", href: buildAufgabenBereichHref("anforderungen") },
        { label: "Neue Anforderung" },
      ]}
      header={{
        title: "Neue Anforderung",
        description:
          "Mehrere Personen müssen individuell bestätigen. Empfänger werden beim Aktivieren festgelegt.",
        secondaryActions: (
          <Link
            href={buildAufgabenBereichHref("anforderungen")}
            className="fca-button-secondary inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Anforderungen
          </Link>
        ),
      }}
      density="dense"
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
        data-requirement-create-fallback="true"
      >
        <RequirementCreateForm
          timeZone={timeZone}
          pending={pending}
          formId={FORM_ID}
          audience={audience}
          onAudienceChange={setAudience}
          onSubmit={onSubmit}
          error={
            error ? (
              <SceSemanticFeedback tone="ERROR" title="Speichern fehlgeschlagen" description={error} />
            ) : null
          }
        />
        <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Link href={buildAufgabenBereichHref("anforderungen")} className="fca-button-secondary text-sm">
            Abbrechen
          </Link>
          <button
            type="submit"
            form={FORM_ID}
            className="fca-button-primary text-sm"
            disabled={pending}
            data-testid="requirement-create-submit"
          >
            Entwurf speichern
          </button>
        </div>
      </div>
    </SceWorkspaceChrome>
  );
}
