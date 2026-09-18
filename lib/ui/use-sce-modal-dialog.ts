"use client";

import { useEffect, type RefObject } from "react";
import {
  getSceModalFocusableElements,
  sceFocusWithoutScroll,
} from "@/lib/ui/sce-modal-focus";

export type UseSceModalDialogOptions = {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  /** Preferred initial focus target (e.g. dialog heading). Falls back to panelRef. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Restore focus to the element that was active when the dialog opened. @default true */
  restoreFocus?: boolean;
};

/**
 * Shared modal focus trap + initial/restored focus for SCE Dialog primitives.
 */
export function useSceModalDialog({
  open,
  onClose,
  panelRef,
  initialFocusRef,
  restoreFocus = true,
}: UseSceModalDialogOptions): void {
  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? panelRef.current;
      sceFocusWithoutScroll(target);
    });

    return () => {
      if (!restoreFocus) return;
      sceFocusWithoutScroll(previousFocus);
    };
  }, [open, initialFocusRef, panelRef, restoreFocus]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = getSceModalFocusableElements(panelRef.current);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          sceFocusWithoutScroll(last);
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        sceFocusWithoutScroll(first);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, panelRef]);
}
