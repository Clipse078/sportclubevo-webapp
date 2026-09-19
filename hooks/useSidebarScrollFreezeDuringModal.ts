"use client";

import { useLayoutEffect, type RefObject } from "react";
import { attachSidebarScrollFreezeWhileModalOpen } from "@/lib/shell/sidebar-modal-scroll-freeze";

/** Freezes {@link navRef} scroll coordinates while any SCE modal is open. */
export function useSidebarScrollFreezeDuringModal(
  navRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    return attachSidebarScrollFreezeWhileModalOpen(nav);
  }, [navRef]);
}
