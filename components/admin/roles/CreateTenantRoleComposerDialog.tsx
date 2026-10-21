"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import CreateTenantRoleForm from "@/components/admin/roles/CreateTenantRoleForm";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/PermissionMatrixFields";

type Props = {
  open: boolean;
  onClose: () => void;
  moduleGroups: PermissionMatrixModuleGroup[];
  actorDelegatablePermissionKeys: readonly string[];
};

export default function CreateTenantRoleComposerDialog({
  open,
  onClose,
  moduleGroups,
  actorDelegatablePermissionKeys,
}: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Rolle"
      description="Dreistufiger Berechtigungs-Composer — ohne die Rollenübersicht zu verlassen."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CreateTenantRoleForm
          moduleGroups={moduleGroups}
          actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
          layout="composer"
          onCancel={onClose}
          onSuccess={(roleId) => {
            onClose();
            if (roleId) {
              router.push(`/dashboard/administration/roles/${roleId}`);
            } else {
              router.refresh();
            }
          }}
        />
      </div>
    </Dialog>
  );
}
