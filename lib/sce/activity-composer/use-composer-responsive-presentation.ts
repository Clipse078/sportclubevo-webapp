"use client";

import { useEffect, useState } from "react";
import type {
  SceActivityComposerContainerMode,
  SceActivityComposerResolvedPresentation,
} from "./types";

/** Canonical narrow breakpoint — aligned with app/globals.css sidebar collapse at 768px. */
export const SCE_ACTIVITY_COMPOSER_FULLSCREEN_MAX_WIDTH_PX = 768;

export function resolveComposerPresentation(
  containerMode: SceActivityComposerContainerMode,
  viewportWidth: number,
): SceActivityComposerResolvedPresentation {
  if (containerMode === "page") {
    return "page";
  }
  if (viewportWidth <= SCE_ACTIVITY_COMPOSER_FULLSCREEN_MAX_WIDTH_PX) {
    return "fullscreen";
  }
  return "overlay";
}

export function useComposerResponsivePresentation(
  containerMode: SceActivityComposerContainerMode,
): SceActivityComposerResolvedPresentation {
  const [presentation, setPresentation] = useState<SceActivityComposerResolvedPresentation>(() =>
    typeof window === "undefined"
      ? containerMode === "page"
        ? "page"
        : "overlay"
      : resolveComposerPresentation(containerMode, window.innerWidth),
  );

  useEffect(() => {
    if (containerMode === "page") {
      setPresentation("page");
      return;
    }

    function sync() {
      setPresentation(resolveComposerPresentation(containerMode, window.innerWidth));
    }

    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [containerMode]);

  return presentation;
}
