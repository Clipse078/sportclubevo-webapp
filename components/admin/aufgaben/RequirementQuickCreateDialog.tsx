"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { SceSemanticFeedback } from "@/components/sce/feedback/SceSemanticFeedback";
import { createRequirementDraftAction } from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
import { AufgabenFormDialogShell } from "./AufgabenFormDialogShell";
import {
  RequirementCreateForm,
  appendRequirementAudienceToFormData,
} from "./RequirementCreateForm";
import { emptyRequirementAudienceSelection } from "@/lib/requirements/requirement-audience-selection";

type Props = {
  canCreate: boolean;
  timeZone: string;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerTestId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

const FORM_ID = "requirement-quick-create-form";

export default function RequirementQuickCreateDialog({
  canCreate,
  timeZone,
  triggerLabel = "Anforderung",
  triggerClassName,
  triggerTestId = "requirements-create-open",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<RequirementAudienceSelection>(
    emptyRequirementAudienceSelection(),
  );

  if (!canCreate) return null;

  function resetState() {
    setError(null);
    setAudience(emptyRequirementAudienceSelection());
  }

  function openDialog() {
    resetState();
    setOpen(true);
  }

  function closeDialog() {
    if (!pending) setOpen(false);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    appendRequirementAudienceToFormData(formData, audience);
    startTransition(async () => {
      const result = await createRequirementDraftAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      if (result.requirementId) {
        router.push(requirementDetailHref(result.requirementId));
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          className={triggerClassName ?? "fca-button-primary inline-flex items-center gap-1.5 text-sm"}
          onClick={openDialog}
          data-testid={triggerTestId}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </button>
      ) : null}

      <AufgabenFormDialogShell
        open={open}
        onClose={closeDialog}
        title="Neue Anforderung"
        description="Eine Bestätigung, die jede ausgewählte Person einzeln abgeben muss."
        testId="requirement-create-dialog"
        footer={
          <>
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
              form={FORM_ID}
              className="fca-button-primary text-sm"
              disabled={pending}
              data-testid="requirement-create-submit"
            >
              Entwurf speichern
            </button>
          </>
        }
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
      </AufgabenFormDialogShell>
    </>
  );
}
