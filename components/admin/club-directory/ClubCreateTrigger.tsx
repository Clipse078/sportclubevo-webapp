"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ClubCreateComposerDialog from "@/components/admin/club-directory/ClubCreateComposerDialog";

type Props = {
  className?: string;
};

export default function ClubCreateTrigger({ className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        data-testid="club-create-trigger"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neuer Verein
      </button>
      <ClubCreateComposerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
