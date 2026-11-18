"use client";

import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { normalizeAgendaDurationMin } from "@/lib/meetings/agenda-duration";
import { MeetingTraktandumOutcomeActions } from "@/components/admin/meetings/workspace/MeetingTraktandumOutcomeActions";
import { MEETING_AGENDA_ITEM_STATUS_LABEL } from "@/lib/meetings/agenda-item-presentation";
import type { MeetingSubEntities, MeetingLiveData } from "@/lib/meetings/queries";
import type { MeetingTraktandumTaskCreateBaseProps } from "@/components/admin/meetings/workspace/MeetingTraktandumAufgabeCreate";
import { MeetingTraktandumAgendaNotes } from "@/components/admin/meetings/workspace/MeetingTraktandumAgendaNotes";
import { MEETING_SITZUNGSMODUS_PRIMARY_ACTION_CLASS } from "@/lib/meetings/meeting-sitzungsmodus-primary-action-styles";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import {
  buildSitzungsmodusFocusTimerCaption,
  deriveSitzungsmodusTimerProgressRatio,
  formatAgendaDurationMinLabel,
} from "@/lib/meetings/sitzungsmodus/meeting-sitzungsmodus-focus-presentation";
import { buildAgendaItemErgebnisseRows } from "@/lib/meetings/agenda-item-ergebnisse";
import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";

export const FOCUS_TEST_ID = "meeting-sitzungsmodus-focus";

type AgendaItem = MeetingSubEntities["agendaItems"][number];
type MeetingAction = MeetingSubEntities["actions"][number];
type MeetingDecision = MeetingSubEntities["decisions"][number];

export type MeetingSitzungsmodusFocusExperienceProps = {
  clubName: string;
  meeting: MeetingLiveData;
  meetingSlug: string;
  meetingTitle: string;
  fmtCfg: TenantFormatConfig;
  participantCount: number;
  agendaItems: AgendaItem[];
  decisions: MeetingDecision[];
  actions: MeetingAction[];
  agendaLinkedTasks?: import("@/lib/meetings/agenda-item-ergebnisse").AgendaLinkedTaskSummary[];
  agendaDisplayOrder?: Map<string, number>;
  onDecisionCreated?: () => void | Promise<void>;
  onActionCreated?: () => void | Promise<void>;
  onAgendaNotesUpdated?: (agendaItemId: string, notes: string) => void;
  onMarkAgendaDiscussed?: (agendaItemId: string) => void | Promise<void>;
  meetingTaskCreate?: MeetingTraktandumTaskCreateBaseProps | null;
  onTaskCreated?: (summary: import("@/lib/meetings/agenda-item-ergebnisse").AgendaLinkedTaskSummary) => void | Promise<void>;
  canManage: boolean;
};

function formatMeetingScheduleLine(meeting: MeetingLiveData, fmtCfg: TenantFormatConfig): string | null {
  if (!meeting.meetingDate) return null;
  const start = new Date(meeting.meetingDate);
  const end =
    typeof meeting.plannedDurationMin === "number" && meeting.plannedDurationMin > 0
      ? new Date(start.getTime() + meeting.plannedDurationMin * 60_000)
      : null;
  const timeFmt = new Intl.DateTimeFormat(fmtCfg.locale ?? "de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fmtCfg.timezone ?? "Europe/Zurich",
  });
  const startLabel = timeFmt.format(start);
  if (!end) return startLabel;
  const endLabel = timeFmt.format(end);
  const duration =
    typeof meeting.plannedDurationMin === "number" && meeting.plannedDurationMin > 0
      ? ` · ${meeting.plannedDurationMin} Min.`
      : "";
  return `${startLabel}–${endLabel}${duration}`;
}

