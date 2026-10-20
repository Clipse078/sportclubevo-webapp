"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, LayoutGrid, MoreVertical, Plus, Trash2 } from "lucide-react";
import { TournamentComposerLegacyTurnierformatPanel } from "./TournamentComposerLegacyTurnierformatPanel";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { PLANNING_EDITOR_FORM_GRID_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import TournamentComposerPitchPlayingFormatField from "./TournamentComposerPitchPlayingFormatField";
import {
  countComposerCuratedTemplateParticipants,
  resolveComposerProgrammeTemplate,
  restoreComposerProgrammeProposal,
} from "@/lib/tournaments/composer/tournament-composer-programme-template";
import { buildComposerScheduleFitView } from "@/lib/tournaments/composer/tournament-composer-schedule-fit";
import {
  createComposerScheduleRoundBreakDraft,
  normalizeComposerScheduleRoundBreaks,
} from "@/lib/tournaments/composer/tournament-composer-schedule-round-breaks";
import { buildTournamentSchedulePreview } from "@/lib/tournaments/composer/tournament-composer-schedule-preview";
import ComposerSchedulePreviewPresentation from "./ComposerSchedulePreviewPresentation";

type PlannerUpdater = (updater: (prev: TournamentComposerPlannerDraft) => TournamentComposerPlannerDraft) => void;

function ScheduleFitPanel({
  payload,
  categoryContext,
}: {
  payload: TournamentComposerDraftPayload;
  categoryContext: ProgrammeTemplateCategoryContext | null;
}) {
  const view = useMemo(
    () =>
      payload.planner
        ? buildComposerScheduleFitView({
            participantCount: countComposerCuratedTemplateParticipants(payload.participants),
            categoryContext,
            startAt: payload.startAt,
            endAt: payload.endAt,
            planner: payload.planner,
            payload,
          })
        : null,
    [payload, categoryContext],
  );
  if (!view) return null;

  const statusIcon =
    view.status === "PASS" ? "✓" : view.status === "FAIL" ? "!" : "…";

  return (
    <div
      className="mb-6 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      data-testid="tournament-composer-schedule-fit"
      role={view.status === "FAIL" ? "alert" : "status"}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">
        <span aria-hidden>{statusIcon}</span> {view.headline}
      </p>
      {view.detail ? (
        <p className="whitespace-pre-line text-sm text-[var(--text-2)]">{view.detail}</p>
      ) : null}
    </div>
  );
}

function ComposerSchedulePreviewPanel({
  payload,
  categoryContext,
  tenantClubName,
  tenantLogoUrl,
}: {
  payload: TournamentComposerDraftPayload;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}) {
  const preview = useMemo(
    () => buildTournamentSchedulePreview({ payload, categoryContext }),
    [payload, categoryContext],
  );

  if (preview.status === "INCOMPLETE") {
    return (
      <p className="text-sm text-[var(--text-2)]" data-testid="tournament-composer-schedule-preview-empty">
        {preview.errorMessage ?? preview.fitHeadline}
      </p>
    );
  }

  if (preview.status === "ERROR") {
    return (
      <p
        role="alert"
        className="text-sm text-[var(--sce-danger)]"
        data-testid="tournament-composer-schedule-preview-error"
      >
        {preview.errorMessage ?? preview.fitHeadline}
      </p>
    );
  }

  const summaryParts: string[] = [];
  if (preview.tournamentStartLabel) {
    summaryParts.push(`${preview.tournamentStartLabel} Start`);
  }
  if (preview.pauseLabel) {
    summaryParts.push(`${preview.pauseLabel} Pause`);
  }
  if (preview.programmeEndLabel) {
    summaryParts.push(`${preview.programmeEndLabel} Ende`);
  }

  return (
    <ComposerSchedulePreviewPresentation
      payload={payload}
      timelineItems={preview.timelineItems}
      summaryLine={summaryParts.length > 0 ? summaryParts.join(" · ") : null}
      tenantClubName={tenantClubName}
      tenantLogoUrl={tenantLogoUrl}
    />
  );
}

export function TournamentComposerTurnierformatPanel({
  planner,
  participantCount,
  categoryContext,
  onChange,
  fieldErrors,
}: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
}) {
  const resolved = resolveComposerProgrammeTemplate({ participantCount, categoryContext });
  const hasCuratedProposal =
    resolved?.proposal.kind === "FULL_TEMPLATE" || resolved?.proposal.kind === "FIELD_PROPOSAL_ONLY";
  const [advancedFormatOpen, setAdvancedFormatOpen] = useState(false);

  return (
    <PlanningEditorSection testId="tournament-create-format-section">
      <PlanningEditorSectionHeading title="Turnierformat" />
      {hasCuratedProposal && resolved ? (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-4">
            <p className="text-sm text-[var(--text-2)]">
              SCE hat auf Basis der Teilnehmer einen passenden Spielplan vorbereitet.
            </p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {resolved.proposal.kind === "FULL_TEMPLATE" ? "Empfohlener Spielplan" : "Empfohlene Feldaufteilung"}
            </p>
            <p className="text-sm text-[var(--text-2)]" data-testid="tournament-composer-template-field-count">
              {resolved.fieldCountLabel}
            </p>
            <p className="text-xs text-[var(--muted)]" data-testid="tournament-composer-schedule-recommendation">
              {resolved.scheduleRecommendationSummary}
            </p>
          </div>
          {advancedFormatOpen ? (
            <TournamentComposerLegacyTurnierformatPanel
              planner={planner}
              onChange={onChange}
              fieldErrors={fieldErrors}
              hideRoundRobinMeetings
            />
          ) : (
            <button
              type="button"
              className="text-sm font-medium text-[var(--sce-primary)]"
              data-testid="tournament-composer-advanced-format-toggle"
              onClick={() => setAdvancedFormatOpen(true)}
            >
              Anderes Turnierformat wählen
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--text-2)]">
            Für diese Konstellation legst du Format und Felder fest — SCE erstellt deinen Spielplan direkt in der
            Vorschau.
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
  categoryContext,
  onChange,
  fieldErrors,
}: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
}) {
  const resolved = resolveComposerProgrammeTemplate({ participantCount, categoryContext });
  const hasProposal = resolved != null;

  return (
    <PlanningEditorSection testId="tournament-create-pitches-section">
      <PlanningEditorSectionHeading title="Spielfelder" />
      {hasProposal ? (
        <p className="mb-3 text-sm text-[var(--text-2)]">
          SCE hat eine empfohlene Aufteilung für dieses Turnier vorbereitet — du kannst Felder jederzeit anpassen.
        </p>
      ) : (
        <p className="mb-3 text-sm text-[var(--text-2)]">
          Lege Turnierspielfelder fest — optional mit Spielweise pro Feld. SCE übernimmt sie in den Spielplan.
        </p>
      )}
      {hasProposal &&
      planner.pitches.length >= resolved.proposedFieldCount &&
      !planner.pendingProposalRefresh ? (
        <p
          className="mb-3 text-sm font-medium text-[var(--foreground)]"
          data-testid="tournament-composer-pitches-prepared-count"
        >
          {planner.pitches.length} Spielfelder vorbereitet
        </p>
      ) : null}
      {hasProposal ? (
        <div
          className="mb-4 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-4"
          data-testid="tournament-composer-pitches-template-status"
        >
          <p className="text-sm font-medium text-[var(--foreground)]">{resolved.statusHeadline}</p>
          <p
            className="text-sm text-[var(--text-2)]"
            data-testid="tournament-composer-pitches-schedule-recommendation"
          >
            {resolved.scheduleRecommendationSummary}
          </p>
          {planner.pitchesUserCustomized ? (
            <button
              type="button"
              className="text-sm font-medium text-[var(--sce-primary)]"
              data-testid="tournament-composer-restore-proposal"
              onClick={() =>
                onChange((p) =>
                  restoreComposerProgrammeProposal({
                    planner: p,
                    participantCount,
                    categoryContext,
                  }),
                )
              }
            >
              Empfehlung wiederherstellen
            </button>
          ) : null}
        </div>
      ) : null}

      {planner.pendingProposalRefresh ? (
        <div
          className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          data-testid="tournament-composer-proposal-refresh-prompt"
          role="status"
        >
          <p className="text-sm text-[var(--foreground)]">{planner.pendingProposalRefresh.message}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="fca-btn fca-btn-primary text-sm"
              data-testid="tournament-composer-proposal-refresh-accept"
              onClick={() =>
                onChange((p) =>
                  restoreComposerProgrammeProposal({
                    planner: p,
                    participantCount,
                    categoryContext,
                  }),
                )
              }
            >
              Empfehlung übernehmen
            </button>
            <button
              type="button"
              className="fca-btn fca-btn-secondary text-sm"
              data-testid="tournament-composer-proposal-refresh-keep"
              onClick={() =>
                onChange((p) => ({
                  ...p,
                  pendingProposalRefresh: null,
                  programmeProposalFingerprint: p.pendingProposalRefresh?.nextFingerprint ?? p.programmeProposalFingerprint,
                }))
              }
            >
              Eigene Aufteilung behalten
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-3">
        {planner.pitches.map((pitch, index) => (
          <li
            key={pitch.localId}
            className="rounded-xl border border-[var(--border)]/70 bg-[var(--surface)]/40 p-4"
            data-testid={`tournament-composer-pitch-row-${pitch.localId}`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                <LayoutGrid className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                <span>Feld {index + 1}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                  aria-label="Feld nach oben"
                  disabled={index === 0}
                  onClick={() =>
                    onChange((p) => {
                      const next = [...p.pitches];
                      const tmp = next[index - 1]!;
                      next[index - 1] = next[index]!;
                      next[index] = tmp;
                      return {
                        ...p,
                        pitchesUserCustomized: true,
                        pendingProposalRefresh: null,
                        pitches: next,
                      };
                    })
                  }
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                  aria-label="Feld nach unten"
                  disabled={index >= planner.pitches.length - 1}
                  onClick={() =>
                    onChange((p) => {
                      const next = [...p.pitches];
                      const tmp = next[index + 1]!;
                      next[index + 1] = next[index]!;
                      next[index] = tmp;
                      return { ...p, pitchesUserCustomized: true, pendingProposalRefresh: null, pitches: next };
                    })
                  }
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                  aria-label="Feld entfernen"
                  disabled={planner.pitches.length <= 1}
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      pitchesUserCustomized: true,
                      pendingProposalRefresh: null,
                      pitches: p.pitches.filter((row) => row.localId !== pitch.localId),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <MoreVertical className="h-4 w-4 text-[var(--muted)] opacity-40" aria-hidden />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
              <label className="block min-w-0 flex-1 space-y-1">
                <span className="fca-label">Name</span>
                <input
                  type="text"
                  className="fca-input w-full"
                  value={pitch.label}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      pitchesUserCustomized: true,
                      pendingProposalRefresh: null,
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
                onChange={(playersPerSide) =>
                  onChange((p) => ({
                    ...p,
                    pitchesUserCustomized: true,
                    pendingProposalRefresh: null,
                    pitches: p.pitches.map((row) =>
                      row.localId === pitch.localId ? { ...row, playersPerSide } : row,
                    ),
                  }))
                }
              />
            </div>
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
              pitchesUserCustomized: true,
              pendingProposalRefresh: null,
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
        Spielfeld hinzufügen
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
  categoryContext,
  onChange,
  fieldErrors,
  tenantClubName,
  tenantLogoUrl,
}: {
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  onChange: PlannerUpdater;
  fieldErrors?: Record<string, string>;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}) {
  const scheduleRoundBreaks = normalizeComposerScheduleRoundBreaks(planner);

  const previewRoundCount = useMemo(() => {
    const preview = buildTournamentSchedulePreview({
      payload: { ...payload, planner },
      categoryContext,
    });
    return preview.roundCount;
  }, [payload, planner, categoryContext]);

  const pauseRoundOptions = useMemo(() => {
    const maxAfterRound = Math.max(0, previewRoundCount - 1);
    return Array.from({ length: maxAfterRound }, (_, index) => index + 1);
  }, [previewRoundCount]);

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
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Pausen</h3>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Optional. Füge bei Bedarf Pausen zwischen den Spielrunden ein.
          </p>
        </div>

        <ul className="space-y-3" data-testid="tournament-composer-schedule-round-breaks">
          {scheduleRoundBreaks.map((br, index) => {
            const errorKey = `scheduleRoundBreak-${br.localId}`;
            const rowError = fieldErrors?.[errorKey];
            return (
              <li
                key={br.localId}
                className="rounded-lg border border-[var(--border)] p-3"
                data-testid={`tournament-composer-schedule-round-break-${index + 1}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">Pause {index + 1}</p>
                  <button
                    type="button"
                    className="fca-btn fca-btn-ghost p-2"
                    aria-label={`Pause ${index + 1} entfernen`}
                    data-testid={`tournament-composer-schedule-round-break-delete-${br.localId}`}
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        scheduleRoundBreaks: normalizeComposerScheduleRoundBreaks(p).filter(
                          (row) => row.localId !== br.localId,
                        ),
                        mainPause: undefined,
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
                  <label className="block space-y-2">
                    <span className="fca-label">Nach Runde</span>
                    <select
                      className="fca-input"
                      value={br.afterRoundNumber}
                      onChange={(e) =>
                        onChange((p) => ({
                          ...p,
                          scheduleRoundBreaks: normalizeComposerScheduleRoundBreaks(p).map((row) =>
                            row.localId === br.localId
                              ? { ...row, afterRoundNumber: Number(e.target.value) }
                              : row,
                          ),
                          mainPause: undefined,
                        }))
                      }
                      data-testid={`tournament-composer-schedule-round-break-after-${br.localId}`}
                    >
                      {pauseRoundOptions.map((roundNumber) => (
                        <option key={roundNumber} value={roundNumber}>
                          Nach Runde {roundNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="fca-label">Dauer (Min.)</span>
                    <input
                      type="number"
                      min={1}
                      className="fca-input"
                      value={br.durationMinutes}
                      onChange={(e) =>
                        onChange((p) => ({
                          ...p,
                          scheduleRoundBreaks: normalizeComposerScheduleRoundBreaks(p).map((row) =>
                            row.localId === br.localId
                              ? { ...row, durationMinutes: Number(e.target.value) }
                              : row,
                          ),
                          mainPause: undefined,
                        }))
                      }
                      data-testid={`tournament-composer-schedule-round-break-duration-${br.localId}`}
                    />
                  </label>
                </div>
                {rowError ? (
                  <p role="alert" className="mt-2 text-sm text-[var(--sce-danger)]">
                    {rowError}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="fca-btn fca-btn-secondary inline-flex items-center gap-2 text-sm"
          data-testid="tournament-composer-schedule-round-break-add"
          disabled={pauseRoundOptions.length === 0}
          onClick={() =>
            onChange((p) => {
              const existing = normalizeComposerScheduleRoundBreaks(p);
              const usedRounds = new Set(existing.map((row) => row.afterRoundNumber));
              const nextRound =
                pauseRoundOptions.find((roundNumber) => !usedRounds.has(roundNumber)) ??
                pauseRoundOptions[pauseRoundOptions.length - 1] ??
                1;
              return {
                ...p,
                scheduleRoundBreaks: [
                  ...existing,
                  createComposerScheduleRoundBreakDraft({
                    afterRoundNumber: nextRound,
                    durationMinutes: 10,
                  }),
                ],
                mainPause: undefined,
              };
            })
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          Pause hinzufügen
        </button>
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
      <ScheduleFitPanel payload={{ ...payload, planner }} categoryContext={categoryContext} />

      <h3 className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        Spielplanvorschau
      </h3>
      <ComposerSchedulePreviewPanel
        payload={{ ...payload, planner }}
        categoryContext={categoryContext}
        tenantClubName={tenantClubName}
        tenantLogoUrl={tenantLogoUrl}
      />
    </PlanningEditorSection>
  );
}
