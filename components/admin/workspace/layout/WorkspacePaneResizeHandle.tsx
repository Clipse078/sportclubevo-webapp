"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

type WorkspacePaneResizeHandleProps = {
  label: string;
  onResizeDelta: (deltaPx: number) => void;
  onResizeEnd?: () => void;
  /** When true, dragging right increases the pane on the left side of the handle. */
  invertDelta?: boolean;
};

export function WorkspacePaneResizeHandle({
  label,
  onResizeDelta,
  onResizeEnd,
  invertDelta = false,
}: WorkspacePaneResizeHandleProps) {
  const t = useTranslations("Workspace.layout");
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    draggingRef.current = true;
    lastXRef.current = event.clientX;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    function handlePointerMove(moveEvent: PointerEvent) {
      if (!draggingRef.current) return;
      const delta = moveEvent.clientX - lastXRef.current;
      lastXRef.current = moveEvent.clientX;
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
    const step = event.shiftKey ? 32 : 8;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onResizeDelta(invertDelta ? step : -step);
      onResizeEnd?.();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onResizeDelta(invertDelta ? -step : step);
      onResizeEnd?.();
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuetext={t("resizeHandleValue")}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="group relative z-10 hidden w-2 shrink-0 cursor-col-resize touch-none xl:block"
      data-testid="workspace-pane-resize-handle"
    >
      <span
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border)] transition group-hover:bg-[var(--blue)] group-focus-visible:bg-[var(--blue)]"
        aria-hidden="true"
      />
    </div>
  );
}