export function MeetingSitzungsmodusFocusExperience(props: MeetingSitzungsmodusFocusExperienceProps) {
  const timer = useMeetingAgendaTimer();
  const [tempDuration, setTempDuration] = useState("");
  const [discussedPending, setDiscussedPending] = useState(false);
  const [discussedError, setDiscussedError] = useState<string | null>(null);
  const [agendaMobileOpen, setAgendaMobileOpen] = useState(false);

  const activeItem = timer?.activeItem ?? null;
  const activePosition = activeItem && timer
    ? (timer.orderedItems.find((i) => i.id === activeItem.id)?.position ?? null)
    : null;

  const agendaById = useMemo(() => new Map(props.agendaItems.map((a) => [a.id, a])), [props.agendaItems]);

  const outcomeCount = useMemo(() => {
    if (!activeItem) return 0;
    return buildAgendaItemErgebnisseRows({
      meetingSlug: props.meetingSlug,
      agendaItemId: activeItem.id,
      decisions: props.decisions,
      actions: props.actions,
      tasks: props.agendaLinkedTasks ?? [],
    }).length;
  }, [
    activeItem,
    activePosition,
    props.actions,
    props.agendaLinkedTasks,
    props.decisions,
    props.meeting.id,
    props.meetingSlug,
  ]);

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

  if (!timer?.focusPresentationActive || !timer.state.modeActive) return null;

  const { state, presentation, remainingSec, lifecycle, orderedItems } = timer;
  const topicCount = orderedItems.length;
  const activeIndex = activeItem ? timer.orderedItemIds.indexOf(activeItem.id) : -1;
  const isFinalTopic = activeIndex >= 0 && activeIndex >= timer.orderedItemIds.length - 1;

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
  const progressRatio = deriveSitzungsmodusTimerProgressRatio(state, remainingSec);

  const countdownToneClass =
    presentation.kind === "warning"
      ? "text-amber-800"
      : presentation.kind === "final"
        ? "text-red-900"
        : presentation.kind === "expired" || presentation.kind === "overtime"
          ? "text-red-700"
          : "text-[var(--foreground)]";

  const scheduleLine = formatMeetingScheduleLine(props.meeting, props.fmtCfg);
  const displayMeetingTitle = (props.meetingTitle || props.meeting.title || "").trim();
  const timerCaption = buildSitzungsmodusFocusTimerCaption({
    presentation,
    lifecycle,
    plannedDurationMin: plannedMin,
    topicCount,
    hasActiveTopic: Boolean(activeItem),
  });

  function agendaItemStatusLabel(item: AgendaItem, isActive: boolean): string {
    if (item.status === "DISCUSSED") {
      return `Besprochen · ${formatAgendaDurationMinLabel(item.durationMin)}`;
    }
    if (isActive) {
      const phase =
        lifecycle === "running"
          ? "In Besprechung"
          : lifecycle === "paused"
            ? "Pausiert"
            : lifecycle === "expired"
              ? "Zeit abgelaufen"
              : lifecycle === "ready"
                ? "Bereit"
                : "In Besprechung";
      return `${phase} · ${formatAgendaDurationMinLabel(item.durationMin)}`;
    }
    return `Offen · ${formatAgendaDurationMinLabel(item.durationMin)}`;
  }

  const focusPositionLabel =
    activePosition != null ? `Traktandum ${activePosition} von ${topicCount}` : `Traktanden ${topicCount}`;

  return (
    <div
      className="mx-auto w-full max-w-[1200px] px-3 pb-10 pt-2 sm:px-4 lg:px-6"
      data-testid="meeting-sitzungsmodus-focus-root"
    >
      <header className="mb-4 flex flex-col gap-3 border-b border-[var(--border)]/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {props.clubName ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{props.clubName}</p>
          ) : null}
          {displayMeetingTitle ? (
            <p
              className="text-lg font-semibold text-[var(--foreground)] sm:text-xl"
              data-testid="meeting-sitzungsmodus-focus-meeting-title"
            >
              {displayMeetingTitle}
            </p>
          ) : null}
          {scheduleLine ? (
            <p className="text-sm text-[var(--text-2)]" data-testid="meeting-sitzungsmodus-focus-schedule">
              {scheduleLine}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="fca-button-secondary text-sm"
            onClick={() => timer.setChime(!state.chimeEnabled)}
            aria-pressed={state.chimeEnabled}
            data-testid="meeting-sitzungsmodus-focus-chime"
          >
            {state.chimeEnabled ? <Volume2 className="mr-1.5 inline h-4 w-4" aria-hidden /> : <VolumeX className="mr-1.5 inline h-4 w-4" aria-hidden />}
            Ton {state.chimeEnabled ? "an" : "aus"}
          </button>
          <button
            type="button"
            className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
            onClick={() => {
              timer.exitFocusPresentation();
              window.dispatchEvent(
                new CustomEvent("meeting-workspace-navigate-tab", {
                  detail: { tab: "traktanden" satisfies MeetingWorkspaceTabId },
                }),
              );
              window.requestAnimationFrame(() => {
                document
                  .getElementById("meeting-workspace-section-traktanden")
                  ?.scrollIntoView({ behavior: "auto", block: "start" });
              });
            }}
            data-testid="meeting-sitzungsmodus-exit-focus"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zur Sitzungsübersicht
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <aside className="hidden w-full min-w-[240px] max-w-[280px] shrink-0 rounded-xl border border-[var(--border)] bg-[#f4f7fb] p-3 lg:block">
          <AgendaSidebar
            orderedItems={orderedItems}
            agendaById={agendaById}
            activeItemId={activeItem?.id ?? null}
            activePosition={activePosition}
            topicCount={topicCount}
            onSelectTopic={(id) => timer.selectTopic(id)}
            agendaItemStatusLabel={agendaItemStatusLabel}
            participantCount={props.participantCount}
            scheduleLine={scheduleLine}
          />
        </aside>

        <MotionSafe className="lg:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[#f4f7fb] px-3 py-2 text-sm font-medium"
            aria-expanded={agendaMobileOpen}
            onClick={() => setAgendaMobileOpen((open) => !open)}
            data-testid="meeting-sitzungsmodus-agenda-disclosure"
          >
            <span>{focusPositionLabel}</span>
            <ChevronDown className={`h-4 w-4 transition ${agendaMobileOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {agendaMobileOpen ? (
            <MotionSafe className="mt-2 rounded-xl border border-[var(--border)] bg-[#f4f7fb] p-3">
              <AgendaSidebar
                orderedItems={orderedItems}
                agendaById={agendaById}
                activeItemId={activeItem?.id ?? null}
                activePosition={activePosition}
                topicCount={topicCount}
                onSelectTopic={(id) => {
                  timer.selectTopic(id);
                  setAgendaMobileOpen(false);
                }}
                agendaItemStatusLabel={agendaItemStatusLabel}
                participantCount={props.participantCount}
                scheduleLine={scheduleLine}
              />
            </MotionSafe>
          ) : null}
        </MotionSafe>

        <main className="min-w-0 flex-1">
          <div ref={timer.focusCardRef} className="space-y-4" data-testid={FOCUS_TEST_ID}>
            {!activeItem && topicCount > 0 ? (
              <MotionSafe className="space-y-2 lg:hidden" data-testid="meeting-sitzungsmodus-topic-select">
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
              </MotionSafe>
            ) : null}

            {topicCount === 0 ? (
              <p className="text-sm text-[var(--text-2)]" data-testid="meeting-sitzungsmodus-empty-agenda">
                Keine Traktanden in dieser Sitzung.
              </p>
            ) : null}

            {activeItem ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-2)]">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2 py-0.5">
                    {lifecycle === "expired"
                      ? "Zeit abgelaufen"
                      : lifecycle === "running"
                        ? "In Besprechung"
                        : lifecycle === "paused"
                          ? "Pausiert"
                          : lifecycle === "ready"
                            ? "Bereit"
                            : MEETING_AGENDA_ITEM_STATUS_LABEL[activeItem.status]}
                  </span>
                  <span data-testid="meeting-sitzungsmodus-context-line">{focusPositionLabel}</span>
                </div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">{activeItem.title}</h2>
                {activeItem.owner ? (
                  <p className="text-sm text-[var(--text-2)]">Verantwortlich: {activeItem.owner}</p>
                ) : null}
              </div>
            ) : null}

            {topicCount > 0 && activeItem ? (
            <div
              className="rounded-xl border border-[#d8e3ef] bg-[#eef4fa] px-4 py-4 sm:px-5"
              data-testid="meeting-sitzungsmodus-timer-surface"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  {timerCaption ? (
                    <p className="text-sm text-[var(--text-2)]" data-testid="meeting-sitzungsmodus-timer-caption">
                      {timerCaption}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-2">
                    {presentation.kind === "warning" ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
                    ) : null}
                    <p
                      className={`font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl ${countdownToneClass}`}
                      aria-hidden="true"
                      data-testid="meeting-sitzungsmodus-countdown"
                    >
                      {presentation.display}
                    </p>
                  </div>
                  {hasDuration && lifecycle !== "none" ? (
                    <div
                      className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[#d5e0ea]"
                      role="progressbar"
                      aria-valuenow={Math.round(progressRatio * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      data-testid="meeting-sitzungsmodus-timer-progress"
                    >
                      <div
                        className="h-full rounded-full bg-[#99501F] transition-[width] duration-300"
                        style={{ width: `${Math.round(progressRatio * 100)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                <MotionSafe className="flex flex-wrap gap-2">
                  {state.phase === "running" ? (
                    <button
                      type="button"
                      className={MEETING_SITZUNGSMODUS_PRIMARY_ACTION_CLASS}
                      onClick={timer.pauseTimer}
                      data-testid="meeting-sitzungsmodus-pause"
                    >
                      <Pause className="h-4 w-4" aria-hidden />
                      Pause
                    </button>
                  ) : state.phase === "paused" ? (
                    <button
                      type="button"
                      className={MEETING_SITZUNGSMODUS_PRIMARY_ACTION_CLASS}
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
                      className={MEETING_SITZUNGSMODUS_PRIMARY_ACTION_CLASS}
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
                </MotionSafe>
              </div>

              {needsTemp ? (
                <MotionSafe className="mt-3 flex flex-wrap items-end gap-2">
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
            </div>
            ) : null}

            {props.meeting.id && activeItem ? (
              <MotionSafe>
                <MeetingTraktandumAgendaNotes
                  meetingId={props.meeting.id}
                  agendaItemId={activeItem.id}
                  agendaItem={activeItem}
                  canManage={props.canManage}
                  testIdPrefix="meeting-sitzungsmodus-focus"
                  onNotesSaved={(notes) => props.onAgendaNotesUpdated?.(activeItem.id, notes ?? "")}
                />
              </MotionSafe>
            ) : null}

            {props.meeting.id && activeItem && activePosition != null ? (
              <MotionSafe className="space-y-3" data-testid="meeting-sitzungsmodus-topic-wrapup">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Ergebnisse dieses Traktandums</h3>
                  <p className="text-xs text-[var(--muted)]" data-testid="meeting-sitzungsmodus-outcome-count">
                    {outcomeCount} erfasst
                  </p>
                </div>
                <MeetingTraktandumOutcomeActions
                  meetingId={props.meeting.id}
                  meetingSlug={props.meetingSlug}
                  meetingTitle={props.meetingTitle}
                  agendaItemId={activeItem.id}
                  agendaTitle={activeItem.title}
                  agendaPosition={activePosition}
                  agendaNotes={activeItem.notes ?? null}
                  canManage={props.canManage}
                  testIdPrefix="meeting-sitzungsmodus-focus"
                  onDecisionCreated={props.onDecisionCreated ?? (async () => {})}
                  onActionCreated={props.onActionCreated ?? (async () => {})}
                  onTaskCreated={props.onTaskCreated ?? (async () => {})}
                  meetingTaskCreate={props.meetingTaskCreate ?? null}
                  decisions={props.decisions}
                  actions={props.actions}
                  agendaLinkedTasks={props.agendaLinkedTasks ?? []}
                  onNotesUpdated={(notes) => props.onAgendaNotesUpdated?.(activeItem.id, notes)}
                />

                <MotionSafe
                  className="border-t border-[var(--border)]/60 pt-4 space-y-2"
                  data-testid="meeting-sitzungsmodus-topic-continue"
                >
                  {discussedError ? (
                    <p className="text-sm text-red-700" role="alert">
                      {discussedError}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="fca-button-secondary text-sm"
                      disabled={isFinalTopic}
                      onClick={() => timer.nextTopic()}
                      data-testid="meeting-sitzungsmodus-continue-without-outcome"
                    >
                      Ohne Abschluss weiter →
                    </button>
                    <button
                      type="button"
                      className={MEETING_SITZUNGSMODUS_PRIMARY_ACTION_CLASS}
                      disabled={discussedPending || isFinalTopic}
                      onClick={async () => {
                        setDiscussedError(null);
                        setDiscussedPending(true);
                        try {
                          await props.onMarkAgendaDiscussed?.(activeItem.id);
                          timer.nextTopic();
                        } catch (error) {
                          setDiscussedError(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
                        } finally {
                          setDiscussedPending(false);
                        }
                      }}
                      data-testid="meeting-sitzungsmodus-mark-discussed-continue"
                    >
                      {discussedPending ? "Wird gespeichert…" : "Besprochen & weiter →"}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Abschluss bleibt eine bewusste Aktion, auch nach Ablauf der Zeit.
                  </p>
                  {isFinalTopic ? (
                    <p className="text-xs text-[var(--text-2)]">Letztes Traktandum — kein automatischer Wechsel.</p>
                  ) : null}
                </MotionSafe>
              </MotionSafe>
            ) : null}

            {activeItem && (lifecycle === "running" || lifecycle === "paused" || lifecycle === "expired") ? (
              <MotionSafe
                className="border-t border-[var(--border)]/60 pt-3"
                data-testid="meeting-sitzungsmodus-secondary"
              >
                <button
                  type="button"
                  className="fca-button-ghost inline-flex items-center gap-1 text-xs"
                  onClick={timer.requestReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Zurücksetzen
                </button>
              </MotionSafe>
            ) : null}

            {timer.resetConfirmOpen ? <ResetConfirmDialog timer={timer} /> : null}

            <span className="sr-only" data-testid="meeting-sitzungsmodus-lifecycle">
              {lifecycle}
            </span>
            <span className="sr-only">Verbleibende Sekunden: {Math.round(remainingSec)}</span>
          </div>
        </main>
      </div>
    </div>
  );
}

type AgendaSidebarProps = {
  orderedItems: Array<{ id: string; title: string; durationMin: number | null; position: number }>;
  agendaById: Map<string, AgendaItem>;
  activeItemId: string | null;
  activePosition: number | null;
  topicCount: number;
  onSelectTopic: (id: string) => void;
  agendaItemStatusLabel: (item: AgendaItem, isActive: boolean) => string;
  participantCount: number;
  scheduleLine: string | null;
};

function AgendaSidebar({
  orderedItems,
  agendaById,
  activeItemId,
  activePosition,
  topicCount,
  onSelectTopic,
  agendaItemStatusLabel,
  participantCount,
  scheduleLine,
}: AgendaSidebarProps) {
  return (
    <nav aria-label="Traktanden" className="space-y-3" data-testid="meeting-sitzungsmodus-agenda-sidebar">
      <p className="text-sm font-semibold text-[var(--foreground)]">
        Traktanden {activePosition ?? "—"} von {topicCount}
      </p>
      <ul className="space-y-2">
        {orderedItems.map((row) => {
          const item = agendaById.get(row.id);
          if (!item) return null;
          const isActive = row.id === activeItemId;
          const discussed = item.status === "DISCUSSED";
          return (
            <li key={row.id}>
              <button
                type="button"
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99501F] ${
                  isActive
                    ? "border-[#99501F] bg-white shadow-sm"
                    : "border-transparent bg-white/70 hover:border-[var(--border)]"
                }`}
                onClick={() => onSelectTopic(row.id)}
                data-testid={`meeting-sitzungsmodus-agenda-item-${row.id}`}
                aria-current={isActive ? "step" : undefined}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold text-[var(--muted)]">
                    {discussed ? <Check className="h-4 w-4 text-emerald-700" aria-hidden /> : String(row.position).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--foreground)]">{row.title}</span>
                    <span className="block text-xs text-[var(--text-2)]">{agendaItemStatusLabel(item, isActive)}</span>
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {scheduleLine ? (
        <p className="border-t border-[var(--border)]/60 pt-2 text-xs text-[var(--text-2)]">
          Geplante Sitzung: {scheduleLine}
        </p>
      ) : null}
      <p className="text-xs text-[var(--text-2)]">{participantCount} Teilnehmende</p>
    </nav>
  );
}

function ResetConfirmDialog({ timer }: { timer: NonNullable<ReturnType<typeof useMeetingAgendaTimer>> }) {
  return (
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