"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import OrgUnitCreateComposerDialog from "@/components/admin/org/OrgUnitCreateComposerDialog";

type ParentOption = { id: string; key: string; name: string; level: number; type: string };

type Props = {
  parentOptions: ParentOption[];
  defaultParentId?: string;
  label?: string;
  className?: string;
};

export default function OrgUnitCreateTrigger({
  parentOptions,
  defaultParentId,
  label = "Neue Einheit",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState<string | undefined>(defaultParentId);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        data-testid="org-unit-create-trigger"
        onClick={() => {
          setParentId(defaultParentId);
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </button>
      <OrgUnitCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        parentOptions={parentOptions}
        defaultParentId={parentId}
      />
    </>
  );
}

/** Opens create dialog with explicit parent (canvas + affordance). */
export function openOrgUnitCreateForParent(
  setOpen: (v: boolean) => void,
  setParentId: (id: string) => void,
  parentId: string,
) {
  setParentId(parentId);
  setOpen(true);
}
