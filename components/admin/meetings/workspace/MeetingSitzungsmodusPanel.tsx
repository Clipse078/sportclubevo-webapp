"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, Clock3, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { normalizeAgendaDurationMin } from "@/lib/meetings/agenda-duration";

const PANEL_ID = "meeting-sitzungsmodus-panel";
const CARD_TEST_ID = "meeting-sitzungsmodus-card";

export function MeetingSitzungsmodusStartButton() {
  const timer = useMeetingAgendaTimer();
  if (!timer || timer.state.modeActive) return null;
  return (
    <button
      type="button"
      className="fca-button-secondary inline-flex items-center gap-2 text-sm"
      onClick={timer.startMode}
      data-testid="meeting-sitzungsmodus-start"
    >
      <Clock3 className="h-4 w-4" aria-hidden />
      Sitzungsmodus starten
    </button>
  );
}

export function MeetingSitzungsmodusPanel() {
  const timer = useMeetingAgendaTimer();
  const [expanded, setExpanded] = useState(true);
  const [tempDuration, setTempDuration] = useState("");

  if (!timer?.state.modeActive) return null;

  const { state, presentation, activeItem, remainingSec } = timer;
  const needsTemp =
    activeItem &&
    (activeItem.durationMin == null || activeItem.durationMin <= 0) &&
    state.phase === "idle" &&
    state.budgetSec === 0;

  const toneClass =
    presentation.kind === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : presentation.kind === "expired"
        ? "border-red-300 bg-red-50 text-red-950"
        : presentation.kind === "overtime"
          ? "border-red-400 bg-red-50 text-red-950"
          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)]";

  return (
    <SceClubDevelopmentContextualCreateCollapsibleShell
      actionLabel="Sitzungsmodus"
      contextLabel={activeItem ? `Traktandum ${activeItem.title}` : "Kein Traktandum gewählt"}
      expanded={expanded}
      onExpandedChange={setExpanded}
      panelDomId={PANEL_ID}
      cardTestId={CARD_TEST_ID}
      collapseToggleTestId="meeting-sitzungsmodus-collapse"
    >
      <div className="space-y-4 p-4" data-testid="meeting-sitzungsmodus-focus">
        <div className={`rounded-xl border px-4 py-5 ${toneClass}`}>
          <MotionSafe className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {activeItem ? `Traktandum ${activeItem.title}` : "Traktandum wählen"}
              </p>
              {activeItem?.owner ? (
                <p className="text-sm opacity-90">Verantwortlich: {activeItem.owner}</p>
              ) : null}
              <p className="text-sm opacity-90">
                Geplant:{" "}
                {activeItem?.durationMin
                  ? `${activeItem.durationMin} min`
                  : state.temporaryDurationSec
                    ? `${Math.round(state.temporaryDurationSec / 60)} min (temporär)`
                    : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {presentation.kind === "warning" ? (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
              ) : null}
              <div className="text-right">
                <p className="text-xs font-medium">{presentation.label}</p>
                <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight" aria-hidden="true">
                  {presentation.display}
                </p>
              </div>
            </div>
          </MotionSafe>
        </div>

        {needsTemp ? (
          <div className="flex flex-wrap items-end gap-2">
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
          </div>
        ) : null}

        <MotionSafe className="flex flex-wrap gap-2">
          {state.phase === "running" ? (
            <button type="button" className="fca-button-secondary inline-flex items-center gap-1.5" onClick={timer.pauseTimer}>
              <Pause className="h-4 w-4" /> Pause
            </button>
          ) : state.phase === "paused" ? (
            <button type="button" className="fca-button-primary inline-flex items-center gap-1.5" onClick={timer.resumeTimer} disabled={!activeItem}>
              <Play className="h-4 w-4" /> Fortsetzen
            </button>
          ) : (
            <button
              type="button"
              className="fca-button-primary inline-flex items-center gap-1.5"
              onClick={() => {
                if (needsTemp) {
                  const min = normalizeAgendaDurationMin(tempDuration);
                  if (!min) return;
                  timer.startTimer(min);
                  return;
                }
                timer.startTimer();
              }}
              disabled={!activeItem}
            >
              <Play className="h-4 w-4" /> Start
            </button>
          )}
          <button type="button" className="fca-button-secondary text-sm" onClick={timer.extendOneMinute}>
            +1 Min.
          </button>
          <button type="button" className="fca-button-secondary inline-flex items-center gap-1.5 text-sm" onClick={timer.nextTopic}>
            <SkipForward className="h-4 w-4" /> Nächstes Traktandum
          </button>
          <button type="button" className="fca-button-secondary inline-flex items-center gap-1.5 text-sm" onClick={timer.requestReset}>
            <RotateCcw className="h-4 w-4" /> Zurücksetzen
          </button>
          <button
            type="button"
            className="fca-button-ghost inline-flex items-center gap-1.5 text-sm"
            onClick={() => timer.setChime(!state.chimeEnabled)}
            aria-pressed={state.chimeEnabled}
          >
            {state.chimeEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Ton {state.chimeEnabled ? "an" : "aus"}
          </button>
          <button type="button" className="fca-button-ghost text-sm text-[var(--muted)]" onClick={timer.endMode}>
            Sitzungsmodus beenden
          </button>
        </MotionSafe>

        {timer.resetConfirmOpen ? (
          <MotionSafe className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" role="alertdialog" aria-labelledby="meeting-timer-reset-title">
            <p id="meeting-timer-reset-title" className="font-medium">Fortschritt zurücksetzen?</p>
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

        <span className="sr-only">
          Verbleibende Sekunden: {Math.round(remainingSec)}
        </span>
      </div>
    </SceClubDevelopmentContextualCreateCollapsibleShell>
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