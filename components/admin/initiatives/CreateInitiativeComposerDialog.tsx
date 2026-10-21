"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import InitiativeForm from "@/components/admin/initiatives/InitiativeForm";

type Props = { open: boolean; onClose: () => void };

export default function CreateInitiativeComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Initiative"
      description="Initiative im Workspace erfassen — ohne die Übersicht zu verlassen."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <InitiativeForm
          mode="create"
          layout="composer"
          onCancel={onClose}
          onSuccess={(slug) => {
            onClose();
            router.push(slug ? `/vereinsleitung/initiativen/${slug}` : "/vereinsleitung/initiativen?status=saved");
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
