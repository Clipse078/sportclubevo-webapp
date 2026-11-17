"use client";

import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import {
  AlertTriangle,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { normalizeAgendaDurationMin } from "@/lib/meetings/agenda-duration";
import { MeetingTraktandumOutcomeActions } from "@/components/admin/meetings/workspace/MeetingTraktandumOutcomeActions";
import { isSitzungsmodusResumable } from "@/lib/meetings/sitzungsmodus/meeting-guided-sitzungsmodus";
import {
  buildGuidedSitzungsmodusSessionSummary,
  type GuidedSitzungsmodusSessionSummary,
} from "@/lib/meetings/sitzungsmodus/meeting-guided-session-summary";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import type { MeetingTraktandumTaskCreateBaseProps } from "@/components/admin/meetings/workspace/MeetingTraktandumAufgabeCreate";
import { MeetingTraktandumAgendaNotes } from "@/components/admin/meetings/workspace/MeetingTraktandumAgendaNotes";

const PANEL_ID = "meeting-sitzungsmodus-panel";
const CARD_TEST_ID = "meeting-sitzungsmodus-card";
const FOCUS_TEST_ID = "meeting-sitzungsmodus-focus";

export function MeetingSitzungsmodusStartButton() {
  const timer = useMeetingAgendaTimer();
  if (!timer || timer.state.modeActive) return null;
  const label = isSitzungsmodusResumable(timer.state)
    ? "Sitzungsmodus fortsetzen"
    : "Sitzungsmodus starten";
  return (
    <button
      type="button"
      className="fca-button-secondary inline-flex items-center gap-2 text-sm"
      onClick={timer.startMode}
      data-testid="meeting-sitzungsmodus-start"
    >
      <Clock3 className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

type AgendaItem = MeetingSubEntities["agendaItems"][number];
type MeetingAction = MeetingSubEntities["actions"][number];
type MeetingDecision = MeetingSubEntities["decisions"][number];

type MeetingSitzungsmodusPanelProps = {
  meetingId?: string;
  meetingSlug?: string;
  meetingTitle?: string;
  agendaItems?: AgendaItem[];
  decisions?: MeetingDecision[];
  actions?: MeetingAction[];
  agendaLinkedTasks?: import("@/lib/meetings/agenda-item-ergebnisse").AgendaLinkedTaskSummary[];
  agendaDisplayOrder?: Map<string, number>;
  onDecisionCreated?: () => void | Promise<void>;
  onActionCreated?: () => void | Promise<void>;
  onAgendaNotesUpdated?: (agendaItemId: string, notes: string) => void;
  onMarkAgendaDiscussed?: (agendaItemId: string) => void | Promise<void>;
  meetingTaskCreate?: MeetingTraktandumTaskCreateBaseProps | null;
  onTaskCreated?: (summary: import("@/lib/meetings/agenda-item-ergebnisse").AgendaLinkedTaskSummary) => void | Promise<void>;
};

export function MeetingSitzungsmodusPanel({
  meetingId,
  meetingSlug = "",
  meetingTitle = "",
  agendaItems = [],
  decisions = [],
  actions = [],
  agendaLinkedTasks = [],
  agendaDisplayOrder,
  onDecisionCreated = async () => {},
  onActionCreated = async () => {},
  onAgendaNotesUpdated = () => {},
  onMarkAgendaDiscussed = async () => {},
  meetingTaskCreate = null,
  onTaskCreated = async () => {},
}: MeetingSitzungsmodusPanelProps = {}) {
  const timer = useMeetingAgendaTimer();
  const [expanded, setExpanded] = useState(true);
  const [tempDuration, setTempDuration] = useState("");
  const [sessionEndSummary, setSessionEndSummary] = useState<GuidedSitzungsmodusSessionSummary | null>(null);
  const [discussedPending, setDiscussedPending] = useState(false);

  useEffect(() => {
    function onReveal() {
      setExpanded(true);
    }
    window.addEventListener("meeting-sitzungsmodus-reveal-focus", onReveal);
    return () => window.removeEventListener("meeting-sitzungsmodus-reveal-focus", onReveal);
  }, []);

  useEffect(() => {
    const el = timer?.focusCardRef.current;
    if (!el || !timer) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) timer.setFocusCardInView(entry.isIntersecting);
      },
      { threshold: 0.12, rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [timer?.state.modeActive, timer]);

  if (!timer?.state.modeActive) return null;

  const { state, presentation, activeItem, remainingSec, lifecycle, orderedItems } = timer;
  const topicCount = orderedItems.length;
  const activePosition = activeItem
    ? (orderedItems.find((i) => i.id === activeItem.id)?.position ?? null)
  : null;

  const plannedMin =
    activeItem?.durationMin ??
    (state.temporaryDurationSec ? Math.round(state.temporaryDurationSec / 60) : null);

  const needsTemp =
    activeItem &&
    (activeItem.durationMin == null || activeItem.durationMin <= 0) &&
    state.budgetSec === 0 &&
    lifecycle !== "running" &&
    lifecycle !== "paused";

  const hasDuration = state.budgetSec > 0 || Boolean(state.temporaryDurationSec);

  const toneClass =
    presentation.kind === "final"
      ? "border-red-200 bg-red-50 text-[var(--foreground)]"
      : lifecycle === "running" || lifecycle === "paused" || lifecycle === "expired"
        ? presentation.kind === "warning"
          ? "border-amber-200 bg-white text-[var(--foreground)]"
          : presentation.kind === "expired" || presentation.kind === "overtime"
            ? "border-red-200 bg-white text-[var(--foreground)]"
            : "border-[var(--border)] bg-white text-[var(--foreground)]"
        : "border-[var(--border)] bg-white text-[var(--foreground)]";

  const countdownToneClass =
    presentation.kind === "warning"
      ? "text-amber-800"
      : presentation.kind === "final"
        ? "text-red-900"
      : presentation.kind === "expired" || presentation.kind === "overtime"
        ? "text-red-700"
        : "text-[var(--foreground)]";

  const contextLine =
    activeItem && activePosition != null
      ? `Traktandum ${activePosition} von ${topicCount}${
          plannedMin ? ` · Geplant: ${plannedMin} Min.` : ""
        }`
      : topicCount > 0
        ? "Traktandum wählen"
        : "Keine Traktanden hinterlegt";

  return (
    <MotionSafe className="w-full min-w-0 flex-[1_1_100%]">
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel="Sitzungsmodus"
        contextLabel={activeItem ? activeItem.title : null}
        expanded={expanded}
        onExpandedChange={setExpanded}
        panelDomId={PANEL_ID}
        cardTestId={CARD_TEST_ID}
        collapseToggleTestId="meeting-sitzungsmodus-collapse"
      >
        <div ref={timer.focusCardRef} className="space-y-3" data-testid={FOCUS_TEST_ID}>
          {lifecycle === "none" && topicCount > 0 ? (
            <div className="space-y-2" data-testid="meeting-sitzungsmodus-topic-select">
              <label className="block text-xs font-semibold text-[var(--muted)]" htmlFor="meeting-sitzungsmodus-topic">
                Traktandum wählen
              </label>
              <select
                id="meeting-sitzungsmodus-topic"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) timer.selectTopic(id);
                }}
              >
                <option value="">— Traktandum auswählen —</option>
                {orderedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                    {item.durationMin ? ` (${item.durationMin} Min.)` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
            <MotionSafe className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <p
                  className="text-xs text-[var(--text-2)]"
                  data-testid="meeting-sitzungsmodus-context-line"
                >
                  {contextLine}
                </p>
                {activeItem ? (
                  <>
                    <p className="text-base font-semibold leading-snug">{activeItem.title}</p>
                    {activeItem.owner ? (
                      <p className="text-sm text-[var(--text-2)]">Verantwortlich: {activeItem.owner}</p>
                    ) : null}
                    {meetingId ? (
                      <div className="pt-2">
                        <MeetingTraktandumAgendaNotes
                          meetingId={meetingId}
                          agendaItemId={activeItem.id}
                          agendaItem={activeItem}
                          canManage
                          testIdPrefix="meeting-sitzungsmodus-focus"
                          onNotesSaved={(notes) => onAgendaNotesUpdated(activeItem.id, notes ?? "")}
                        />
                      </div>
                    ) : null}
                  </>
                ) : lifecycle === "none" ? (
                  <p className="text-sm text-[var(--text-2)]">
                    Wähle ein Traktandum aus der Liste, um die geplante Dauer zu sehen.
                  </p>
                ) : null}
              </div>
              {activeItem && lifecycle !== "none" ? (
                <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                  {presentation.kind === "warning" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                  ) : null}
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-[var(--muted)]">{presentation.label}</p>
                    <p
                      className={`font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl ${countdownToneClass}`}
                      aria-hidden="true"
                      data-testid="meeting-sitzungsmodus-countdown"
                    >
                      {presentation.display}
                    </p>
                  </div>
                </div>
              ) : null}
            </MotionSafe>
          </div>

          {needsTemp ? (
            <MotionSafe className="flex flex-wrap items-end gap-2">
              <label className="block text-xs font-semibold text-[var(--muted)]">
                Temporäre Dauer (Min.)
                <input
                  type="number"
                  min={1}
                  className="mt-1 block w-28 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm"
                  value={tempDuration}
                  onChange={(e) => setTempDuration(e.target.value)}
                />
              </label>
            </MotionSafe>
          ) : null}

          <MotionSafe className="flex flex-wrap items-center gap-2">
            {state.phase === "running" ? (
              <button
                type="button"
                className="fca-button-primary inline-flex items-center gap-1.5"
                onClick={timer.pauseTimer}
                data-testid="meeting-sitzungsmodus-pause"
              >
                <Pause className="h-4 w-4" aria-hidden />
                Pause
              </button>
            ) : state.phase === "paused" ? (
              <button
                type="button"
                className="fca-button-primary inline-flex items-center gap-1.5"
                onClick={timer.resumeTimer}
                disabled={!activeItem}
                data-testid="meeting-sitzungsmodus-resume"
              >
                <Play className="h-4 w-4" aria-hidden />
                Fortsetzen
              </button>
            ) : lifecycle === "ready" || needsTemp ? (
              <button
                type="button"
                className="fca-button-primary inline-flex items-center gap-1.5"
                data-testid="meeting-sitzungsmodus-primary-start"
                onClick={() => {
                  if (needsTemp) {
                    const min = normalizeAgendaDurationMin(tempDuration);
                    if (!min) return;
                    timer.startTimer(min);
                    return;
                  }
                  timer.startTimer();
                }}
                disabled={
                  !activeItem || Boolean(needsTemp && !normalizeAgendaDurationMin(tempDuration))
                }
              >
                <Play className="h-4 w-4" aria-hidden />
                Timer starten
              </button>
            ) : null}

            {hasDuration && lifecycle !== "none" ? (
              <button
                type="button"
                className="fca-button-secondary text-sm"
                onClick={timer.extendOneMinute}
                disabled={!activeItem}
                data-testid="meeting-sitzungsmodus-extend"
              >
                +1 Min.
              </button>
            ) : null}

            {activeItem ? (
              <button
                type="button"
                className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
                onClick={timer.nextTopic}
                disabled={
                  timer.orderedItemIds.indexOf(activeItem.id) >= timer.orderedItemIds.length - 1
                }
                data-testid="meeting-sitzungsmodus-next"
              >
                <SkipForward className="h-4 w-4" aria-hidden />
                Nächstes Traktandum
              </button>
            ) : null}
          </MotionSafe>

          <MotionSafe
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--border)]/60 pt-2 text-sm"
            data-testid="meeting-sitzungsmodus-secondary"
          >
            {activeItem && (lifecycle === "running" || lifecycle === "paused" || lifecycle === "expired") ? (
              <button
                type="button"
                className="fca-button-ghost inline-flex items-center gap-1 text-xs"
                onClick={timer.requestReset}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Zurücksetzen
              </button>
            ) : null}
            <button
              type="button"
              className="fca-button-ghost inline-flex items-center gap-1.5 text-xs"
              onClick={() => timer.setChime(!state.chimeEnabled)}
              aria-pressed={state.chimeEnabled}
              data-testid="meeting-sitzungsmodus-chime"
            >
              {state.chimeEnabled ? <Volume2 className="h-3.5 w-3.5" aria-hidden /> : <VolumeX className="h-3.5 w-3.5" aria-hidden />}
              Ton {state.chimeEnabled ? "an" : "aus"}
            </button>
            <button
              type="button"
              className="fca-button-ghost text-xs text-[var(--muted)]"
              onClick={() => {
                const summary = buildGuidedSitzungsmodusSessionSummary({
                  agendaItems: agendaItems.map((item, idx) => ({
                    id: item.id,
                    title: item.title,
                    status: item.status,
                    position: agendaDisplayOrder?.get(item.id) ?? idx + 1,
                  })),
                  actions: actions.map((action) => ({
                    id: action.id,
                    title: action.title,
                    status: action.status,
                  })),
                });
                if (summary.hasGaps) {
                  setSessionEndSummary(summary);
                  return;
                }
                timer.endMode();
              }}
              data-testid="meeting-sitzungsmodus-end"
            >
              Sitzungsmodus beenden
            </button>
          </MotionSafe>

          {meetingId && activeItem && activePosition != null ? (
            <div className="space-y-3" data-testid="meeting-sitzungsmodus-topic-wrapup">
            <MeetingTraktandumOutcomeActions
              meetingId={meetingId}
              meetingSlug={meetingSlug}
              meetingTitle={meetingTitle}
              agendaItemId={activeItem.id}
              agendaTitle={activeItem.title}
              agendaPosition={activePosition}
              agendaNotes={activeItem.notes ?? null}
              canManage
              testIdPrefix="meeting-sitzungsmodus-focus"
              onDecisionCreated={onDecisionCreated}
              onActionCreated={onActionCreated}
              onTaskCreated={onTaskCreated}
              meetingTaskCreate={meetingTaskCreate}
              decisions={decisions}
              actions={actions}
              agendaLinkedTasks={agendaLinkedTasks}
              onNotesUpdated={(notes) => onAgendaNotesUpdated(activeItem.id, notes)}
            />
              <div className="border-t border-[var(--border)]/60 pt-3 space-y-2" data-testid="meeting-sitzungsmodus-topic-continue">
                <p className="text-xs font-semibold text-[var(--muted)]">Traktandum abschliessen</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="fca-button-secondary text-sm"
                    disabled={timer.orderedItemIds.indexOf(activeItem.id) >= timer.orderedItemIds.length - 1}
                    onClick={() => timer.nextTopic()}
                    data-testid="meeting-sitzungsmodus-continue-without-outcome"
                  >
                    Ohne Ergebnis weiter
                  </button>
                  <button
                    type="button"
                    className="fca-button-primary text-sm"
                    disabled={
                      discussedPending ||
                      timer.orderedItemIds.indexOf(activeItem.id) >= timer.orderedItemIds.length - 1
                    }
                    onClick={async () => {
                      setDiscussedPending(true);
                      try {
                        await onMarkAgendaDiscussed(activeItem.id);
                        timer.nextTopic();
                      } finally {
                        setDiscussedPending(false);
                      }
                    }}
                    data-testid="meeting-sitzungsmodus-mark-discussed-continue"
                  >
                    {discussedPending ? "Wird gespeichert…" : "Als besprochen markieren & weiter"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {sessionEndSummary ? (
            <MotionSafe
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm"
              role="dialog"
              aria-labelledby="meeting-guided-session-summary-title"
              data-testid="meeting-sitzungsmodus-session-summary"
            >
              <p id="meeting-guided-session-summary-title" className="font-semibold text-[var(--foreground)]">
                Sitzungsmodus — Kurzüberblick
              </p>
              {sessionEndSummary.openTopics.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-[var(--muted)]">Offene Traktanden</p>
                  <ul className="list-inside list-disc text-[var(--text-2)]">
                    {sessionEndSummary.openTopics.map((topic) => (
                      <li key={topic.id}>
                        Traktandum {topic.position}: {topic.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {sessionEndSummary.incompleteActions.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-[var(--muted)]">Offene Pendenzen</p>
                  <ul className="list-inside list-disc text-[var(--text-2)]">
                    {sessionEndSummary.incompleteActions.map((action) => (
                      <li key={action.id}>{action.title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <MotionSafe className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="fca-button-primary text-sm"
                  onClick={() => {
                    setSessionEndSummary(null);
                    timer.endMode();
                  }}
                >
                  Sitzungsmodus beenden
                </button>
                <button
                  type="button"
                  className="fca-button-secondary text-sm"
                  onClick={() => setSessionEndSummary(null)}
                >
                  Weiter im Modus
                </button>
              </MotionSafe>
            </MotionSafe>
          ) : null}

          {timer.resetConfirmOpen ? (
            <MotionSafe
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm"
              role="alertdialog"
              aria-labelledby="meeting-timer-reset-title"
            >
              <p id="meeting-timer-reset-title" className="font-medium">
                Fortschritt zurücksetzen?
              </p>
              <p className="mt-1 text-[var(--text-2)]">
                Der Timer für das aktuelle Traktandum wird auf die geplante Dauer zurückgesetzt.
              </p>
              <MotionSafe className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="fca-button-primary text-sm" onClick={timer.confirmReset}>
                  Zurücksetzen bestätigen
                </button>
                <button type="button" className="fca-button-secondary text-sm" onClick={timer.cancelReset}>
                  Abbrechen
                </button>
              </MotionSafe>
            </MotionSafe>
          ) : null}

          <span className="sr-only" data-testid="meeting-sitzungsmodus-lifecycle">
            {lifecycle}
          </span>
          <span className="sr-only">Verbleibende Sekunden: {Math.round(remainingSec)}</span>
        </div>
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </MotionSafe>
  );
}

function MotionSafe({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} data-reduced-motion-safe="true" {...rest}>
      {children}
    </div>
  );
}