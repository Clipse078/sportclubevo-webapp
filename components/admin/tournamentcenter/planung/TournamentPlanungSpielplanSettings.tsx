"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  TournamentPlanungFixtureHomeAwayRelevance,
  TournamentPlanungPitchColumn,
  TournamentPlanungSchedulingBreak,
  TournamentPlanungSchedulingSettings,
  TournamentPlanungTimingConsequence,
  TournamentPlanungViewModel,
} from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";
import { usePlanungScheduleMutationQueue } from "@/lib/tournaments/planung/use-planung-schedule-mutation-queue";
import TournamentPlanungPitchFormatSettings from "./TournamentPlanungPitchFormatSettings";

const TIMING_DEBOUNCE_MS = 450;

type Props = {
  tournamentId: string;
  model: TournamentPlanungViewModel;
  pitches: readonly TournamentPlanungPitchColumn[];
  settings: TournamentPlanungSchedulingSettings;
  timingConsequence: TournamentPlanungTimingConsequence;
  canManage: boolean;
  onModelChange: (viewModel: TournamentPlanungViewModel) => void;
  onError: (message: string) => void;
  onScheduleSyncChange?: (pending: boolean) => void;
  onApplyRecommendedTiming?: () => void;
};

type BreakDraft = {
  label: string;
  startLocalTime: string;
  durationMinutes: number;
  scope: "ALL_PITCHES" | "SELECTED_PITCHES";
  selectedPitchIds: string[];
  fieldSelectionAdvanced: boolean;
};

type TimingDraft = {
  matchDurationMinutes: number;
  transitionMinutes: number;
  fixtureHomeAwayRelevance: TournamentPlanungFixtureHomeAwayRelevance;
};

function breakToDraft(br: TournamentPlanungSchedulingBreak): BreakDraft {
  return {
    label: br.label,
    startLocalTime: br.startLocalTime,
    durationMinutes: br.durationMinutes,
    scope: br.scope,
    selectedPitchIds: [...br.tournamentPitchIds],
    fieldSelectionAdvanced: br.scope === "SELECTED_PITCHES",
  };
}

function emptyBreakDraft(): BreakDraft {
  return {
    label: "Pause",
    startLocalTime: "",
    durationMinutes: 15,
    scope: "ALL_PITCHES",
    selectedPitchIds: [],
    fieldSelectionAdvanced: false,
  };
}

function draftPayload(draft: BreakDraft) {
  const scope =
    draft.fieldSelectionAdvanced && draft.selectedPitchIds.length > 0
      ? "SELECTED_PITCHES"
      : "ALL_PITCHES";
  return {
    label: draft.label,
    startLocalTime: draft.startLocalTime,
    durationMinutes: draft.durationMinutes,
    scope,
    tournamentPitchIds: scope === "SELECTED_PITCHES" ? draft.selectedPitchIds : undefined,
  };
}

function timingDraftFromSettings(settings: TournamentPlanungSchedulingSettings): TimingDraft {
  return {
    matchDurationMinutes: settings.matchDurationMinutes,
    transitionMinutes: settings.transitionMinutes,
    fixtureHomeAwayRelevance: settings.fixtureHomeAwayRelevance,
  };
}

function timingDraftDirty(draft: TimingDraft, persisted: TournamentPlanungSchedulingSettings): boolean {
  return (
    draft.matchDurationMinutes !== persisted.matchDurationMinutes ||
    draft.transitionMinutes !== persisted.transitionMinutes ||
    draft.fixtureHomeAwayRelevance !== persisted.fixtureHomeAwayRelevance
  );
}

