"use client";

import type { ReactNode, RefObject } from "react";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { SCE_DIALOG_VARIANT_COMPACT } from "@/lib/shell/responsive-layout";
import { cn } from "@/lib/cn";

type Props = {
  testId: string;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Applied to the dialog panel wrapper (form / confirm card). */
  panelClassName?: string;
};

/**
 * Portalled manipulation editor shell (08-02 / 08-03) stacked above SCE workspace dialogs.
 */
export default function PlanningHubManipulationModalShell({
  testId,
  onClose,
  initialFocusRef,
  children,
  panelClassName,
}: Props) {
  return (
    <SceModalOverlay
      open
      stackLayer="elevated"
      onBackdropClick={onClose}
      testId={testId}
      initialFocusRef={initialFocusRef}
    >
      <div
        role="dialog"
        className={cn(
          SCE_DIALOG_VARIANT_COMPACT,
          "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg",
          panelClassName,
        )}
      >
        {children}
      </div>
    </SceModalOverlay>
  );
}
