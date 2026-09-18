"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { applyShellLayoutVarsToDocument } from "@/lib/shell/shell-layout-vars";
import {
  clampSidebarWidth,
  persistSidebarWidth,
  readStoredSidebarWidth,
} from "@/lib/shell/sidebar-width";

type UseSidebarResizeOptions = {
  collapsed: boolean;
};

export function useSidebarResize({ collapsed }: UseSidebarResizeOptions) {
  const [width, setWidth] = useState(() => readStoredSidebarWidth());
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);

  useLayoutEffect(() => {
    widthRef.current = width;
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: width,
      collapsed,
    });
  }, [width, collapsed]);

  useEffect(() => {
    function onResize() {
      applyShellLayoutVarsToDocument({
        sidebarWidthPx: widthRef.current,
        collapsed,
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [collapsed]);

  const applyWidth = useCallback((nextWidth: number) => {
    const clamped = clampSidebarWidth(nextWidth);
    widthRef.current = clamped;
    setWidth(clamped);
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: clamped,
      collapsed,
    });
  }, [collapsed]);

  const startResize = useCallback(
    (clientX: number) => {
      if (collapsed) return;
      setIsResizing(true);

      const onMove = (event: MouseEvent) => {
        event.preventDefault();
        applyWidth(event.clientX);
      };

      const onUp = () => {
        setIsResizing(false);
        persistSidebarWidth(widthRef.current);
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      applyWidth(clientX);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [applyWidth, collapsed],
  );

  const onResizePointerDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (collapsed) return;
      event.preventDefault();
      startResize(event.clientX);
    },
    [collapsed, startResize],
  );

  const onResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (collapsed) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        applyWidth(widthRef.current - 8);
        persistSidebarWidth(widthRef.current);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        applyWidth(widthRef.current + 8);
        persistSidebarWidth(widthRef.current);
      }
    },
    [applyWidth, collapsed],
  );

  return {
    width,
    isResizing,
    onResizePointerDown,
    onResizeKeyDown,
  };
}
