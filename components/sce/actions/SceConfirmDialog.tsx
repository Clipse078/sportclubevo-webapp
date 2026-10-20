"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, type DialogSize } from "@/components/ui/Dialog";
import {
  SCE_DIALOG_ACTIONS_ROW_CLASS,
} from "@/lib/design-system/sce-action-dialog-micro-ux";
import type { SceDialogType } from "@/lib/design-system/sce-action-dialog-foundation";

export type SceConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  dialogType?: Extract<SceDialogType, "CONFIRMATION" | "DESTRUCTIVE_CONFIRMATION" | "DECISION">;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  errorMessage?: string | null;
  size?: DialogSize;
  children?: ReactNode;
  confirmTestId?: string;
};

/**
 * Canonical SCE confirmation — wraps Dialog (SceModalOverlay stack). No parallel modal system.
 */
export function SceConfirmDialog({
  open,
  onClose,
  title,
  description,
  dialogType = "CONFIRMATION",
  confirmLabel,
  cancelLabel = "Abbrechen",
  onConfirm,
  confirmLoading = false,
  confirmDisabled = false,
  cancelDisabled = false,
  errorMessage,
  size = "md",
  children,
  confirmTestId,
}: SceConfirmDialogProps) {
  const destructive = dialogType === "DESTRUCTIVE_CONFIRMATION";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <div className="flex w-full flex-col gap-2">
          {errorMessage ? (
            <p
              role="alert"
              className="text-sm text-[var(--sce-danger)]"
              data-sce-confirm-dialog-error
            >
              {errorMessage}
            </p>
          ) : null}
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={cancelDisabled || confirmLoading}
              data-sce-action-hierarchy="SECONDARY"
            >
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "danger" : "primary"}
              onClick={onConfirm}
              loading={confirmLoading}
              disabled={confirmDisabled}
              data-testid={confirmTestId}
              data-sce-action-hierarchy={destructive ? "DESTRUCTIVE" : "PRIMARY"}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div data-sce-confirm-dialog-body data-sce-dialog-type={dialogType}>
        {children}
      </div>
    </Dialog>
  );
}
