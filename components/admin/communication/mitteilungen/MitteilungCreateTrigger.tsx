"use client";

import { useState } from "react";
import MitteilungCreateComposerDialog, {
  type MitteilungComposerBootstrap,
} from "@/components/admin/communication/mitteilungen/MitteilungCreateComposerDialog";

type Props = MitteilungComposerBootstrap & {
  className?: string;
  label?: string;
};

export default function MitteilungCreateTrigger({
  className,
  label = "Neue Mitteilung",
  ...bootstrap
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={
          className ??
          "inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
        }
        data-sce-create-flow="modal"
        data-testid="mitteilung-create-trigger"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <MitteilungCreateComposerDialog open={open} onClose={() => setOpen(false)} {...bootstrap} />
    </>
  );
}
