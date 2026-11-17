"use client";

import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import CreateTenantRoleForm from "@/components/admin/roles/CreateTenantRoleForm";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/PermissionMatrixFields";

type Props = {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  moduleGroups: PermissionMatrixModuleGroup[];
  actorDelegatablePermissionKeys: readonly string[];
  onSuccess?: () => void;
};

export default function CreateTenantRoleInlineCard({
  expanded,
  onExpandedChange,
  moduleGroups,
  actorDelegatablePermissionKeys,
  onSuccess,
}: Props) {
  const panelId = "tenant-role-inline-create-panel";

  return (
    <SceClubDevelopmentContextualCreateCollapsibleShell
      actionLabel="Neue Rolle"
      contextLabel="Rollenname, Rechte und Geltungsbereich inline festlegen"
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      panelDomId={panelId}
      cardTestId="tenant-role-inline-create"
      collapseToggleTestId="tenant-role-inline-create-toggle"
    >
      <CreateTenantRoleForm
        moduleGroups={moduleGroups}
        actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
        layout="composer"
        onCancel={() => onExpandedChange(false)}
        onSuccess={() => {
          onExpandedChange(false);
          onSuccess?.();
        }}
      />
    </SceClubDevelopmentContextualCreateCollapsibleShell>
  );
}