"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { TournamentComposerLegacyTurnierformatPanel } from "./TournamentComposerLegacyTurnierformatPanel";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { PLANNING_EDITOR_FORM_GRID_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import TournamentComposerPitchPlayingFormatField from "./TournamentComposerPitchPlayingFormatField";
import {
  buildComposerScheduleFitView,
  countComposerCuratedTemplateParticipants,
  resolveComposerProgrammeTemplate,
} from "@/lib/tournaments/composer/tournament-composer-programme-template";
import { normalizeComposerMainPauseDraft } from "@/lib/tournaments/composer/tournament-composer-main-pause";

type PlannerUpdater = (updater: (prev: TournamentComposerPlannerDraft) => TournamentComposerPlannerDraft) => void;

function ScheduleFitPanel({ payload }: { payload: TournamentComposerDraftPayload }) {
  const view = useMemo(
    () =>
      payload.planner
        ? buildComposerScheduleFitView({
            participantCount: countComposerCuratedTemplateParticipants(payload.participants),
            startAt: payload.startAt,
            endAt: payload.endAt,
            planner: payload.planner,
          })
        : null,
    [payload],
  );
  if (!view) return null;

  return (
    <div
      className="mb-6 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      data-testid="tournament-composer-schedule-fit"
      role={view.status === "FAIL" ? "alert" : "status"}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{view.headline}</p>
      {view.detail ? (
        <p className="whitespace-pre-line text-sm text-[var(--text-2)]">{view.detail}</p>
      ) : null}
    </div>
  );
}

export function TournamentComposerTurnierformatPanel({
  planner,
  participantCount,
  onChange,
  fieldErrors,
}: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
}) {
  const resolved = resolveComposerProgrammeTemplate(participantCount);

  return (
    <PlanningEditorSection testId="tournament-create-format-section">
      <PlanningEditorSectionHeading title="Turnierformat" />
      {resolved ? (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-4">
          <p className="text-sm font-medium text-[var(--foreground)]">{resolved.template.displayName}</p>
          <p className="text-sm text-[var(--text-2)]">
            SCE erkennt {participantCount} Teilnehmer und wählt den passenden vordefinierten Spielplan.
          </p>
          <p className="text-sm text-[var(--text-2)]" data-testid="tournament-composer-template-field-count">
            {resolved.fieldCountLabel}
          </p>
          <p className="text-xs text-[var(--muted)]">{resolved.playingFormatSummary}</p>
          <p className="text-xs text-[var(--text-2)]">
            {resolved.template.rounds.length} Runden · Struktur gemäss genehmigter Programmvorlage
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--text-2)]">
            Für diese Teilnehmerzahl liegt kein kuratierter Spielplan vor. SCE verwendet nach der Erstellung den
            bekannten TP01-Generator.
          </p>
          <TournamentComposerLegacyTurnierformatPanel
            planner={planner}
            onChange={onChange}
            fieldErrors={fieldErrors}
          />
        </>
      )}
    </PlanningEditorSection>
  );
}

