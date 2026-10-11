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

type ActivityDirtyNavigationContextValue = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** Returns true when navigation may proceed. */
  confirmNavigationIfDirty: () => boolean;
};

const ActivityDirtyNavigationContext =
  createContext<ActivityDirtyNavigationContextValue | null>(null);

const DEFAULT_CONFIRM_MESSAGE =
  "Es gibt ungespeicherte Änderungen. Möchten Sie den Bereich wirklich wechseln?";

export function ActivityDirtyNavigationProvider({
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
    <ActivityDirtyNavigationContext.Provider value={value}>
      {children}
    </ActivityDirtyNavigationContext.Provider>
  );
}

export function useActivityDirtyNavigation(): ActivityDirtyNavigationContextValue {
  const ctx = useContext(ActivityDirtyNavigationContext);
  if (!ctx) {
    throw new Error(
      "useActivityDirtyNavigation must be used within ActivityDirtyNavigationProvider",
    );
  }
  return ctx;
}

/** Optional hook for workspaces outside the provider (no-op dirty). */
export function useOptionalActivityDirtyNavigation(): ActivityDirtyNavigationContextValue | null {
  return useContext(ActivityDirtyNavigationContext);
}
