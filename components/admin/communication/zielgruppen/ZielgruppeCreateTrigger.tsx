"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ZielgruppeCreateComposerDialog from "@/components/admin/communication/zielgruppen/ZielgruppeCreateComposerDialog";

type Props = {
  className?: string;
  children?: React.ReactNode;
  "data-testid"?: string;
};

export default function ZielgruppeCreateTrigger({
  className = "inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2",
  children,
  "data-testid": testId = "zielgruppe-create-trigger",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        data-sce-create-flow="modal"
        data-testid={testId}
        onClick={() => setOpen(true)}
      >
        {children ?? (
          <>
            <Plus className="mr-1.5 inline h-4 w-4" aria-hidden />
            Neue Zielgruppe
          </>
        )}
      </button>
      <ZielgruppeCreateComposerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
