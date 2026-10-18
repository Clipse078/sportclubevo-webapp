"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
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

type Props = {
  tournamentId: string;
  model: TournamentPlanungViewModel;
  pitches: readonly TournamentPlanungPitchColumn[];
  settings: TournamentPlanungSchedulingSettings;
  timingConsequence: TournamentPlanungTimingConsequence;
  busy: boolean;
  canManage: boolean;
  onModelChange: (viewModel: TournamentPlanungViewModel) => void;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
  onRegenerate: () => void;
};

type BreakDraft = {
  label: string;
  startLocalTime: string;
  durationMinutes: number;
  scope: "ALL_PITCHES" | "SELECTED_PITCHES";
  selectedPitchIds: string[];
  fieldSelectionAdvanced: boolean;
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

export default function TournamentPlanungSpielplanSettings({
  tournamentId,
  model,
  pitches,
  settings,
  timingConsequence,
  busy,
  canManage,
  onModelChange,
  onBusyChange,
  onError,
  onRegenerate,
}: Props) {
  const [matchDuration, setMatchDuration] = useState(settings.matchDurationMinutes);
  const [transitionMinutes, setTransitionMinutes] = useState(settings.transitionMinutes);
  const [editorMode, setEditorMode] = useState<"none" | "add" | { editId: string }>("none");
  const [breakDraft, setBreakDraft] = useState<BreakDraft>(emptyBreakDraft());

  useEffect(() => {
    setMatchDuration(settings.matchDurationMinutes);
    setTransitionMinutes(settings.transitionMinutes);
  }, [settings.matchDurationMinutes, settings.transitionMinutes]);

  const persistTiming = useCallback(
    async (nextMatch: number, nextTransition: number) => {
      if (!model.scheduleVersionId) return;
      onBusyChange(true);
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/planung/scheduling-config`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleVersionId: model.scheduleVersionId,
            expectedRevision: model.scheduleRevision ?? undefined,
            matchDurationMinutes: nextMatch,
            transitionMinutes: nextTransition,
          }),
        });
        const json = (await res.json()) as {
          viewModel?: TournamentPlanungViewModel;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          onError(json.error ?? "Einstellungen konnten nicht gespeichert werden.");
          setMatchDuration(settings.matchDurationMinutes);
          setTransitionMinutes(settings.transitionMinutes);
          return;
        }
        if (json.viewModel) onModelChange(json.viewModel);
      } catch {
        onError("Einstellungen konnten nicht gespeichert werden.");
        setMatchDuration(settings.matchDurationMinutes);
        setTransitionMinutes(settings.transitionMinutes);
      } finally {
        onBusyChange(false);
      }
    },
    [
      model.scheduleRevision,
      model.scheduleVersionId,
      onBusyChange,
      onError,
      onModelChange,
      settings.matchDurationMinutes,
      settings.transitionMinutes,
      tournamentId,
    ],
  );

  const onTimingBlur = useCallback(() => {
    if (!canManage) return;
    if (
      matchDuration === settings.matchDurationMinutes &&
      transitionMinutes === settings.transitionMinutes
    ) {
      return;
    }
    void persistTiming(matchDuration, transitionMinutes);
  }, [
    canManage,
    matchDuration,
    settings.matchDurationMinutes,
    settings.transitionMinutes,
    transitionMinutes,
    persistTiming,
  ]);

  const saveBreak = useCallback(async () => {
    if (!canManage) return;
    onBusyChange(true);
    try {
      const payload = draftPayload(breakDraft);
      const isEdit = editorMode !== "none" && editorMode !== "add";
      const res = await fetch(
        isEdit
          ? `/api/tournaments/${tournamentId}/planung/breaks/${editorMode.editId}`
          : `/api/tournaments/${tournamentId}/planung/breaks`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as {
        viewModel?: TournamentPlanungViewModel;
        error?: string;
      };
      if (!res.ok) {
        onError(json.error ?? "Pause konnte nicht gespeichert werden.");
        return;
      }
      if (json.viewModel) onModelChange(json.viewModel);
      setEditorMode("none");
      setBreakDraft(emptyBreakDraft());
    } catch {
      onError("Pause konnte nicht gespeichert werden.");
    } finally {
      onBusyChange(false);
    }
  }, [breakDraft, canManage, editorMode, onBusyChange, onError, onModelChange, tournamentId]);

  const deleteBreak = useCallback(
    async (breakId: string, label: string) => {
      if (!canManage) return;
      const confirmed = window.confirm(`Pause „${label}“ wirklich löschen?`);
      if (!confirmed) return;
      onBusyChange(true);
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/planung/breaks/${breakId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as {
          viewModel?: TournamentPlanungViewModel;
          error?: string;
        };
        if (!res.ok) {
          onError(json.error ?? "Pause konnte nicht gelöscht werden.");
          return;
        }
        if (json.viewModel) onModelChange(json.viewModel);
        if (editorMode !== "none" && editorMode !== "add" && editorMode.editId === breakId) {
          setEditorMode("none");
        }
      } catch {
        onError("Pause konnte nicht gelöscht werden.");
      } finally {
        onBusyChange(false);
      }
    },
    [canManage, editorMode, onBusyChange, onError, onModelChange, tournamentId],
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
              value={matchDuration}
              disabled={!canManage || busy}
              aria-label="Spieldauer in Minuten"
              data-testid="planung-match-duration"
              onChange={(e) => setMatchDuration(Number(e.target.value))}
              onBlur={() => onTimingBlur()}
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
              value={transitionMinutes}
              disabled={!canManage || busy}
              aria-label="Wechselzeit in Minuten"
              data-testid="planung-transition-duration"
              onChange={(e) => setTransitionMinutes(Number(e.target.value))}
              onBlur={() => onTimingBlur()}
            />
            <span className="text-sm text-[var(--muted)]">Min.</span>
          </span>
        </label>
      </div>

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
                    disabled={busy}
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
                    disabled={busy}
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
            disabled={busy}
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
              disabled={busy}
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
              <Button type="button" disabled={busy} onClick={() => void saveBreak()}>
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
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

      {timingConsequence ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-3 text-sm",
            timingConsequence.status === "NEEDS_REGENERATION"
              ? "border-[var(--sce-warning)]/50 bg-[var(--sce-warning-soft)]"
              : "border-[var(--border)] bg-[var(--surface-2)]",
          )}
          data-testid="planung-timing-consequence"
          role={timingConsequence.status === "NEEDS_REGENERATION" ? "alert" : "status"}
          aria-live="polite"
        >
          <p className="font-medium text-[var(--foreground)]">{timingConsequence.headline}</p>
          {timingConsequence.detail ? (
            <p className="mt-1 text-[var(--muted)]">{timingConsequence.detail}</p>
          ) : null}
          {timingConsequence.status === "NEEDS_REGENERATION" && model.actions.canRegenerate ? (
            <Button
              type="button"
              className="mt-3"
              disabled={busy}
              data-testid="planung-timing-regenerate"
              onClick={onRegenerate}
            >
              {model.actions.regenerateLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
