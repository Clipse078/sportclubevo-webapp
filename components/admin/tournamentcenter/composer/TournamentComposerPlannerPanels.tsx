"use client";

import { Plus, Trash2 } from "lucide-react";
import TournamentComposerChoiceCard from "./TournamentComposerChoiceCard";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { cn } from "@/lib/cn";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { PLANNING_EDITOR_FORM_GRID_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import {
  assessTournamentComposerSmartTiming,
  composerSmartTimingFeasibilityHeadline,
} from "@/lib/tournaments/composer/tournament-composer-smart-timing";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { defaultTournamentComposerPitchLabels } from "@/lib/tournaments/composer/tournament-composer-planner-defaults";

type PlannerUpdater = (updater: (prev: TournamentComposerPlannerDraft) => TournamentComposerPlannerDraft) => void;

function SmartTimingPanel({ payload }: { payload: TournamentComposerDraftPayload }) {
  const assessment = assessTournamentComposerSmartTiming(payload);
  const feasibility = composerSmartTimingFeasibilityHeadline(assessment);
  if (!assessment) {
    return (
      <p className="text-sm text-[var(--text-2)]" data-testid="tournament-composer-smart-timing-hint">
        Smart Timing zeigt Empfehlungen, sobald Teams, Termin und Felder konfiguriert sind.
      </p>
    );
  }
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2"
      data-testid="tournament-composer-smart-timing"
    >
      <p className="text-sm font-medium text-[var(--foreground)]">
        SCE erstellt den Spielplan automatisch aus Teams, Turnierformat, Spielfeldern und Zeitvorgaben.
      </p>
      {feasibility ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="tournament-composer-smart-timing-feasibility">
          {feasibility}
        </p>
      ) : null}
      {assessment.durationRecommendation ? (
        <p className="text-sm text-[var(--text-2)]">
          Empfehlung: {assessment.durationRecommendation.matchDurationMinutes} Min. Spielzeit +{" "}
          {assessment.durationRecommendation.transitionMinutes} Min. Wechselzeit.
        </p>
      ) : null}
      {assessment.predictedFinishUtcMs ? (
        <p className="text-sm text-[var(--text-2)]">
          Voraussichtliches Ende:{" "}
          {new Date(assessment.predictedFinishUtcMs).toLocaleTimeString("de-CH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
      {assessment.nudges.slice(0, 3).map((nudge) => (
        <p key={nudge.code} className="text-xs text-[var(--muted)]">
          {nudge.code.replaceAll("_", " ")}
        </p>
      ))}
    </div>
  );
}

export function TournamentComposerTurnierformatPanel({
  planner,
  onChange,
  fieldErrors,
}: {
  planner: TournamentComposerPlannerDraft;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <PlanningEditorSection testId="tournament-create-format-section">
      <PlanningEditorSectionHeading title="Turnierformat" />
      <p className="mb-4 text-sm text-[var(--text-2)]">
        Wählen Sie, wie SCE Gruppen-, Mix- und K.-o.-Spiele aufbaut.
      </p>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Turnierformat">
        <TournamentComposerChoiceCard
          title="Gruppen-/Mixspiele"
          description="Round Robin oder intelligente Mischung — ideal für Jugendturniere."
          selected={planner.competitionFormat === "GROUP_MIX_ONLY"}
          onSelect={() => onChange((p) => ({ ...p, competitionFormat: "GROUP_MIX_ONLY" }))}
          testId="tournament-format-group-mix-only"
        />
        <TournamentComposerChoiceCard
          title="K.-o.-Turnier"
          description="Direkter K.-o.-Baum mit automatischen Freilosen."
          selected={planner.competitionFormat === "KNOCKOUT_ONLY"}
          onSelect={() => onChange((p) => ({ ...p, competitionFormat: "KNOCKOUT_ONLY" }))}
          testId="tournament-format-knockout-only"
        />
        <TournamentComposerChoiceCard
          title="Gruppenphase + K.-o."
          description="Gruppen qualifizieren Teams für die K.-o.-Phase."
          selected={planner.competitionFormat === "GROUP_PLUS_KNOCKOUT"}
          onSelect={() => onChange((p) => ({ ...p, competitionFormat: "GROUP_PLUS_KNOCKOUT", groupCount: Math.max(2, p.groupCount) }))}
          testId="tournament-format-group-plus-knockout"
        />
      </div>

      {planner.competitionFormat !== "KNOCKOUT_ONLY" ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Generierungsstrategie">
            <TournamentComposerChoiceCard
              title="Jeder gegen jeden"
              description="Klassische Round-Robin-Paarungen in der Gruppe."
              selected={planner.groupMixStrategy === "ROUND_ROBIN"}
              onSelect={() => onChange((p) => ({ ...p, groupMixStrategy: "ROUND_ROBIN" }))}
              testId="tournament-strategy-round-robin"
            />
            <TournamentComposerChoiceCard
              title="Intelligente Mischung"
              description="SCE verteilt Gegner ausgewogen — ohne manuelle Paarungen."
              selected={planner.groupMixStrategy === "SMART_MIX"}
              onSelect={() => onChange((p) => ({ ...p, groupMixStrategy: "SMART_MIX" }))}
              testId="tournament-strategy-smart-mix"
            />
          </div>
          {planner.groupMixStrategy === "ROUND_ROBIN" ? (
            <label className="block max-w-xs space-y-2">
              <span className="fca-label">Spiele pro Gegner</span>
              <select
                className="fca-input"
                value={planner.meetingsPerOpponent}
                onChange={(e) =>
                  onChange((p) => ({ ...p, meetingsPerOpponent: Number(e.target.value) }))
                }
                data-testid="tournament-meetings-per-opponent"
              >
                {[1, 2].map((n) => (
                  <option key={n} value={n}>
                    {n}× gegeneinander
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block max-w-xs space-y-2">
              <span className="fca-label">Spiele pro Team</span>
              <input
                type="number"
                min={1}
                className="fca-input"
                value={planner.smartMixTargetMatchesPerParticipant ?? 4}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    smartMixTargetMatchesPerParticipant: Number(e.target.value),
                  }))
                }
                data-testid="tournament-smart-mix-target"
              />
            </label>
          )}
          {planner.competitionFormat === "GROUP_PLUS_KNOCKOUT" ? (
            <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
              <label className="block space-y-2">
                <span className="fca-label">Anzahl Gruppen</span>
                <input
                  type="number"
                  min={2}
                  className="fca-input"
                  value={planner.groupCount}
                  onChange={(e) => onChange((p) => ({ ...p, groupCount: Number(e.target.value) }))}
                  data-testid="tournament-group-count"
                />
              </label>
              <label className="block space-y-2">
                <span className="fca-label">Qualifikation pro Gruppe</span>
                <input
                  type="number"
                  min={1}
                  className="fca-input"
                  value={planner.knockoutQualifiersPerGroup}
                  onChange={(e) =>
                    onChange((p) => ({ ...p, knockoutQualifiersPerGroup: Number(e.target.value) }))
                  }
                  data-testid="tournament-knockout-qualifiers-per-group"
                />
              </label>
            </div>
          ) : planner.competitionFormat === "GROUP_MIX_ONLY" ? (
            <label className="block max-w-xs space-y-2">
              <span className="fca-label">Anzahl Gruppen</span>
              <input
                type="number"
                min={1}
                className="fca-input"
                value={planner.groupCount}
                onChange={(e) => onChange((p) => ({ ...p, groupCount: Number(e.target.value) }))}
                data-testid="tournament-group-count"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div
        className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] p-4"
        data-testid="tournament-home-away-relevance"
      >
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">Heim-/Auswärtsseiten berücksichtigen</p>
          <p className="mt-1 text-xs text-[var(--text-2)]">
            Aus: neutrale Seiten. An: SCE balanciert Heim- und Auswärtsseiten in Paarungen.
          </p>
        </div>
        <SwitchThumb
          id="tournament-home-away-relevance"
          checked={planner.homeAwayRelevance === "ON"}
          onChange={(checked) =>
            onChange((p) => ({ ...p, homeAwayRelevance: checked ? "ON" : "OFF" }))
          }
          aria-label="Heim-/Auswärtsseiten berücksichtigen"
        />
      </div>
      {fieldErrors?.planner ? (
        <p role="alert" className="mt-3 text-sm text-[var(--sce-danger)]">
          {fieldErrors.planner}
        </p>
      ) : null}
    </PlanningEditorSection>
  );
}

export function TournamentComposerSpielfelderPanel({
  planner,
  onChange,
  fieldErrors,
}: {
  planner: TournamentComposerPlannerDraft;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <PlanningEditorSection testId="tournament-create-pitches-section">
      <PlanningEditorSectionHeading title="Turnierfelder" />
      <p className="mb-3 text-sm text-[var(--text-2)]">
        Logische Spielfelder für den Spielplan — unabhängig von physischen Anlagenressourcen im Schritt
        Ressourcen.
      </p>
      <ul className="space-y-2">
        {planner.pitches.map((pitch) => (
          <li key={pitch.localId} className="flex items-center gap-2">
            <input
              type="text"
              className="fca-input flex-1"
              value={pitch.label}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  pitches: p.pitches.map((row) =>
                    row.localId === pitch.localId ? { ...row, label: e.target.value } : row,
                  ),
                }))
              }
              data-testid={`tournament-pitch-label-${pitch.localId}`}
            />
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)]"
              aria-label="Feld entfernen"
              disabled={planner.pitches.length <= 1}
              onClick={() =>
                onChange((p) => ({
                  ...p,
                  pitches: p.pitches.filter((row) => row.localId !== pitch.localId),
                }))
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--sce-primary)]"
        onClick={() =>
          onChange((p) => {
            const nextIndex = p.pitches.length + 1;
            return {
              ...p,
              pitches: [
                ...p.pitches,
                { localId: `pitch-${Date.now()}`, label: `Feld ${nextIndex}` },
              ],
            };
          })
        }
        data-testid="tournament-pitch-add"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Feld hinzufügen
      </button>
      {fieldErrors?.pitches ? (
        <p role="alert" className="mt-2 text-sm text-[var(--sce-danger)]">
          {fieldErrors.pitches}
        </p>
      ) : null}
    </PlanningEditorSection>
  );
}

