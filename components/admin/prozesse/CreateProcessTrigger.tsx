"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateProcessComposerDialog from "@/components/admin/prozesse/CreateProcessComposerDialog";

type Props = { label?: string; className?: string };

export default function CreateProcessTrigger({ label = "Neuer Prozess", className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        data-testid="process-create-trigger"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </button>
      <CreateProcessComposerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
