"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SceTextarea } from "@/components/sce/forms/SceTextarea";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import { FINANCE_FIELD_CONTROL_CLASS } from "@/lib/finance/finance-workspace-surfaces";

type TranslateFn = (key: string) => string;

export type FinanceCommitmentRejectDialogProps = {
  open: boolean;
  onClose: () => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  rejectError: string | null;
  pending: boolean;
  onConfirm: () => void;
  fieldId: string;
  t: TranslateFn;
  dismissLabel: string;
};

export function FinanceCommitmentRejectDialog({
  open,
  onClose,
  rejectReason,
  onRejectReasonChange,
  rejectError,
  pending,
  onConfirm,
  fieldId,
  t,
  dismissLabel,
}: FinanceCommitmentRejectDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("rejectDialogTitle")}
      description={t("rejectDialogDescription")}
      size="standard"
      panelClassName="min-w-0 max-w-md"
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" onClick={onClose}>
            {dismissLabel}
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={onConfirm}>
            {t("rejectConfirmAction")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3" data-finance-commitment-reject-dialog>
        <SceFormField
          label={t("rejectReasonLabel")}
          htmlFor={fieldId}
          description={t("rejectReasonHint")}
          error={rejectError ?? undefined}
        >
          <SceTextarea
            id={fieldId}
            className={cn(FINANCE_FIELD_CONTROL_CLASS, "min-h-[4.5rem] resize-y")}
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            disabled={pending}
            placeholder={t("rejectReasonPlaceholder")}
            aria-invalid={rejectError ? true : undefined}
          />
        </SceFormField>
      </div>
    </Dialog>
  );
}
