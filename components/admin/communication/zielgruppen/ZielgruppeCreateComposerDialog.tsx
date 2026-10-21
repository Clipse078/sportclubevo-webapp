"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import ZielgruppeManagementForm from "@/components/admin/communication/zielgruppen/ZielgruppeManagementForm";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Modal-first Zielgruppe creation — preserves list workspace context on save/cancel.
 */
export default function ZielgruppeCreateComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Zielgruppe"
      description="Bestimme, wer zu dieser Zielgruppe gehört."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <ZielgruppeManagementForm
          mode="create"
          layout="composer"
          onCreated={(targetGroupId) => {
            onClose();
            router.push(`/dashboard/communication/zielgruppen/${targetGroupId}`);
            router.refresh();
          }}
          onCancel={onClose}
        />
      </div>
    </Dialog>
  );
}
