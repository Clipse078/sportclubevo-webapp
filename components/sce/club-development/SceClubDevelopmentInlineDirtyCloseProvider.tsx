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
import SceInlineDiscardConfirm from "./SceInlineDiscardConfirm";

type DirtyCloseValue = {
  requestClose: (proceed: () => void) => void;
};

const SceClubDevelopmentInlineDirtyCloseContext = createContext<DirtyCloseValue | null>(null);

const SceInlineDiscardPromptContext = createContext<ReactNode>(null);

export function useOptionalSceClubDevelopmentInlineDirtyClose(): DirtyCloseValue | null {
  return useContext(SceClubDevelopmentInlineDirtyCloseContext);
}

export function useSceInlineDiscardPrompt(): ReactNode {
  return useContext(SceInlineDiscardPromptContext);
}

function InnerProvider({ children }: { children: ReactNode }) {
  const dirtyNav = useOptionalContextDirtyNavigation();
  const pendingProceedRef = useRef<(() => void) | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);

  const requestClose = useCallback(
    (proceed: () => void) => {
      if (!dirtyNav?.isDirty) {
        proceed();
        return;
      }
      pendingProceedRef.current = proceed;
      setShowDiscard(true);
    },
    [dirtyNav?.isDirty],
  );

  const handleContinue = useCallback(() => {
    setShowDiscard(false);
    pendingProceedRef.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    dirtyNav?.setDirty(false);
    setShowDiscard(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    proceed?.();
  }, [dirtyNav]);

  const value = useMemo(() => ({ requestClose }), [requestClose]);

  const discardPrompt = showDiscard ? (
    <SceInlineDiscardConfirm onContinueEditing={handleContinue} onDiscard={handleDiscard} />
  ) : null;

  return (
    <SceClubDevelopmentInlineDirtyCloseContext.Provider value={value}>
      <SceInlineDiscardPromptContext.Provider value={discardPrompt}>
        {children}
      </SceInlineDiscardPromptContext.Provider>
    </SceClubDevelopmentInlineDirtyCloseContext.Provider>
  );
}

/**
 * Dirty close for inline contextual Club Development composers — confirm discard in-card, not modal.
 */
export function SceClubDevelopmentInlineDirtyCloseProvider({ children }: { children: ReactNode }) {
  return (
    <SceContextDirtyGuardProvider>
      <InnerProvider>{children}</InnerProvider>
    </SceContextDirtyGuardProvider>
  );
}