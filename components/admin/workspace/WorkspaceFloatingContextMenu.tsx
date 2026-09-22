"use client";

/**
 * WORKSPACE-03 — portal-based context menu (escapes overflow-hidden panes).
 */

import { type ReactNode, useCallback, useEffect } from "react";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";

type WorkspaceFloatingContextMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
};

export function WorkspaceFloatingContextMenu({
  open,
  onOpenChange,
  anchorRef,
  ariaLabel,
  children,
  className = "",
}: WorkspaceFloatingContextMenuProps) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    placement: "bottom-end",
    whileElementsMounted: open ? autoUpdate : undefined,
    middleware: [
      offset(4),
      flip({
        padding: 8,
        fallbackPlacements: ["top-end", "bottom-start", "top-start"],
      }),
      shift({ padding: 8 }),
    ],
  });

  useEffect(() => {
    refs.setReference(anchorRef.current);
  }, [anchorRef, refs, open]);

  const setFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
    },
    [refs],
  );

  const dismiss = useDismiss(context, { outsidePressEvent: "pointerdown" });
  const role = useRole(context, { role: "menu" });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!open) return null;

  return (
    <FloatingPortal>
      <div
        ref={setFloatingRef}
        style={floatingStyles}
        role="menu"
        aria-label={ariaLabel}
        className={`z-[80] w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg ${className}`}
        {...getFloatingProps()}
      >
        {children}
      </div>
    </FloatingPortal>
  );
}
