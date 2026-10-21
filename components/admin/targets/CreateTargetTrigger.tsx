"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateTargetComposerDialog from "@/components/admin/targets/CreateTargetComposerDialog";

type Props = { label?: string; className?: string };

export default function CreateTargetTrigger({
  label = "Neues Ziel",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        data-testid="target-create-trigger"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </button>
      <CreateTargetComposerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
