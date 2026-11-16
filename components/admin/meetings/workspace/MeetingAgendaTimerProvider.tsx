"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import {
  buildMeetingAgendaTimerPresentation,
  deriveRemainingSec,
  endSitzungsmodus,
  extendAgendaTimerOneMinute,
  goToNextAgendaTopic,
  markChimeMilestone,
  pauseAgendaTimer,
  resetActiveAgendaTimer,
  resolveAgendaBudgetSec,
  resumeAgendaTimer,
  selectAgendaTopic,
  setChimeEnabled,
  shouldChimeAt60,
  shouldChimeAtZero,
  sanitizeTimerStateForAgendaItems,
  startAgendaTimer,
  startSitzungsmodus,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";
import type {
  MeetingAgendaTimerScope,
  MeetingAgendaTimerState,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-types";
import {
  loadMeetingAgendaTimerState,
  saveMeetingAgendaTimerState,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-storage";
import { playMeetingAgendaTimerChime } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-chime";
import { buildTimerLiveRegionMessage } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-a11y";

type AgendaItem = MeetingSubEntities["agendaItems"][number];

type MeetingAgendaTimerContextValue = {
  scope: MeetingAgendaTimerScope;
  canManage: boolean;
  state: MeetingAgendaTimerState;
  nowMs: number;
  remainingSec: number;
  presentation: ReturnType<typeof buildMeetingAgendaTimerPresentation>;
  activeItem: AgendaItem | null;
  orderedItemIds: string[];
  startMode: () => void;
  endMode: () => void;
  selectTopic: (agendaItemId: string) => void;
  startTimer: (temporaryDurationMin?: number | null) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  extendOneMinute: () => void;
  nextTopic: () => void;
  requestReset: () => void;
  confirmReset: () => void;
  cancelReset: () => void;
  resetConfirmOpen: boolean;
  setChime: (enabled: boolean) => void;
};

const MeetingAgendaTimerContext = createContext<MeetingAgendaTimerContextValue | null>(null);

export function useMeetingAgendaTimer(): MeetingAgendaTimerContextValue | null {
  return useContext(MeetingAgendaTimerContext);
}

type Props = {
  scope: MeetingAgendaTimerScope;
  canManage: boolean;
  agendaItems: AgendaItem[];
  displayOrder: Map<string, number>;
  children: ReactNode;
};

export function MeetingAgendaTimerProvider({ scope, canManage, agendaItems, displayOrder, children }: Props) {
  const validIds = useMemo(() => new Set(agendaItems.map((a) => a.id)), [agendaItems]);
  const [state, setState] = useState<MeetingAgendaTimerState>(() =>
    loadMeetingAgendaTimerState(scope, validIds),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const liveRegionRef = useRef<HTMLSpanElement | null>(null);

  const orderedItemIds = useMemo(
    () =>
      [...agendaItems]
        .sort((a, b) => (displayOrder.get(a.id) ?? 0) - (displayOrder.get(b.id) ?? 0))
        .map((i) => i.id),
    [agendaItems, displayOrder],
  );

  useEffect(() => {
    setState(loadMeetingAgendaTimerState(scope, validIds));
  }, [scope.meetingId, scope.tenantId, scope.userId]);

  useEffect(() => {
    setState((s) => sanitizeTimerStateForAgendaItems(s, validIds));
  }, [validIds]);

  useEffect(() => {
    saveMeetingAgendaTimerState(state);
  }, [state]);

  useEffect(() => {
    if (!canManage) {
      setState((s) => (s.modeActive ? endSitzungsmodus(s, Date.now()) : s));
    }
  }, [canManage]);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const id = window.setInterval(tick, 500);
    const onVis = () => {
      if (document.visibilityState === "visible") setNowMs(Date.now());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const remainingSec = deriveRemainingSec(state, nowMs);
  const presentation = buildMeetingAgendaTimerPresentation(remainingSec);

  const activeItem = useMemo(
    () => agendaItems.find((a) => a.id === state.activeAgendaItemId) ?? null,
    [agendaItems, state.activeAgendaItemId],
  );

  useEffect(() => {
    if (!state.chimeEnabled || state.phase !== "running") return;
    if (shouldChimeAt60(state, remainingSec)) {
      playMeetingAgendaTimerChime();
      setState((s) => markChimeMilestone(s, "at60"));
    } else if (shouldChimeAtZero(state, remainingSec)) {
      playMeetingAgendaTimerChime();
      setState((s) => markChimeMilestone(s, "atZero"));
    }
  }, [remainingSec, state]);

  useEffect(() => {
    const message = buildTimerLiveRegionMessage(presentation, activeItem?.title ?? null);
    if (message && liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, [presentation.kind, presentation.display, activeItem?.title, presentation]);

  const commit = useCallback((updater: (s: MeetingAgendaTimerState) => MeetingAgendaTimerState) => {
    setState((s) => updater(s));
    setNowMs(Date.now());
  }, []);

  const value: MeetingAgendaTimerContextValue = {
    scope,
    canManage,
    state,
    nowMs,
    remainingSec,
    presentation,
    activeItem,
    orderedItemIds,
    resetConfirmOpen,
    startMode: () => commit((s) => startSitzungsmodus(s)),
    endMode: () => commit((s) => endSitzungsmodus(s, Date.now())),
    selectTopic: (id) => commit((s) => selectAgendaTopic(s, id, Date.now())),
    startTimer: (temporaryDurationMin) => {
      commit((s) => {
        const item = agendaItems.find((a) => a.id === s.activeAgendaItemId);
        if (!item) return s;
        const budget = resolveAgendaBudgetSec({
          plannedDurationMin: item.durationMin,
          temporaryDurationMin,
        });
        if (!budget) return s;
        return startAgendaTimer(s, Date.now(), budget);
      });
    },
    pauseTimer: () => commit((s) => pauseAgendaTimer(s, Date.now())),
    resumeTimer: () => commit((s) => resumeAgendaTimer(s, Date.now())),
    extendOneMinute: () => commit((s) => extendAgendaTimerOneMinute(s, Date.now())),
    nextTopic: () => commit((s) => goToNextAgendaTopic(s, orderedItemIds, Date.now())),
    requestReset: () => setResetConfirmOpen(true),
    confirmReset: () => {
      setResetConfirmOpen(false);
      commit((s) => resetActiveAgendaTimer(s));
    },
    cancelReset: () => setResetConfirmOpen(false),
    setChime: (enabled) => commit((s) => setChimeEnabled(s, enabled)),
  };

  if (!canManage) {
    return <>{children}</>;
  }

  return (
    <MeetingAgendaTimerContext.Provider value={value}>
      <span ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      {children}
    </MeetingAgendaTimerContext.Provider>
  );
}