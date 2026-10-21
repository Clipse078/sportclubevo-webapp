"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import UserForm from "@/components/admin/users/UserForm";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PlatformUserCreateComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neuer Benutzer"
      description="Plattform-Benutzerkonto anlegen. Deep-Link-Fallback: /dashboard/users/new"
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <UserForm
          mode="create"
          onCancel={onClose}
          onSuccess={() => {
            onClose();
            router.push("/dashboard/users");
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
