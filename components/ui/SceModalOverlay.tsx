"use client";

import { useEffect, useLayoutEffect, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { lockSceDocumentScroll } from "@/lib/ui/sce-modal-scroll-lock";
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
 * SCE dialog portal foundation (SCE-RESPONSIVE-01J):
 * viewport-fixed root → transparent interaction layer → sidebar-aware application
 * viewport (flex center) → panel host. Dialog variant components own max-width/height.
 *
 * Portalled to document.body so admin shell transforms never become the containing block.
 */
export function SceModalOverlay({
  open,
  onBackdropClick,
  children,
  testId,
  contentViewportClassName,
}: SceModalOverlayProps) {
  /** Client-only portal target — never render overlay inline in the React tree (SCE-RESPONSIVE-01G). */
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (typeof document !== "undefined" && document.body) {
      setPortalTarget(document.body);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    return lockSceDocumentScroll();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const backgroundRoots = document.querySelectorAll<HTMLElement>("[data-sce-modal-background]");
    backgroundRoots.forEach((el) => el.setAttribute("inert", ""));

    return () => {
      backgroundRoots.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  if (!open || !portalTarget) return null;

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onBackdropClick?.();
    }
  }

  const overlay = (
    <div
      className={SCE_OVERLAY_ROOT}
      role="presentation"
      data-state="open"
      data-testid={testId}
    >
      <div
        className="sce-modal-overlay-interaction-layer sce-modal-overlay-backdrop"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />
      <div className={cn(SCE_OVERLAY_CONTENT_VIEWPORT, contentViewportClassName)}>
        <div className="sce-modal-overlay-panel-host">{children}</div>
      </div>
    </div>
  );

  return createPortal(overlay, portalTarget);
}
