"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

type CommunicationInboxPaneResizeHandleProps = {
  orientation: "vertical" | "horizontal";
  label: string;
  valueNow: number;
  valueMin: number;
  valueMax: number;
  onResizeDelta: (deltaPx: number) => void;
  onResizeEnd?: () => void;
  /** When true, positive horizontal delta grows the top/left pane. */
  invertDelta?: boolean;
  className?: string;
};

export function CommunicationInboxPaneResizeHandle({
  orientation,
  label,
  valueNow,
  valueMin,
  valueMax,
  onResizeDelta,
  onResizeEnd,
  invertDelta = false,
  className,
}: CommunicationInboxPaneResizeHandleProps) {
  const draggingRef = useRef(false);
  const lastCoordRef = useRef(0);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    draggingRef.current = true;
    lastCoordRef.current = orientation === "vertical" ? event.clientX : event.clientY;
    document.body.style.userSelect = "none";
    document.body.style.cursor = orientation === "vertical" ? "col-resize" : "row-resize";

    function handlePointerMove(moveEvent: PointerEvent) {
      if (!draggingRef.current) return;
      const coord = orientation === "vertical" ? moveEvent.clientX : moveEvent.clientY;
      const delta = coord - lastCoordRef.current;
      lastCoordRef.current = coord;
      onResizeDelta(invertDelta ? -delta : delta);
    }

    function handlePointerUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      onResizeEnd?.();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 24 : 8;
    const vertical = orientation === "vertical";
    if (vertical && event.key === "ArrowLeft") {
      event.preventDefault();
      onResizeDelta(invertDelta ? step : -step);
      onResizeEnd?.();
    } else if (vertical && event.key === "ArrowRight") {
      event.preventDefault();
      onResizeDelta(invertDelta ? -step : step);
      onResizeEnd?.();
    } else if (!vertical && event.key === "ArrowUp") {
      event.preventDefault();
      onResizeDelta(invertDelta ? step : -step);
      onResizeEnd?.();
    } else if (!vertical && event.key === "ArrowDown") {
      event.preventDefault();
      onResizeDelta(invertDelta ? -step : step);
      onResizeEnd?.();
    }
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-valuenow={valueNow}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative z-10 shrink-0 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] motion-reduce:transition-none",
        orientation === "vertical"
          ? "hidden w-2 cursor-col-resize lg:block"
          : "hidden h-2 w-full cursor-row-resize lg:block",
        className,
      )}
      data-testid={
        orientation === "vertical"
          ? "communication-inbox-vertical-resize"
          : "communication-inbox-horizontal-resize"
      }
    >
      <span
        className={cn(
          "absolute bg-[var(--border)] transition group-hover:bg-[var(--blue)] group-focus-visible:bg-[var(--blue)] motion-reduce:transition-none",
          orientation === "vertical"
            ? "inset-y-0 left-1/2 w-px -translate-x-1/2"
            : "inset-x-0 top-1/2 h-px -translate-y-1/2",
        )}
        aria-hidden="true"
      />
    </div>
  );
}
