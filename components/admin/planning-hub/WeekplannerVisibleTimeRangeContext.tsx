"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultWeekplannerVisibleTimeRange,
  persistWeekplannerVisibleTimeRange,
  readStoredWeekplannerVisibleTimeRange,
  snapMinutesToGrid,
  toVisibleTimeRange,
  validateWeekplannerVisibleTimeRange,
  type WeekplannerVisibleTimeRangePreference,
} from "@/lib/planning-hub/weekplanner-visible-time-range";
import type { VisibleTimeRange } from "@/lib/planning-hub/scheduler/time-scale";

type WeekplannerVisibleTimeRangeContextValue = {
  preference: WeekplannerVisibleTimeRangePreference;
  visibleRange: VisibleTimeRange;
  draft: WeekplannerVisibleTimeRangePreference;
  setDraftStartMinutes: (minutes: number) => void;
  setDraftEndMinutes: (minutes: number) => void;
  saveDraft: () => string | null;
  validationError: string | null;
};

const WeekplannerVisibleTimeRangeContext =
  createContext<WeekplannerVisibleTimeRangeContextValue | null>(null);

export function WeekplannerVisibleTimeRangeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<WeekplannerVisibleTimeRangePreference>(() =>
    defaultWeekplannerVisibleTimeRange(),
  );
  const [draft, setDraft] = useState<WeekplannerVisibleTimeRangePreference>(() =>
    defaultWeekplannerVisibleTimeRange(),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const stored = readStoredWeekplannerVisibleTimeRange();
    setPreference(stored);
    setDraft(stored);
  }, []);

  const visibleRange = useMemo(() => toVisibleTimeRange(preference), [preference]);

  const setDraftStartMinutes = useCallback((startMinutes: number) => {
    setDraft((prev) => ({ ...prev, startMinutes }));
    setValidationError(null);
  }, []);

  const setDraftEndMinutes = useCallback((endMinutes: number) => {
    setDraft((prev) => ({ ...prev, endMinutes }));
    setValidationError(null);
  }, []);

  const saveDraft = useCallback(() => {
    const startMinutes = snapMinutesToGrid(draft.startMinutes);
    const endMinutes = snapMinutesToGrid(draft.endMinutes);
    const error = validateWeekplannerVisibleTimeRange(startMinutes, endMinutes);
    if (error) {
      setValidationError(error);
      return error;
    }
    const persisted = persistWeekplannerVisibleTimeRange({ startMinutes, endMinutes });
    setPreference(persisted);
    setDraft(persisted);
    setValidationError(null);
    return null;
  }, [draft]);

  const value = useMemo(
    () => ({
      preference,
      visibleRange,
      draft,
      setDraftStartMinutes,
      setDraftEndMinutes,
      saveDraft,
      validationError,
    }),
    [
      preference,
      visibleRange,
      draft,
      setDraftStartMinutes,
      setDraftEndMinutes,
      saveDraft,
      validationError,
    ],
  );

  return (
    <WeekplannerVisibleTimeRangeContext.Provider value={value}>
      {children}
    </WeekplannerVisibleTimeRangeContext.Provider>
  );
}

export function useWeekplannerVisibleTimeRange(): WeekplannerVisibleTimeRangeContextValue {
  const ctx = useContext(WeekplannerVisibleTimeRangeContext);
  if (!ctx) {
    throw new Error(
      "useWeekplannerVisibleTimeRange must be used within WeekplannerVisibleTimeRangeProvider",
    );
  }
  return ctx;
}
