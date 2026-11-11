"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SceContextDirtyGuardProvider, useOptionalContextDirtyNavigation } from "@/lib/context-tabs";
import { SCE_ACTIVITY_COMPOSER_CLOSE_CONFIRM_MESSAGE } from "@/lib/sce/activity-composer/use-composer-close-guard";
import { SceUnsavedChangesDialog } from "@/components/sce/composer/SceUnsavedChangesDialog";

type SceComposerDirtyCloseContextValue = {
  requestClose: (proceed: () => void) => void;
};

const SceComposerDirtyCloseContext = createContext<SceComposerDirtyCloseContextValue | null>(null);

export function useOptionalSceComposerDirtyClose(): SceComposerDirtyCloseContextValue | null {
  return useContext(SceComposerDirtyCloseContext);
}

type ProviderProps = {
  children: ReactNode;
  confirmMessage?: string;
};

function SceComposerDirtyCloseInner({ children }: { children: ReactNode }) {
  const dirtyNav = useOptionalContextDirtyNavigation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingProceedRef = useRef<(() => void) | null>(null);

  const requestClose = useCallback(
    (proceed: () => void) => {
      if (!dirtyNav?.isDirty) {
        proceed();
        return;
      }
      pendingProceedRef.current = proceed;
      setDialogOpen(true);
    },
    [dirtyNav?.isDirty],
  );

  const handleContinue = useCallback(() => {
    setDialogOpen(false);
    pendingProceedRef.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    dirtyNav?.setDirty(false);
    setDialogOpen(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    proceed?.();
  }, [dirtyNav]);

  const value = useMemo(() => ({ requestClose }), [requestClose]);

  return (
    <SceComposerDirtyCloseContext.Provider value={value}>
      {children}
      <SceUnsavedChangesDialog
        open={dialogOpen}
        onContinueEditing={handleContinue}
        onDiscard={handleDiscard}
      />
    </SceComposerDirtyCloseContext.Provider>
  );
}

/**
 * Dirty guard for workspace Dialog composers — dialog confirm instead of window.confirm only.
 */
export function SceComposerDirtyCloseProvider({
  children,
  confirmMessage = SCE_ACTIVITY_COMPOSER_CLOSE_CONFIRM_MESSAGE,
}: ProviderProps) {
  return (
    <SceContextDirtyGuardProvider confirmMessage={confirmMessage}>
      <SceComposerDirtyCloseInner>{children}</SceComposerDirtyCloseInner>
    </SceContextDirtyGuardProvider>
  );
}
