"use client";

import type { ReactNode, RefObject } from "react";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { SCE_DIALOG_VARIANT_COMPACT } from "@/lib/shell/responsive-layout";
import { cn } from "@/lib/cn";

/** Viewport-capped manipulation editor panel (08-05R9). */
export const PLANNING_HUB_MANIPULATION_MODAL_PANEL = [
  "relative z-10 flex w-full min-w-0 max-w-full flex-col overflow-hidden",
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg",
  "max-h-[var(--sce-dialog-max-height)]",
].join(" ");

export const PLANNING_HUB_MANIPULATION_MODAL_HEADER =
  "shrink-0 border-b border-[var(--border)] px-4 py-3";

export const PLANNING_HUB_MANIPULATION_MODAL_BODY =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3";

export const PLANNING_HUB_MANIPULATION_MODAL_FOOTER =
  "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3";

type Props = {
  testId: string;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Sticky header region (title / context). */
  header?: ReactNode;
  /** Scrollable main content — must not include primary actions. */
  children: ReactNode;
  /** Sticky footer region (Abbrechen / Weiter / apply). */
  footer?: ReactNode;
  /** Applied to the dialog panel wrapper. */
  panelClassName?: string;
};

/**
 * Portalled manipulation editor shell (08-02 / 08-03 / 08-05R9) stacked above SCE workspace dialogs.
 * Three-zone layout: header + scrollable body + sticky action footer inside viewport max-height.
 */
export default function PlanningHubManipulationModalShell({
  testId,
  onClose,
  initialFocusRef,
  header,
  children,
  footer,
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
        aria-modal="true"
        data-testid={`${testId}-modal-panel`}
        className={cn(PLANNING_HUB_MANIPULATION_MODAL_PANEL, SCE_DIALOG_VARIANT_COMPACT, panelClassName)}
      >
        {header !== undefined && header !== null && (
          <div
            data-testid={`${testId}-modal-header`}
            className={PLANNING_HUB_MANIPULATION_MODAL_HEADER}
          >
            {header}
          </div>
        )}
        <div data-testid={`${testId}-modal-body`} className={PLANNING_HUB_MANIPULATION_MODAL_BODY}>
          {children}
        </div>
        {footer !== undefined && footer !== null && (
          <div
            data-testid={`${testId}-modal-footer`}
            className={PLANNING_HUB_MANIPULATION_MODAL_FOOTER}
          >
            {footer}
          </div>
        )}
      </div>
    </SceModalOverlay>
  );
}
