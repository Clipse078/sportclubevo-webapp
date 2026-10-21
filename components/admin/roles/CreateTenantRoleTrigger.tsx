"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateTenantRoleComposerDialog from "@/components/admin/roles/CreateTenantRoleComposerDialog";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/PermissionMatrixFields";

type Props = {
  moduleGroups: PermissionMatrixModuleGroup[];
  actorDelegatablePermissionKeys: readonly string[];
};

export default function CreateTenantRoleTrigger({
  moduleGroups,
  actorDelegatablePermissionKeys,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fca-button-primary flex items-center gap-2"
        data-sce-create-flow="modal"
        data-testid="tenant-role-create-trigger"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neue Rolle
      </button>
      <CreateTenantRoleComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        moduleGroups={moduleGroups}
        actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
      />
    </>
  );
}