export function TournamentComposerSpielfelderPanel({
  planner,
  participantCount,
  onChange,
  fieldErrors,
}: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
}) {
  const resolved = resolveComposerProgrammeTemplate(participantCount);
  const templateDriven = resolved != null;

  return (
    <PlanningEditorSection testId="tournament-create-pitches-section">
      <PlanningEditorSectionHeading title="Turnierfelder" />
      <p className="mb-3 text-sm text-[var(--text-2)]">
        Logische Spielfelder für den Spielplan — unabhängig von physischen Anlagenressourcen im Schritt Ressourcen.
      </p>
      {templateDriven ? (
        <div
          className="mb-4 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-4"
          data-testid="tournament-composer-pitches-template-status"
        >
          <p className="text-sm font-medium text-[var(--foreground)]">{resolved.statusHeadline}</p>
          <p className="text-sm text-[var(--text-2)]">{resolved.statusDetail}</p>
          <p className="text-sm text-[var(--text-2)]" data-testid="tournament-composer-pitches-template-hint">
            {resolved.fieldCountLabel}
          </p>
        </div>
      ) : null}
      <ul className="space-y-3">
        {planner.pitches.map((pitch) => (
          <li
            key={pitch.localId}
            className="flex flex-col gap-3 rounded-lg border border-[var(--border)]/70 bg-[var(--surface)]/40 p-3 sm:flex-row sm:items-end sm:gap-2"
            data-testid={`tournament-composer-pitch-row-${pitch.localId}`}
          >
            <label className="block min-w-0 flex-1 space-y-1">
              <span className="fca-label">Name</span>
              <input
                type="text"
                className="fca-input w-full"
                value={pitch.label}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    pitches: p.pitches.map((row) =>
                      row.localId === pitch.localId
                        ? { ...row, label: e.target.value, userLabelCustomized: true }
                        : row,
                    ),
                  }))
                }
                data-testid={`tournament-pitch-label-${pitch.localId}`}
              />
            </label>
            <TournamentComposerPitchPlayingFormatField
              id={`tournament-pitch-format-${pitch.localId}`}
              testId={`tournament-pitch-format-${pitch.localId}`}
              playersPerSide={pitch.playersPerSide ?? null}
              disabled={templateDriven}
              onChange={(playersPerSide) =>
                onChange((p) => ({
                  ...p,
                  pitches: p.pitches.map((row) =>
                    row.localId === pitch.localId ? { ...row, playersPerSide } : row,
                  ),
                }))
              }
            />
            {!templateDriven ? (
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] self-end"
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
            ) : null}
          </li>
        ))}
      </ul>
      {!templateDriven ? (
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
                  { localId: `pitch-${Date.now()}`, label: `Feld ${nextIndex}`, playersPerSide: null },
                ],
              };
            })
          }
          data-testid="tournament-pitch-add"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Feld hinzufügen
        </button>
      ) : null}
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
  const mainPause = normalizeComposerMainPauseDraft(planner.mainPause);

  const timingFieldErrors = fieldErrors
    ? Object.fromEntries(
        Object.entries(fieldErrors).filter(
          ([key]) => key === "matchDurationMinutes" || key === "transitionMinutes",
        ),
      )
    : undefined;

  return (
    <PlanningEditorSection testId="tournament-create-scheduling-section">
      <PlanningEditorSectionHeading title="Spielplan & Timing" />

      <div className="mb-6 space-y-4 rounded-xl border border-[var(--border)] p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Pause</h3>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Grössere Turnierpause</p>
          </div>
          <div data-testid="tournament-composer-main-pause-toggle">
            <SwitchThumb
              id="tournament-composer-main-pause-enabled"
              checked={mainPause.enabled}
              onChange={(checked) =>
                onChange((p) => ({
                  ...p,
                  mainPause: {
                    ...(p.mainPause ?? mainPause),
                    enabled: checked,
                  },
                }))
              }
              aria-label="Grössere Turnierpause"
            />
          </div>
        </div>
        {mainPause.enabled ? (
          <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
            <label className="block space-y-2">
              <span className="fca-label">Pausenbeginn</span>
              <input
                type="time"
                className="fca-input"
                value={mainPause.startLocalTime}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    mainPause: {
                      ...normalizeComposerMainPauseDraft(p.mainPause ?? mainPause),
                      startLocalTime: e.target.value,
                    },
                  }))
                }
                data-testid="tournament-composer-main-pause-start"
              />
            </label>
            <label className="block space-y-2">
              <span className="fca-label">Pausendauer (Min.)</span>
              <input
                type="number"
                min={1}
                className="fca-input"
                value={mainPause.durationMinutes}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    mainPause: {
                      ...normalizeComposerMainPauseDraft(p.mainPause ?? mainPause),
                      durationMinutes: Number(e.target.value),
                    },
                  }))
                }
                data-testid="tournament-composer-main-pause-duration"
              />
            </label>
          </div>
        ) : null}
      </div>

      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Spieldauer</h3>
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
          {timingFieldErrors?.matchDurationMinutes ? (
            <p role="alert" className="text-sm text-[var(--sce-danger)]">
              {timingFieldErrors.matchDurationMinutes}
            </p>
          ) : null}
        </label>
      </div>

      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Wechselzeit</h3>
      <div className={`${PLANNING_EDITOR_FORM_GRID_CLASS} mb-4`}>
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
          {timingFieldErrors?.transitionMinutes ? (
            <p role="alert" className="text-sm text-[var(--sce-danger)]">
              {timingFieldErrors.transitionMinutes}
            </p>
          ) : null}
        </label>
      </div>

      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Zeitprüfung</h3>
      <ScheduleFitPanel payload={payload} />
    </PlanningEditorSection>
  );
}
