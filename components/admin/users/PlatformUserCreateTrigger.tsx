"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import PlatformUserCreateComposerDialog from "@/components/admin/users/PlatformUserCreateComposerDialog";

type Props = {
  className?: string;
};

export default function PlatformUserCreateTrigger({ className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        data-testid="platform-user-create-trigger"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Neuer Benutzer
      </button>
      <PlatformUserCreateComposerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
