"use client";

import { type RefObject, useEffect, useState } from "react";
import {
  measureActivityContentClipping,
  resolveActivityClippedDetailOffer,
  type ActivityClippedDetailGeometry,
} from "@/lib/planning-hub/activity-clipped-detail";

/**
 * Keeps clipped-detail offer in sync with rendered card geometry (ResizeObserver).
 * Scoped to one activity/cluster card — no planner-wide measurement loop.
 */
export function useActivityClippedDetailOffer(
  rootRef: RefObject<HTMLElement | null>,
  geometry: ActivityClippedDetailGeometry,
): boolean {
  const [domOffer, setDomOffer] = useState<boolean | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const measure = () => {
      const clipping = measureActivityContentClipping(node);
      if (clipping.blockWidthPx <= 0 && clipping.blockHeightPx <= 0) {
        return;
      }
      setDomOffer(
        resolveActivityClippedDetailOffer(geometry, {
          blockWidthPx: clipping.blockWidthPx,
          blockHeightPx: clipping.blockHeightPx,
          contentOverflow: clipping.contentOverflow,
        }),
      );
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootRef, geometry.blockWidthPx, geometry.blockHeightPx, geometry.compact, geometry.layoutWidthPx, geometry.layoutHeightPx]);

  if (domOffer !== null) return domOffer;
  return resolveActivityClippedDetailOffer(geometry, null);
}
