"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";

type Props = { open: boolean; onClose: () => void };

export default function CreateTargetComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neues Ziel"
      description="Strategisches Ziel mit Metriken — Vorlagen optional im Composer."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TargetNewPageClient
          layout="composer"
          onCancel={onClose}
          onSuccess={(id) => {
            onClose();
            router.push(id ? `/vereinsleitung/targets/${id}?status=saved` : "/vereinsleitung/targets?status=saved");
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
