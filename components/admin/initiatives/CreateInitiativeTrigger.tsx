"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateInitiativeComposerDialog from "@/components/admin/initiatives/CreateInitiativeComposerDialog";

export default function CreateInitiativeTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        data-testid="initiative-create-trigger"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neue Initiative
      </button>
      <CreateInitiativeComposerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
