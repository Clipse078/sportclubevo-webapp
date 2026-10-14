"use client";

import { Button } from "@/components/ui/Button";
import { SCE_DIALOG_FOOTER } from "@/lib/shell/responsive-layout";
import { cn } from "@/lib/cn";

export type SceActivityComposerFooterProps = {
  createActionLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  onSaveDraft?: () => void;
  saveDraftLabel?: string;
  showSaveDraft?: boolean;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
  submitDisabled?: boolean;
  submitError?: string | null;
  draftSaveError?: string | null;
  draftSaveAnnouncement?: string | null;
  /** Guided workflow — show primary create only on final review step. */
  showPrimarySubmit?: boolean;
  showGuidedPrevious?: boolean;
  showGuidedNext?: boolean;
  onGuidedPrevious?: () => void;
  onGuidedNext?: () => void;
};

export function SceActivityComposerFooter({
  createActionLabel,
  onCancel,
  onSubmit,
  onSaveDraft,
  saveDraftLabel,
  showSaveDraft = false,
  isSubmitting = false,
  isSavingDraft = false,
  submitDisabled = false,
  submitError,
  draftSaveError,
  draftSaveAnnouncement,
  showPrimarySubmit = true,
  showGuidedPrevious = false,
  showGuidedNext = false,
  onGuidedPrevious,
  onGuidedNext,
}: SceActivityComposerFooterProps) {
  const busy = isSubmitting || isSavingDraft;

  return (
    <footer
      className={cn(SCE_DIALOG_FOOTER, "flex-col gap-3 sm:flex-row sm:items-center")}
      data-testid="sce-activity-composer-footer"
    >
      <div className="flex w-full shrink-0 sm:w-auto">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="sce-activity-composer-cancel"
        >
          Abbrechen
        </Button>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        {draftSaveAnnouncement ? (
          <p className="sr-only" role="status" aria-live="polite">
            {draftSaveAnnouncement}
          </p>
        ) : null}
        {draftSaveError ? (
          <p
            role="alert"
            className="w-full text-sm text-[var(--sce-danger)] sm:mr-2 sm:max-w-[16rem] sm:text-right"
            data-testid="sce-activity-composer-draft-save-error"
          >
            {draftSaveError}
          </p>
        ) : null}
        {submitError ? (
          <p
            role="alert"
            className="w-full text-sm text-[var(--sce-danger)] sm:mr-2 sm:max-w-[16rem] sm:text-right"
            data-testid="sce-activity-composer-submit-error"
          >
            {submitError}
          </p>
        ) : null}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          {showSaveDraft && onSaveDraft && saveDraftLabel ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveDraft}
              loading={isSavingDraft}
              disabled={busy || isSubmitting}
              aria-busy={isSavingDraft}
              data-testid="sce-activity-composer-save-draft"
            >
              {saveDraftLabel}
            </Button>
          ) : null}
          {showGuidedPrevious && onGuidedPrevious ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onGuidedPrevious}
              disabled={busy}
              data-testid="sce-activity-composer-previous"
            >
              ← Zurück
            </Button>
          ) : null}
          {showGuidedNext && onGuidedNext ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onGuidedNext}
              disabled={busy}
              data-testid="sce-activity-composer-next"
            >
              Weiter →
            </Button>
          ) : null}
          {showPrimarySubmit ? (
            <Button
              type="button"
              variant="primary"
              onClick={onSubmit}
              loading={isSubmitting}
              disabled={submitDisabled || busy}
              aria-busy={isSubmitting}
              data-testid="sce-activity-composer-submit"
            >
              {createActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
