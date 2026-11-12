"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";

export type SceUnsavedChangesDialogProps = {
  open: boolean;
  onContinueEditing: () => void;
  onDiscard: () => void;
  title?: string;
  description?: string;
};

const DEFAULT_TITLE = "Ungespeicherte Änderungen";
const DEFAULT_DESCRIPTION =
  "Deine Änderungen wurden noch nicht gespeichert. Möchtest du die Seite wirklich verlassen?";

/**
 * Canonical unsaved prompt for composer / full-page workflows (SCE-UX-01B).
 * Light DS 2.0 compact dialog — continue editing or discard; backdrop/Escape = continue.
 */
export function SceUnsavedChangesDialog({
  open,
  onContinueEditing,
  onDiscard,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: SceUnsavedChangesDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onContinueEditing}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button
            type="button"
            variant="danger"
            onClick={onDiscard}
            data-testid="sce-unsaved-discard"
            data-sce-action-hierarchy="DESTRUCTIVE"
          >
            Änderungen verwerfen
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onContinueEditing}
            data-testid="sce-unsaved-continue"
            data-sce-action-hierarchy="PRIMARY"
          >
            Weiter bearbeiten
          </Button>
        </div>
      }
    />
  );
}
