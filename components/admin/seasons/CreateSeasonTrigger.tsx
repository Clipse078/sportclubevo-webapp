"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateSeasonComposerDialog from "@/components/admin/seasons/CreateSeasonComposerDialog";

type Props = {
  suggestedStartYear: number | null;
};

export default function CreateSeasonTrigger({ suggestedStartYear }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fca-button-primary inline-flex items-center gap-2"
        data-sce-create-flow="modal"
        data-testid="season-create-trigger"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neue Saison
      </button>
      <CreateSeasonComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        suggestedStartYear={suggestedStartYear}
      />
    </>
  );
}
