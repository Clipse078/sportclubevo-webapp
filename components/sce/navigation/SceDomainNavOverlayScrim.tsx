"use client";

import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { resolveDomainNavOverlayAnchorBottom } from "@/lib/nav/sce-domain-nav-overlay-geometry";

type Props = {
  open: boolean;
  headerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

/**
 * SCE-CD-04R3 — subtle page scrim beneath the open domain mega-menu (header stays bright).
 */
export function SceDomainNavOverlayScrim({ open, headerRef, onClose }: Props) {
  const scrimRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const el = scrimRef.current;
    if (!el) return;

    const applyTop = () => {
      const top = resolveDomainNavOverlayAnchorBottom(headerRef.current);
      el.style.top = `${top}px`;
    };

    applyTop();
    window.addEventListener("resize", applyTop);
    window.visualViewport?.addEventListener("resize", applyTop);
    return () => {
      window.removeEventListener("resize", applyTop);
      window.visualViewport?.removeEventListener("resize", applyTop);
    };
  }, [headerRef, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={scrimRef}
      className="sce-domain-nav-overlay-scrim"
      data-testid="sce-domain-nav-overlay-scrim"
      data-sce-domain-nav-scrim=""
      onPointerDown={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-hidden
    />,
    document.body,
  );
}