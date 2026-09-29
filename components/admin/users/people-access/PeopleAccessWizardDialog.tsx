"use client";

import { Dialog } from "@/components/ui/Dialog";
import PeopleAccessWizard, {
  type PeopleAccessWizardProps,
} from "@/components/admin/users/people-access/PeopleAccessWizard";

type Props = Omit<PeopleAccessWizardProps, "onCancel" | "onComplete"> & {
  open: boolean;
  onClose: () => void;
  onComplete: (userId: string) => void;
};

export default function PeopleAccessWizardDialog({
  open,
  onClose,
  onComplete,
  ...wizardProps
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Person hinzufügen"
      description="Person einladen, Rollen zuweisen und Zugriff prüfen."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <PeopleAccessWizard
        {...wizardProps}
        onCancel={onClose}
        onComplete={(userId) => {
          onComplete(userId);
          onClose();
        }}
      />
    </Dialog>
  );
}
