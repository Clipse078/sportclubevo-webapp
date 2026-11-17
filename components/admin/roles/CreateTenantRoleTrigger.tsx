"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateTenantRoleInlineCard from "@/components/admin/roles/CreateTenantRoleInlineCard";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/PermissionMatrixFields";

type Props = {
  moduleGroups: PermissionMatrixModuleGroup[];
  actorDelegatablePermissionKeys: readonly string[];
  /** When true, render only the collapsible card (empty state). */
  inlineOnly?: boolean;
};

export default function CreateTenantRoleTrigger({
  moduleGroups,
  actorDelegatablePermissionKeys,
  inlineOnly = false,
}: Props) {
  const [expanded, setExpanded] = useState(inlineOnly);

  if (inlineOnly) {
    return (
      <CreateTenantRoleInlineCard
        expanded={expanded}
        onExpandedChange={setExpanded}
        moduleGroups={moduleGroups}
        actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="fca-button-primary flex items-center gap-2"
        data-sce-create-flow="inline-collapsible"
        data-testid="tenant-role-create-trigger"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neue Rolle
      </button>
      {expanded ? (
        <CreateTenantRoleInlineCard
          expanded={expanded}
          onExpandedChange={setExpanded}
          moduleGroups={moduleGroups}
          actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      ) : null}
    </div>
  );
}