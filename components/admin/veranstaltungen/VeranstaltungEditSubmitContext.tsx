"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type VeranstaltungEditSubmitContextValue = {
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
};

const VeranstaltungEditSubmitContext = createContext<VeranstaltungEditSubmitContextValue | null>(
  null,
);

export function VeranstaltungEditSubmitProvider({ children }: { children: ReactNode }) {
  const [submitting, setSubmitting] = useState(false);
  const value = useMemo(
    () => ({
      submitting,
      setSubmitting,
    }),
    [submitting],
  );

  return (
    <VeranstaltungEditSubmitContext.Provider value={value}>
      {children}
    </VeranstaltungEditSubmitContext.Provider>
  );
}

export function useVeranstaltungEditSubmitState(): VeranstaltungEditSubmitContextValue {
  const ctx = useContext(VeranstaltungEditSubmitContext);
  if (!ctx) {
    throw new Error(
      "useVeranstaltungEditSubmitState must be used within VeranstaltungEditSubmitProvider",
    );
  }
  return ctx;
}
