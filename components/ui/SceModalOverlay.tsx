"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  SCE_OVERLAY_CONTENT_VIEWPORT,
  SCE_OVERLAY_ROOT,
} from "@/lib/shell/responsive-layout";

export type SceModalOverlayProps = {
  open: boolean;
  onBackdropClick?: () => void;
  children: ReactNode;
  /** Optional test id on the root overlay. */
  testId?: string;
  /** Extra classes on the content viewport (centering region). */
  contentViewportClassName?: string;
};

/**
 * Full-screen modal backdrop with panel centering constrained to the authenticated
 * main content band (respects sidebar width / collapsed state via CSS variables on html).
 *
 * Portalled to document.body so shell ancestors cannot alter fixed containing blocks
 * or stacking relative to the persistent sidebar.
 */
export function SceModalOverlay({
  open,
  onBackdropClick,
  children,
  testId,
  contentViewportClassName,
}: SceModalOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onBackdropClick?.();
    }
  }

  const overlay = (
    <div
      className={SCE_OVERLAY_ROOT}
      role="presentation"
      data-testid={testId}
      onClick={handleBackdropClick}
    >
      <div className="sce-modal-overlay-backdrop" aria-hidden="true" />
      <div
        className={cn(SCE_OVERLAY_CONTENT_VIEWPORT, contentViewportClassName)}
        onClick={handleBackdropClick}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
