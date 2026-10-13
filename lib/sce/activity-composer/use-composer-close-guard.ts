"use client";

import { useCallback } from "react";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";

export const SCE_ACTIVITY_COMPOSER_CLOSE_CONFIRM_MESSAGE =
  "Es gibt ungespeicherte Änderungen. Möchten Sie den Vorgang wirklich abbrechen?";

/**
 * Reuses canonical dirty guard — no second dirty system.
 */
export function useComposerCloseGuard(onClose: () => void) {
  const dirtyNav = useOptionalContextDirtyNavigation();

  return useCallback(() => {
    if (dirtyNav && !dirtyNav.confirmNavigationIfDirty()) {
      return;
    }
    onClose();
  }, [dirtyNav, onClose]);
}
