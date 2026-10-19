"use client";

import TournamentComposerChoiceCard from "./TournamentComposerChoiceCard";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { PLANNING_EDITOR_FORM_GRID_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";

type PlannerUpdater = (updater: (prev: TournamentComposerPlannerDraft) => TournamentComposerPlannerDraft) => void;

export function TournamentComposerLegacyTurnierformatPanel({
  planner,
  onChange,
  fieldErrors,
  hideRoundRobinMeetings = false,
  hideHomeAwayRelevance = false,
}: {
  planner: TournamentComposerPlannerDraft;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
  /** Curated youth proposal path — TP01 round-robin meeting count is predetermined. */
  hideRoundRobinMeetings?: boolean;
  /** Curated youth proposal path — neutral sides are implied. */
  hideHomeAwayRelevance?: boolean;
}) {
  return (
    <>
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
          onSelect={() =>
            onChange((p) => ({
              ...p,
              competitionFormat: "GROUP_PLUS_KNOCKOUT",
              groupCount: Math.max(2, p.groupCount),
            }))
          }
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
          {planner.groupMixStrategy === "ROUND_ROBIN" && !hideRoundRobinMeetings ? (
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
          ) : planner.groupMixStrategy === "SMART_MIX" ? (
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
          ) : null}
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

      {hideHomeAwayRelevance ? null : (
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
      )}
      {fieldErrors?.planner ? (
        <p role="alert" className="mt-3 text-sm text-[var(--sce-danger)]">
          {fieldErrors.planner}
        </p>
      ) : null}
    </>
  );
}
