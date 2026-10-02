"use client";

import { Sheet } from "@/components/ui/Sheet";
import type { ReactNode } from "react";

export type SportingActivityDetailShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Right-side Activity Detail panel (desktop/tablet); full viewport height on mobile. */
export function SportingActivityDetailShell({
  open,
  onClose,
  title,
  children,
}: SportingActivityDetailShellProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      panelClassName="w-full sm:max-w-[min(680px,100vw)] sm:w-[min(680px,92vw)]"
    >
      {children}
    </Sheet>
  );
}
