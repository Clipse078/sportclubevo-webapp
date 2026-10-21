"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateMeetingComposerDialog from "@/components/admin/meetings/CreateMeetingComposerDialog";

export default function CreateMeetingTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        data-testid="meeting-create-trigger"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neues Meeting
      </button>
      <CreateMeetingComposerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
