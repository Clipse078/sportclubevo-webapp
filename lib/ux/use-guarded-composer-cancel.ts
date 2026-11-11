"use client";

import { useCallback } from "react";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";
import { useOptionalSceComposerDirtyClose } from "@/components/sce/composer/SceComposerDirtyCloseContext";

/**
 * Invokes {@link proceed} only when dirty-state allows (dialog or confirm).
 */
export function useGuardedComposerCancel() {
  const dirtyClose = useOptionalSceComposerDirtyClose();
  const dirtyNav = useOptionalContextDirtyNavigation();

  return useCallback(
    (proceed: () => void) => {
      if (dirtyClose) {
        dirtyClose.requestClose(proceed);
        return;
      }
      if (!dirtyNav || dirtyNav.confirmNavigationIfDirty()) {
        proceed();
      }
    },
    [dirtyClose, dirtyNav],
  );
}
