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
  type RefObject,
} from "react";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import {
  buildMeetingAgendaTimerPresentation,
  deriveMeetingAgendaTimerLifecycle,
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
  MeetingAgendaTimerLifecycle,
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

export type MeetingAgendaTimerOrderedItem = {
  id: string;
  title: string;
  durationMin: number | null;
  owner: string | null;
  position: number;
};

type MeetingAgendaTimerContextValue = {
  scope: MeetingAgendaTimerScope;
  canManage: boolean;
  state: MeetingAgendaTimerState;
  nowMs: number;
  remainingSec: number;
  lifecycle: MeetingAgendaTimerLifecycle;
  presentation: ReturnType<typeof buildMeetingAgendaTimerPresentation>;
  activeItem: AgendaItem | null;
  orderedItems: MeetingAgendaTimerOrderedItem[];
  orderedItemIds: string[];
  focusCardInView: boolean;
  setFocusCardInView: (inView: boolean) => void;
  scrollToFocusCard: () => void;
  focusCardRef: RefObject<HTMLDivElement | null>;
  startMode: () => void;
  endMode: () => void;
  selectTopic: (agendaItemId: string) => void;
  startTimer: (temporaryDurationMin?: number | null) => void;
  startTopicAndTimer: (agendaItemId: string, temporaryDurationMin?: number | null) => void;
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
  const [focusCardInView, setFocusCardInView] = useState(true);
  const liveRegionRef = useRef<HTMLSpanElement | null>(null);
  const focusCardRef = useRef<HTMLDivElement | null>(null);

  const orderedItems = useMemo((): MeetingAgendaTimerOrderedItem[] => {
    return [...agendaItems]
      .sort((a, b) => (displayOrder.get(a.id) ?? 0) - (displayOrder.get(b.id) ?? 0))
      .map((item, idx) => ({
        id: item.id,
        title: item.title,
        durationMin: item.durationMin,
        owner: item.owner,
        position: idx + 1,
      }));
  }, [agendaItems, displayOrder]);

  const orderedItemIds = useMemo(() => orderedItems.map((i) => i.id), [orderedItems]);

  const plannedDurationById = useMemo(() => {
    const map: Record<string, number | null | undefined> = {};
    for (const item of agendaItems) map[item.id] = item.durationMin;
    return map;
  }, [agendaItems]);

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
  const lifecycle = deriveMeetingAgendaTimerLifecycle(state, remainingSec);
  const presentation = buildMeetingAgendaTimerPresentation(remainingSec, lifecycle);

  const activeItem = useMemo(
    () => agendaItems.find((a) => a.id === state.activeAgendaItemId) ?? null,
    [agendaItems, state.activeAgendaItemId],
  );

  useEffect(() => {
    if (!state.chimeEnabled || state.phase !== "running" || !state.activeTopicHasStarted) return;
    if (shouldChimeAt60(state, remainingSec)) {
      playMeetingAgendaTimerChime();
      setState((s) => markChimeMilestone(s, "at60"));
    } else if (shouldChimeAtZero(state, remainingSec)) {
      playMeetingAgendaTimerChime();
      setState((s) => markChimeMilestone(s, "atZero"));
    }
  }, [remainingSec, state]);

  useEffect(() => {
    const message = buildTimerLiveRegionMessage(presentation, activeItem?.title ?? null, lifecycle);
    if (message && liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, [presentation.kind, presentation.display, activeItem?.title, presentation, lifecycle]);

  const commit = useCallback((updater: (s: MeetingAgendaTimerState) => MeetingAgendaTimerState) => {
    setState((s) => updater(s));
    setNowMs(Date.now());
  }, []);

  const scrollToFocusCard = useCallback(() => {
    focusCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectTopicWithPlan = useCallback(
    (id: string) => {
      commit((s) => selectAgendaTopic(s, id, Date.now(), plannedDurationById[id]));
    },
    [commit, plannedDurationById],
  );

  const startTimerForActive = useCallback(
    (temporaryDurationMin?: number | null) => {
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
    [agendaItems, commit],
  );

  const value: MeetingAgendaTimerContextValue = {
    scope,
    canManage,
    state,
    nowMs,
    remainingSec,
    lifecycle,
    presentation,
    activeItem,
    orderedItems,
    orderedItemIds,
    focusCardInView,
    setFocusCardInView,
    scrollToFocusCard,
    focusCardRef,
    resetConfirmOpen,
    startMode: () => commit((s) => startSitzungsmodus(s)),
    endMode: () => commit((s) => endSitzungsmodus(s, Date.now())),
    selectTopic: selectTopicWithPlan,
    startTimer: startTimerForActive,
    startTopicAndTimer: (agendaItemId, temporaryDurationMin) => {
      commit((s) => {
        let next = s.modeActive ? s : startSitzungsmodus(s);
        next = selectAgendaTopic(next, agendaItemId, Date.now(), plannedDurationById[agendaItemId]);
        const item = agendaItems.find((a) => a.id === agendaItemId);
        if (!item) return next;
        const budget = resolveAgendaBudgetSec({
          plannedDurationMin: item.durationMin,
          temporaryDurationMin,
        });
        if (!budget) return next;
        return startAgendaTimer(next, Date.now(), budget);
      });
    },
    pauseTimer: () => commit((s) => pauseAgendaTimer(s, Date.now())),
    resumeTimer: () => commit((s) => resumeAgendaTimer(s, Date.now())),
    extendOneMinute: () => commit((s) => extendAgendaTimerOneMinute(s, Date.now())),
    nextTopic: () =>
      commit((s) => goToNextAgendaTopic(s, orderedItemIds, Date.now(), plannedDurationById)),
    requestReset: () => {
      if (
        state.activeTopicHasStarted &&
        state.budgetSec > 0 &&
        state.remainingAtAnchorSec < state.budgetSec
      ) {
        setResetConfirmOpen(true);
        return;
      }
      commit((s) => resetActiveAgendaTimer(s));
    },
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