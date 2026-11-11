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
  "Deine Eingaben wurden noch nicht gespeichert. Möchtest du den Vorgang wirklich abbrechen?";

/**
 * Canonical three-outcome unsaved prompt: continue editing, discard, or dismiss (backdrop/Escape).
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
      size="md"
      stackLayer="elevated"
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button
            type="button"
            variant="secondary"
            onClick={onContinueEditing}
            data-testid="sce-unsaved-continue"
          >
            Weiter bearbeiten
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onContinueEditing}
            data-testid="sce-unsaved-cancel"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onDiscard}
            data-testid="sce-unsaved-discard"
          >
            Änderungen verwerfen
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--text-2)]" data-sce-unsaved-changes-body>
        Du kannst weiter bearbeiten, den Dialog schließen oder deine Eingaben verwerfen.
      </p>
    </Dialog>
  );
}
