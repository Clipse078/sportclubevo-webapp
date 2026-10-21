"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import ClubForm from "@/components/admin/club-directory/ClubForm";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ClubCreateComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neuer Verein"
      description="Manuell erfasster Verein — kann später mit einer Anbieter-Identität (z.B. SFV) verknüpft werden."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ClubForm
          mode="create"
          layout="composer"
          onCancel={onClose}
          onSuccess={(clubId) => {
            onClose();
            router.push(`/dashboard/vereine/${clubId}`);
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
