"use client";

import { Dialog } from "@/components/ui/Dialog";
import TenantForm from "@/components/admin/tenants/TenantForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function TenantCreateComposerDialog({ open, onClose, onCreated }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neuer Tenant"
      description="Neue Vereinsinstanz anlegen. Fallback: /dashboard/admin/tenants/new"
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TenantForm
          mode="create"
          onCancel={onClose}
          onSuccess={() => {
            onClose();
            onCreated?.();
          }}
        />
      </div>
    </Dialog>
  );
}