export default function TournamentPlanungSpielplanSettings({
  tournamentId,
  model,
  pitches,
  settings,
  timingConsequence,
  canManage,
  onModelChange,
  onError,
  onScheduleSyncChange,
  onApplyRecommendedTiming,
}: Props) {
  const [timingDraft, setTimingDraft] = useState<TimingDraft>(() => timingDraftFromSettings(settings));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"none" | "add" | { editId: string }>("none");
  const [breakDraft, setBreakDraft] = useState<BreakDraft>(emptyBreakDraft());
  const [breakSavePending, setBreakSavePending] = useState(false);
  const [scheduleSyncPending, setScheduleSyncPending] = useState(false);

  const homeAwayCommitSkipRef = useRef(true);
  const scheduleRevisionRef = useRef(model.scheduleRevision);
  const scheduleVersionIdRef = useRef(model.scheduleVersionId);
  const timingDraftRef = useRef(timingDraft);
  const settingsRef = useRef(settings);

  scheduleRevisionRef.current = model.scheduleRevision;
  scheduleVersionIdRef.current = model.scheduleVersionId;
  timingDraftRef.current = timingDraft;
  settingsRef.current = settings;

  const { enqueueScheduleMutation } = usePlanungScheduleMutationQueue({
    tournamentId,
    getScheduleVersionId: () => scheduleVersionIdRef.current,
    getScheduleRevision: () => scheduleRevisionRef.current,
    onScheduleRevisionChange: (revision, versionId) => {
      scheduleRevisionRef.current = revision;
      if (versionId) scheduleVersionIdRef.current = versionId;
    },
    onModelChange,
    onError: (message) => {
      setSyncError(message);
      onError(message);
    },
    onPendingChange: (pending) => {
      setScheduleSyncPending(pending);
      onScheduleSyncChange?.(pending);
    },
  });

  useEffect(() => {
    setTimingDraft(timingDraftFromSettings(settings));
    setSyncError(null);
    homeAwayCommitSkipRef.current = true;
  }, [
    settings.matchDurationMinutes,
    settings.transitionMinutes,
    settings.fixtureHomeAwayRelevance,
  ]);

  const timingDirty = useMemo(
    () => timingDraftDirty(timingDraft, settings),
    [settings, timingDraft],
  );

  const commitTimingSettings = useCallback(() => {
    if (!canManage || !scheduleVersionIdRef.current) return;
    if (!timingDraftDirty(timingDraftRef.current, settingsRef.current)) return;

    setSyncError(null);
    enqueueScheduleMutation(async (expectedRevision) => {
      let revision = expectedRevision;
      for (let pass = 0; pass < 12; pass += 1) {
        const intent = timingDraftRef.current;
        const persisted = settingsRef.current;
        if (!scheduleVersionIdRef.current) {
          return { ok: false, status: 400, error: "Einstellungen konnten nicht gespeichert werden." };
        }
        if (!timingDraftDirty(intent, persisted)) {
          return { ok: true, status: 200 };
        }

        const res = await fetch(`/api/tournaments/${tournamentId}/planung/scheduling-config`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleVersionId: scheduleVersionIdRef.current,
            expectedRevision: revision,
            matchDurationMinutes: intent.matchDurationMinutes,
            transitionMinutes: intent.transitionMinutes,
            fixtureHomeAwayRelevance: intent.fixtureHomeAwayRelevance,
          }),
        });
        const json = (await res.json()) as {
          viewModel?: TournamentPlanungViewModel;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            error: json.error,
            code: json.code,
            viewModel: json.viewModel,
          };
        }
        if (json.viewModel) {
          settingsRef.current = json.viewModel.schedulingSettings ?? persisted;
          revision = json.viewModel.scheduleRevision ?? revision;
        }
        if (!timingDraftDirty(timingDraftRef.current, settingsRef.current)) {
          return { ok: true, status: 200, viewModel: json.viewModel };
        }
      }
      return { ok: false, status: 500, error: "Einstellungen konnten nicht gespeichert werden." };
    });
  }, [canManage, enqueueScheduleMutation, tournamentId]);

  useEffect(() => {
    if (!canManage || !timingDirty) return;
    const onlyHomeAwayChanged =
      timingDraft.matchDurationMinutes === settings.matchDurationMinutes &&
      timingDraft.transitionMinutes === settings.transitionMinutes &&
      timingDraft.fixtureHomeAwayRelevance !== settings.fixtureHomeAwayRelevance;
    if (onlyHomeAwayChanged) {
      if (homeAwayCommitSkipRef.current) return;
      commitTimingSettings();
      return;
    }

    const handle = window.setTimeout(() => {
      commitTimingSettings();
    }, TIMING_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [
    canManage,
    commitTimingSettings,
    settings.fixtureHomeAwayRelevance,
    settings.matchDurationMinutes,
    settings.transitionMinutes,
    timingDirty,
    timingDraft.fixtureHomeAwayRelevance,
    timingDraft.matchDurationMinutes,
    timingDraft.transitionMinutes,
  ]);

  const flushTimingOnBoundary = useCallback(() => {
    if (!timingDirty) return;
    commitTimingSettings();
  }, [commitTimingSettings, timingDirty]);

  const saveBreak = useCallback(() => {
    if (!canManage || !scheduleVersionIdRef.current) return;
    setBreakSavePending(true);
    const payload = {
      ...draftPayload(breakDraft),
      scheduleVersionId: scheduleVersionIdRef.current,
    };
    const isEdit = editorMode !== "none" && editorMode !== "add";
    enqueueScheduleMutation(async (expectedRevision) => {
      try {
        const res = await fetch(
          isEdit
            ? `/api/tournaments/${tournamentId}/planung/breaks/${editorMode.editId}`
            : `/api/tournaments/${tournamentId}/planung/breaks`,
          {
            method: isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              expectedRevision,
            }),
          },
        );
        const json = (await res.json()) as {
          viewModel?: TournamentPlanungViewModel;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            error: json.error ?? "Pause konnte nicht gespeichert werden.",
            code: json.code,
            viewModel: json.viewModel,
          };
        }
        setEditorMode("none");
        setBreakDraft(emptyBreakDraft());
        return { ok: true, status: 200, viewModel: json.viewModel };
      } catch {
        return { ok: false, status: 500, error: "Pause konnte nicht gespeichert werden." };
      } finally {
        setBreakSavePending(false);
      }
    });
  }, [breakDraft, canManage, editorMode, enqueueScheduleMutation, tournamentId]);

  const deleteBreak = useCallback(
    (breakId: string, label: string) => {
      if (!canManage || !scheduleVersionIdRef.current) return;
      const confirmed = window.confirm(`Pause „${label}“ wirklich löschen?`);
      if (!confirmed) return;
      setBreakSavePending(true);
      enqueueScheduleMutation(async (expectedRevision) => {
        try {
          const res = await fetch(`/api/tournaments/${tournamentId}/planung/breaks/${breakId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduleVersionId: scheduleVersionIdRef.current,
              expectedRevision,
            }),
          });
          const json = (await res.json()) as {
            viewModel?: TournamentPlanungViewModel;
            error?: string;
            code?: string;
          };
          if (!res.ok) {
            return {
              ok: false,
              status: res.status,
              error: json.error ?? "Pause konnte nicht gelöscht werden.",
              code: json.code,
              viewModel: json.viewModel,
            };
          }
          if (editorMode !== "none" && editorMode !== "add" && editorMode.editId === breakId) {
            setEditorMode("none");
          }
          return { ok: true, status: 200, viewModel: json.viewModel };
        } catch {
          return { ok: false, status: 500, error: "Pause konnte nicht gelöscht werden." };
        } finally {
          setBreakSavePending(false);
        }
      });
    },
    [canManage, editorMode, enqueueScheduleMutation, tournamentId],
  );

  const showEditor = editorMode !== "none";

  const derivedEndLabel = useMemo(() => {
    if (!breakDraft.startLocalTime) return "—";
    const [h, m] = breakDraft.startLocalTime.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return "—";
    const total = h * 60 + m + breakDraft.durationMinutes;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  }, [breakDraft.durationMinutes, breakDraft.startLocalTime]);

  return (
    <section
      className={cn(SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS, "space-y-4 p-4 md:p-5")}
      data-testid="tournament-planung-spielplan-settings"
      aria-label="Spielplan-Einstellungen"
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Spielplan-Einstellungen</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--muted)]">Spieldauer</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className="fca-input w-24"
              value={timingDraft.matchDurationMinutes}
              disabled={!canManage}
              aria-label="Spieldauer in Minuten"
              data-testid="planung-match-duration"
              onChange={(e) =>
                setTimingDraft((d) => ({ ...d, matchDurationMinutes: Number(e.target.value) }))
              }
              onBlur={() => flushTimingOnBoundary()}
              onKeyDown={(e) => {
                if (e.key === "Enter") flushTimingOnBoundary();
              }}
            />
            <span className="text-sm text-[var(--muted)]">Min.</span>
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--muted)]">Wechselzeit</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              className="fca-input w-24"
              value={timingDraft.transitionMinutes}
              disabled={!canManage}
              aria-label="Wechselzeit in Minuten"
              data-testid="planung-transition-duration"
              onChange={(e) =>
                setTimingDraft((d) => ({ ...d, transitionMinutes: Number(e.target.value) }))
              }
              onBlur={() => flushTimingOnBoundary()}
              onKeyDown={(e) => {
                if (e.key === "Enter") flushTimingOnBoundary();
              }}
            />
            <span className="text-sm text-[var(--muted)]">Min.</span>
          </span>
        </label>
      </div>

      <div
        className="space-y-2 rounded-lg border border-[var(--border)] p-3"
        data-testid="planung-home-away-relevance"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Heim-/Auswärtsspiele
        </p>
        <SwitchToggle
          id="planung-fixture-home-away-relevance"
          label="Heim- und Auswärtsseiten berücksichtigen"
          checked={timingDraft.fixtureHomeAwayRelevance === "ON"}
          disabled={!canManage}
          onChange={(checked) => {
            homeAwayCommitSkipRef.current = false;
            setTimingDraft((d) => ({
              ...d,
              fixtureHomeAwayRelevance: checked ? "ON" : "OFF",
            }));
          }}
        />
        <p className="text-xs text-[var(--text-2)]">
          {timingDraft.fixtureHomeAwayRelevance === "ON"
            ? "Jede Paarung wird als Hin- und Rückspiel ausgetragen."
            : "Jede Paarung wird einmal neutral ausgelost — ohne Hin- und Rückrunde."}
        </p>
      </div>

      {syncError ? (
        <p className="text-sm text-[var(--sce-danger)]" role="alert">
          {syncError}
        </p>
      ) : null}

      <TournamentPlanungPitchFormatSettings
        tournamentId={tournamentId}
        pitches={pitches}
        canManage={canManage}
        onSaved={onModelChange}
        onError={onError}
      />

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Pausen & Sperrzeiten
        </p>
        <ul className="space-y-2">
          {settings.breaks.map((br) => (
            <li
              key={br.breakId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
              data-testid={`planung-break-row-${br.breakId}`}
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium text-[var(--foreground)]">
                  {br.label} · {br.timeRangeLabel}
                </p>
                <p className="text-xs text-[var(--muted)]">{br.scopeLabel}</p>
              </div>
              {canManage ? (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={breakSavePending || scheduleSyncPending}
                    data-testid={`planung-break-edit-${br.breakId}`}
                    onClick={() => {
                      setEditorMode({ editId: br.breakId });
                      setBreakDraft(breakToDraft(br));
                    }}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={breakSavePending || scheduleSyncPending}
                    aria-label={`Pause ${br.label} löschen`}
                    data-testid={`planung-break-delete-${br.breakId}`}
                    onClick={() => void deleteBreak(br.breakId, br.label)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {canManage && !showEditor ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sce-primary)]"
            data-testid="planung-break-add"
            disabled={breakSavePending || scheduleSyncPending}
            onClick={() => {
              setEditorMode("add");
              setBreakDraft(emptyBreakDraft());
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Pause hinzufügen
          </button>
        ) : null}

        {canManage && showEditor ? (
          <div
            className="space-y-3 rounded-xl border border-[var(--border)] p-4"
            data-testid="planung-break-editor"
          >
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted)]">Bezeichnung</span>
              <input
                type="text"
                className="fca-input w-full"
                value={breakDraft.label}
                onChange={(e) => setBreakDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Startzeit</span>
                <input
                  type="time"
                  className="fca-input w-full"
                  value={breakDraft.startLocalTime}
                  data-testid="planung-break-start"
                  onChange={(e) =>
                    setBreakDraft((d) => ({ ...d, startLocalTime: e.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Dauer</span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="fca-input w-full"
                    value={breakDraft.durationMinutes}
                    data-testid="planung-break-duration"
                    onChange={(e) =>
                      setBreakDraft((d) => ({ ...d, durationMinutes: Number(e.target.value) }))
                    }
                  />
                  <span className="text-sm text-[var(--muted)]">Min.</span>
                </span>
              </label>
            </div>
            <p className="text-xs text-[var(--text-2)]" data-testid="planung-break-derived-range">
              {breakDraft.startLocalTime
                ? `${breakDraft.startLocalTime}–${derivedEndLabel}`
                : "Startzeit wählen"}
            </p>

            <SwitchToggle
              id="planung-break-field-scope-toggle"
              label="Nur bestimmte Felder sperren"
              checked={breakDraft.fieldSelectionAdvanced}
              disabled={breakSavePending}
              onChange={(checked) =>
                setBreakDraft((d) => ({
                  ...d,
                  fieldSelectionAdvanced: checked,
                  scope: checked ? "SELECTED_PITCHES" : "ALL_PITCHES",
                  selectedPitchIds:
                    checked && d.selectedPitchIds.length === 0
                      ? pitches.slice(0, 1).map((p) => p.pitchId)
                      : d.selectedPitchIds,
                }))
              }
            />

            {breakDraft.fieldSelectionAdvanced ? (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Turnierfelder für Sperrzeit"
                data-testid="planung-break-pitch-select"
              >
                {pitches.map((pitch) => {
                  const selected = breakDraft.selectedPitchIds.includes(pitch.pitchId);
                  return (
                    <button
                      key={pitch.pitchId}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        selected
                          ? "border-[var(--sce-primary)] bg-[var(--sce-primary-soft)] text-[var(--foreground)]"
                          : "border-[var(--border)] text-[var(--text-2)]",
                      )}
                      onClick={() =>
                        setBreakDraft((d) => {
                          const ids = new Set(d.selectedPitchIds);
                          if (ids.has(pitch.pitchId)) ids.delete(pitch.pitchId);
                          else ids.add(pitch.pitchId);
                          return { ...d, selectedPitchIds: [...ids] };
                        })
                      }
                    >
                      {pitch.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={breakSavePending} onClick={() => void saveBreak()}>
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={breakSavePending}
                onClick={() => {
                  setEditorMode("none");
                  setBreakDraft(emptyBreakDraft());
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {timingConsequence?.status === "NEEDS_REGENERATION" ? (
        <div
          className="rounded-lg border border-[var(--sce-warning)]/50 bg-[var(--sce-warning-soft)] px-3 py-3 text-sm"
          data-testid="planung-timing-consequence"
          role="alert"
          aria-live="polite"
        >
          <p className="font-medium text-[var(--foreground)]">{timingConsequence.headline}</p>
          {timingConsequence.recommendedTiming ? (
            <div className="mt-2 space-y-2">
              <p className="text-[var(--foreground)]">SCE empfiehlt:</p>
              <p
                className="font-medium tabular-nums text-[var(--foreground)]"
                data-testid="planung-timing-recommended"
              >
                {timingConsequence.recommendedTiming.matchDurationMinutes} Min. Spielzeit ·{" "}
                {timingConsequence.recommendedTiming.transitionMinutes} Min. Wechselzeit
              </p>
              {onApplyRecommendedTiming ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={scheduleSyncPending}
                  data-testid="planung-timing-apply-recommended"
                  onClick={() => onApplyRecommendedTiming()}
                >
                  Empfehlung übernehmen
                </Button>
              ) : null}
            </div>
          ) : timingConsequence.structuralHint ? (
            <p className="mt-1 text-[var(--muted)]">{timingConsequence.structuralHint}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
