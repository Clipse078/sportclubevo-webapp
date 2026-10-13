"use client";

import { Button } from "@/components/ui/Button";
import { SCE_DIALOG_FOOTER } from "@/lib/shell/responsive-layout";
import { cn } from "@/lib/cn";

export type SceActivityComposerFooterProps = {
  createActionLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitError?: string | null;
};

export function SceActivityComposerFooter({
  createActionLabel,
  onCancel,
  onSubmit,
  isSubmitting = false,
  submitDisabled = false,
  submitError,
}: SceActivityComposerFooterProps) {
  return (
    <footer
      className={cn(SCE_DIALOG_FOOTER, "flex-col items-stretch sm:flex-row sm:items-center")}
      data-testid="sce-activity-composer-footer"
    >
      {submitError ? (
        <p
          role="alert"
          className="mr-auto w-full text-sm text-[var(--sce-danger)] sm:w-auto"
          data-testid="sce-activity-composer-submit-error"
        >
          {submitError}
        </p>
      ) : (
        <span className="mr-auto hidden sm:block" aria-hidden="true" />
      )}
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={submitDisabled || isSubmitting}
          aria-busy={isSubmitting}
          data-testid="sce-activity-composer-submit"
        >
          {createActionLabel}
        </Button>
      </div>
    </footer>
  );
}
