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

type ContextDirtyNavigationContextValue = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** Returns true when navigation may proceed. */
  confirmNavigationIfDirty: () => boolean;
};

const ContextDirtyNavigationContext =
  createContext<ContextDirtyNavigationContextValue | null>(null);

const DEFAULT_CONFIRM_MESSAGE =
  "Es gibt ungespeicherte Änderungen. Möchten Sie den Bereich wirklich wechseln?";

/**
 * Shared dirty-state guard for contextual tab navigation (SCE-UI-ROLLOUT-01B).
 */
export function SceContextDirtyGuardProvider({
  children,
  confirmMessage = DEFAULT_CONFIRM_MESSAGE,
}: {
  children: ReactNode;
  confirmMessage?: string;
}) {
  const [isDirty, setDirtyState] = useState(false);
  const messageRef = useRef(confirmMessage);
  messageRef.current = confirmMessage;

  const setDirty = useCallback((dirty: boolean) => {
    setDirtyState(dirty);
  }, []);

  const confirmNavigationIfDirty = useCallback(() => {
    if (!isDirty) {
      return true;
    }
    if (typeof window === "undefined") {
      return true;
    }
    return window.confirm(messageRef.current);
  }, [isDirty]);

  const value = useMemo(
    () => ({
      isDirty,
      setDirty,
      confirmNavigationIfDirty,
    }),
    [confirmNavigationIfDirty, isDirty, setDirty],
  );

  return (
    <ContextDirtyNavigationContext.Provider value={value}>
      {children}
    </ContextDirtyNavigationContext.Provider>
  );
}

export function useContextDirtyNavigation(): ContextDirtyNavigationContextValue {
  const ctx = useContext(ContextDirtyNavigationContext);
  if (!ctx) {
    throw new Error("useContextDirtyNavigation must be used within SceContextDirtyGuardProvider");
  }
  return ctx;
}

export function useOptionalContextDirtyNavigation(): ContextDirtyNavigationContextValue | null {
  return useContext(ContextDirtyNavigationContext);
}
