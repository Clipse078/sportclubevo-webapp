"use client";

import { useState } from "react";
import KampagneCreateComposerDialog, {
  type KampagneComposerBootstrap,
} from "@/components/admin/communication/kampagnen/KampagneCreateComposerDialog";

type Props = KampagneComposerBootstrap & {
  className?: string;
  label?: string;
};

export default function KampagneCreateTrigger({
  className,
  label = "Neue Kampagne",
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
        data-testid="kampagne-create-trigger"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <KampagneCreateComposerDialog open={open} onClose={() => setOpen(false)} {...bootstrap} />
    </>
  );
}
