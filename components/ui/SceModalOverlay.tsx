"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { restoreSceBackgroundScrollPositions } from "@/lib/ui/sce-modal-background-scroll";
import {
  applySceModalOpenSideEffects,
  releaseSceModalOpenSideEffects,
} from "@/lib/ui/sce-modal-open-lifecycle";
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
  /** Initial focus target (e.g. dialog title) — focused with preventScroll before background inert. */
  initialFocusRef?: RefObject<HTMLElement | null>;
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
  initialFocusRef,
}: SceModalOverlayProps) {
  /** Client-only portal target — never render overlay inline in the React tree (SCE-RESPONSIVE-01G). */
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const openLifecycleRef = useRef<ReturnType<typeof applySceModalOpenSideEffects> | null>(null);

  useLayoutEffect(() => {
    if (typeof document !== "undefined" && document.body) {
      setPortalTarget(document.body);
    }
  }, []);

  useLayoutEffect(() => {
    if (!open || !portalTarget) return;

    const backgroundRoots = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sce-modal-background]"),
    );

    openLifecycleRef.current = applySceModalOpenSideEffects({
      initialFocusTarget: initialFocusRef?.current,
      backgroundRoots,
    });

    const scrollSnapshot = openLifecycleRef.current.scrollSnapshot;
    const unlockScroll = lockSceDocumentScroll();
    restoreSceBackgroundScrollPositions(scrollSnapshot);

    return () => {
      unlockScroll();
      if (openLifecycleRef.current) {
        releaseSceModalOpenSideEffects({
          backgroundRoots,
          previousFocus: openLifecycleRef.current.previousFocus,
          scrollSnapshot: openLifecycleRef.current.scrollSnapshot,
        });
        openLifecycleRef.current = null;
      }
    };
  }, [open, portalTarget, initialFocusRef]);

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