export function TournamentComposerSpielplanPanel({
  payload,
  planner,
  onChange,
  fieldErrors,
}: {
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <PlanningEditorSection testId="tournament-create-scheduling-section">
      <PlanningEditorSectionHeading title="Spielplan & Timing" />
      <div className={`${PLANNING_EDITOR_FORM_GRID_CLASS} mb-4`}>
        <label className="block space-y-2">
          <span className="fca-label">Spieldauer (Min.)</span>
          <input
            type="number"
            min={1}
            className="fca-input"
            value={planner.timing.matchDurationMinutes}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                timing: { ...p.timing, matchDurationMinutes: Number(e.target.value) },
              }))
            }
            data-testid="tournament-match-duration"
          />
        </label>
        <label className="block space-y-2">
          <span className="fca-label">Wechselzeit (Min.)</span>
          <input
            type="number"
            min={0}
            className="fca-input"
            value={planner.timing.transitionMinutes}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                timing: { ...p.timing, transitionMinutes: Number(e.target.value) },
              }))
            }
            data-testid="tournament-transition-duration"
          />
        </label>
        <label className="block space-y-2">
          <span className="fca-label">Mindestpause pro Team (Min.)</span>
          <input
            type="number"
            min={0}
            className="fca-input"
            value={planner.timing.minRestMinutes}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                timing: { ...p.timing, minRestMinutes: Number(e.target.value) },
              }))
            }
            data-testid="tournament-min-rest"
          />
        </label>
      </div>

      <SmartTimingPanel payload={payload} />

      <div className="mt-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Pausen & Sperrzeiten</h3>
        {planner.breaks.map((br) => (
          <div key={br.localId} className="rounded-xl border border-[var(--border)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                className="fca-input flex-1"
                placeholder="Bezeichnung"
                value={br.label}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    breaks: p.breaks.map((row) =>
                      row.localId === br.localId ? { ...row, label: e.target.value } : row,
                    ),
                  }))
                }
              />
              <button
                type="button"
                aria-label="Pause entfernen"
                onClick={() =>
                  onChange((p) => ({
                    ...p,
                    breaks: p.breaks.filter((row) => row.localId !== br.localId),
                  }))
                }
              >
                <Trash2 className="h-4 w-4 text-[var(--muted)]" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="fca-label">Start</span>
                <input
                  type="datetime-local"
                  className="fca-input"
                  value={br.startAt}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      breaks: p.breaks.map((row) =>
                        row.localId === br.localId ? { ...row, startAt: e.target.value } : row,
                      ),
                    }))
                  }
                  data-testid={`tournament-break-start-${br.localId}`}
                />
              </label>
              <label className="block space-y-1">
                <span className="fca-label">Ende</span>
                <input
                  type="datetime-local"
                  className="fca-input"
                  value={br.endAt}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      breaks: p.breaks.map((row) =>
                        row.localId === br.localId ? { ...row, endAt: e.target.value } : row,
                      ),
                    }))
                  }
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="fca-label">Geltungsbereich</span>
              <select
                className="fca-input"
                value={br.scope}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    breaks: p.breaks.map((row) =>
                      row.localId === br.localId
                        ? {
                            ...row,
                            scope: e.target.value as "ALL_PITCHES" | "SELECTED_PITCHES",
                            tournamentPitchLocalIds:
                              e.target.value === "ALL_PITCHES" ? [] : row.tournamentPitchLocalIds,
                          }
                        : row,
                    ),
                  }))
                }
              >
                <option value="ALL_PITCHES">Alle Felder</option>
                <option value="SELECTED_PITCHES">Ausgewählte Felder</option>
              </select>
            </label>
            {br.scope === "SELECTED_PITCHES" ? (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Felder für Sperrzeit"
                data-testid={`tournament-break-pitches-${br.localId}`}
              >
                {planner.pitches.map((pitch) => {
                  const selected = br.tournamentPitchLocalIds.includes(pitch.localId);
                  return (
                    <button
                      key={pitch.localId}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        selected
                          ? "border-[var(--sce-primary)] bg-[var(--sce-primary-soft)] text-[var(--foreground)]"
                          : "border-[var(--border)] text-[var(--text-2)]",
                      )}
                      onClick={() =>
                        onChange((p) => ({
                          ...p,
                          breaks: p.breaks.map((row) => {
                            if (row.localId !== br.localId) return row;
                            const ids = new Set(row.tournamentPitchLocalIds);
                            if (ids.has(pitch.localId)) ids.delete(pitch.localId);
                            else ids.add(pitch.localId);
                            return { ...row, tournamentPitchLocalIds: [...ids] };
                          }),
                        }))
                      }
                    >
                      {pitch.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sce-primary)]"
          onClick={() =>
            onChange((p) => ({
              ...p,
              breaks: [
                ...p.breaks,
                {
                  localId: `break-${Date.now()}`,
                  label: "Pause",
                  startAt: "",
                  endAt: "",
                  scope: "ALL_PITCHES",
                  tournamentPitchLocalIds: [],
                },
              ],
            }))
          }
          data-testid="tournament-break-add"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Pause hinzufügen
        </button>
      </div>
      {fieldErrors ? (
        <div className="mt-3 space-y-1">
          {Object.entries(fieldErrors).map(([key, message]) => (
            <p key={key} role="alert" className="text-sm text-[var(--sce-danger)]">
              {message}
            </p>
          ))}
        </div>
      ) : null}
    </PlanningEditorSection>
  );
}

export function syncPitchCountPreset(planner: TournamentComposerPlannerDraft, count: 1 | 2 | 4 | 8) {
  const labels = defaultTournamentComposerPitchLabels(count);
  return {
    ...planner,
    pitches: labels.map((label, index) => ({
      localId: planner.pitches[index]?.localId ?? `pitch-${index + 1}`,
      label,
    })),
  };
}
