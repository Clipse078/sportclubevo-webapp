"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
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
 * main content band (respects sidebar width / collapsed state via CSS variables).
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

  return (
    <div
      className={SCE_OVERLAY_ROOT}
      role="presentation"
      data-testid={testId}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[3px]" aria-hidden="true" />
      <div
        className={cn(SCE_OVERLAY_CONTENT_VIEWPORT, contentViewportClassName)}
        onClick={handleBackdropClick}
      >
        {children}
      </div>
    </div>
  );
}
