"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";

/** Re-export for static guardrails — xl dialog maps to SCE_AUFGABEN_TASK_FORM_DIALOG_PANEL width. */
export { SCE_AUFGABEN_TASK_FORM_DIALOG_PANEL } from "@/lib/shell/responsive-layout";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
};

/**
 * Canonical Aufgaben domain form dialog — SceModalOverlay + scrollable body + fixed footer.
 */
export function AufgabenFormDialogShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  testId,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="xl"
      footer={footer}
      bodyLayout="scroll"
    >
      <div
        data-testid={testId}
        data-dialog-size="aufgaben-form"
        data-aufgaben-form-dialog-shell="true"
      >
        {children}
      </div>
    </Dialog>
  );
}
