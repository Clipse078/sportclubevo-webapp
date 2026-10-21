"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import MeetingForm from "@/components/admin/meetings/MeetingForm";

type Props = { open: boolean; onClose: () => void };

export default function CreateMeetingComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neues Meeting"
      description="Meeting im Vereinsleitung-Workspace erfassen — Kontext bleibt erhalten."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MeetingForm
          mode="create"
          layout="composer"
          onCancel={onClose}
          onSuccess={(slug) => {
            onClose();
            router.push(slug ? `/vereinsleitung/meetings/${slug}` : "/vereinsleitung/meetings?status=saved");
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
