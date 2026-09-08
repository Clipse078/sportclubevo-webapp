"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/cn";
import {
  applyPanDelta,
  getHeroRenderState,
  nudgePosition,
  type HeroImageTransform,
  type Size2D,
} from "@/lib/dashboard/dashboard-hero-position";

type DashboardHeroBackgroundProps = {
  imageUrl: string;
  transform: HeroImageTransform;
  isEditing: boolean;
  onTransformChange: (transform: HeroImageTransform) => void;
  onMetricsChange?: (metrics: { viewport: Size2D; image: Size2D } | null) => void;
  className?: string;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startTransform: HeroImageTransform;
};

export function DashboardHeroBackground({
  imageUrl,
  transform,
  isEditing,
  onTransformChange,
  onMetricsChange,
  className,
}: DashboardHeroBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<Size2D | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<Size2D>({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const flushPan = useCallback(() => {
    rafRef.current = null;
    const element = containerRef.current;
    const drag = dragRef.current;
    if (!element || !drag || !imageSize || viewportSize.width <= 0) return;

    const delta = pendingDeltaRef.current;
    if (delta.x === 0 && delta.y === 0) return;

    const next = applyPanDelta(viewportSize, imageSize, drag.startTransform, delta);
    onTransformChange(next);
  }, [imageSize, onTransformChange, viewportSize]);

  const schedulePan = useCallback(
    (delta: { x: number; y: number }) => {
      pendingDeltaRef.current = delta;
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(flushPan);
    },
    [flushPan],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!onMetricsChange) return;
    if (!imageSize || viewportSize.width <= 0) {
      onMetricsChange(null);
      return;
    }
    onMetricsChange({ viewport: viewportSize, image: imageSize });
  }, [imageSize, onMetricsChange, viewportSize]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isEditing || !imageSize) return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-hero-editor-control]")) return;

    event.preventDefault();
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTransform: transform,
    };
    pendingDeltaRef.current = { x: 0, y: 0 };
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    schedulePan({
      x: event.clientX - drag.startX,
      y: event.clientY - drag.startY,
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    pendingDeltaRef.current = { x: 0, y: 0 };
    setIsDragging(false);

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      flushPan();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isEditing) return;

    const keyMap: Record<string, "left" | "right" | "up" | "down"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };

    const direction = keyMap[event.key];
    if (direction) {
      event.preventDefault();
      onTransformChange(nudgePosition(transform, direction, event.shiftKey));
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      onTransformChange({
        ...transform,
        zoom: Math.min(2.5, transform.zoom + 0.1),
      });
      return;
    }

    if (event.key === "-") {
      event.preventDefault();
      onTransformChange({
        ...transform,
        zoom: Math.max(1, transform.zoom - 0.1),
      });
    }
  };

  const renderState =
    imageSize && viewportSize.width > 0
      ? getHeroRenderState(viewportSize, imageSize, transform)
      : null;

  const useObjectCoverFallback = !renderState;

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      tabIndex={isEditing ? 0 : -1}
      role={isEditing ? "application" : undefined}
      aria-label={isEditing ? "Titelbild-Editor" : undefined}
      aria-hidden={!isEditing ? true : undefined}
      style={{ touchAction: isEditing ? "none" : undefined }}
      data-hero-editor-surface={isEditing ? "true" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- user-provided dashboard background URL. */}
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        onLoad={handleImageLoad}
        className={cn(
          "pointer-events-none absolute select-none",
          useObjectCoverFallback && "inset-0 h-full w-full object-cover object-center",
          isEditing && !isDragging && "cursor-grab",
          isEditing && isDragging && "cursor-grabbing",
        )}
        style={
          renderState
            ? {
                width: renderState.scaledWidth,
                height: renderState.scaledHeight,
                left: renderState.offset.x,
                top: renderState.offset.y,
                maxWidth: "none",
              }
            : undefined
        }
      />
    </div>
  );
}
