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
  /** @deprecated Initial focus is handled by SceModalOverlay.initialFocusRef (01K). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** @deprecated Focus restore is handled by SceModalOverlay open lifecycle (01K). */
  restoreFocus?: boolean;
};

/**
 * Shared modal focus trap for SCE Dialog primitives.
 * Open/close focus + background aria-hidden ordering lives in {@link SceModalOverlay}.
 */
export function useSceModalDialog({
  open,
  onClose,
  panelRef,
}: UseSceModalDialogOptions): void {
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
