"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { PLAYER_RELEASE_REASON_OPTIONS } from "@/lib/match-squad/player-release-presentation";
import type { PlayerReleasePlannerEntryPoint } from "@/lib/match-squad/player-release-planner-context";
import { buildPlannerCandidatesRequestBody } from "@/lib/match-squad/player-release-planner-context";
import type {
  PlayerReleasePlanningActivityCandidate,
  PlayerReleasePlanningCandidatesResult,
  PlayerReleasePlanReview,
} from "@/lib/match-squad/player-release-planning-service";
import { partitionTargetTeamActivities } from "@/lib/match-squad/player-release-planning-sort";

type Props = {
  open: boolean;
  onClose: () => void;
  teamId: string;
  teamSeasonId: string;
  personIds: string[];
  personLabels: Record<string, string>;
  onCompleted: () => void | Promise<void>;
  entryPoint?: PlayerReleasePlannerEntryPoint;
  sourceEventId?: string;
  timeZone?: string;
};

type ActivityDefaults = Record<string, { maxMinutes: string; reason: string }>;

function selectedCountForTeam(
  teamSeasonId: string,
  activities: PlayerReleasePlanningActivityCandidate[],
  selectedEventIds: Set<string>,
): number {
  return activities.filter(
    (row) => row.targetTeamSeasonId === teamSeasonId && selectedEventIds.has(row.eventId),
  ).length;
}

function ActivitySelectRow({
  activity,
  selected,
  onToggle,
}: {
  activity: PlayerReleasePlanningActivityCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={!activity.selectable}
        onClick={onToggle}
        className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
          selected
            ? "border-[var(--sce-primary)] bg-[var(--sce-primary)]/8"
            : "border-[var(--border)] bg-[var(--surface)]"
        } ${!activity.selectable ? "opacity-50" : "hover:border-[var(--sce-primary)]/40"}`}
        data-testid={`player-release-plan-activity-${activity.eventId}`}
        aria-pressed={selected}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            selected
              ? "border-[var(--sce-primary)] bg-[var(--sce-primary)] text-white"
              : "border-[var(--border)]"
          }`}
          aria-hidden
        >
          {selected ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-medium text-[var(--text-1)]">
            {activity.dateLine} · {activity.timeLine}
          </span>
          <span className="mt-0.5 block text-[var(--text-2)]">{activity.headline}</span>
          {activity.locationLine ? (
            <span className="mt-0.5 block text-xs text-[var(--muted)]">{activity.locationLine}</span>
          ) : null}
          {activity.partialEligibilityNote ? (
            <span className="mt-1 block text-xs text-[var(--warning)]">
              {activity.partialEligibilityNote}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

export default function PlayerReleasePlanningSheet({
  open,
  onClose,
  teamId,
  teamSeasonId,
  personIds,
  personLabels,
  onCompleted,
  entryPoint = "TEAM_KADER",
  sourceEventId,
  timeZone = "Europe/Zurich",
}: Props) {
  const detailsPanelId = useId();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlayerReleasePlanningCandidatesResult | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<PlayerReleasePlanReview | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [defaultReason, setDefaultReason] = useState("SPIELPRAXIS");
  const [activityDefaults, setActivityDefaults] = useState<ActivityDefaults>({});
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
  const [showMoreTeamIds, setShowMoreTeamIds] = useState<Set<string>>(new Set());

  const apiPlanBase = `/api/teams/${teamId}/team-seasons/${teamSeasonId}/player-releases/plan`;

  const reset = useCallback(() => {
    setCandidates(null);
    setSelectedEventIds(new Set());
    setReview(null);
    setShowDetails(false);
    setActivityDefaults({});
    setError(null);
    setSuccessCount(null);
    setExpandedTeamIds(new Set());
    setShowMoreTeamIds(new Set());
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(`${apiPlanBase}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildPlannerCandidatesRequestBody({
          personIds,
          sourceEventId,
          entryPoint,
        }),
      ),
    })
      .then(async (response) => {
        const json = (await response.json()) as PlayerReleasePlanningCandidatesResult & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "Einsätze konnten nicht geladen werden.");
        }
        if (!cancelled) {
          setCandidates(json);
          if (json.targetTeams?.length === 1) {
            setExpandedTeamIds(new Set([json.targetTeams[0].targetTeamSeasonId]));
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, apiPlanBase, personIds, sourceEventId, entryPoint, reset]);

  const flatActivities = useMemo(() => {
    const rows: PlayerReleasePlanningActivityCandidate[] = [];
    if (candidates?.targetTeams?.length) {
      for (const team of candidates.targetTeams) {
        rows.push(...team.activities);
      }
      return rows;
    }
    for (const group of candidates?.activitiesByDate ?? []) {
      rows.push(...group.activities);
    }
    return rows;
  }, [candidates?.activitiesByDate, candidates?.targetTeams]);

  const sourceStartAt = useMemo(() => {
    const startAt = candidates?.sourceEventContext?.startAt;
    return startAt ? new Date(startAt) : null;
  }, [candidates?.sourceEventContext?.startAt]);

  function toggleActivity(eventId: string) {
    setReview(null);
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  function toggleTeamExpanded(teamSeasonId: string) {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamSeasonId)) next.delete(teamSeasonId);
      else next.add(teamSeasonId);
      return next;
    });
  }

  function selectAllInTeam(activities: PlayerReleasePlanningActivityCandidate[]) {
    setReview(null);
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      for (const activity of activities) {
        if (activity.selectable) next.add(activity.eventId);
      }
      return next;
    });
  }

  async function runReview() {
    if (selectedEventIds.size === 0) {
      setError("Bitte mindestens einen Einsatz wählen.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const defaultsPayload: Record<string, { maxMinutes?: number | null; reason?: string }> = {};
      for (const eventId of selectedEventIds) {
        const row = activityDefaults[eventId];
        if (!row) continue;
        defaultsPayload[eventId] = {
          maxMinutes: row.maxMinutes.trim() === "" ? null : Number(row.maxMinutes),
          reason: row.reason || defaultReason,
        };
      }

      const response = await fetch(apiPlanBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          personIds,
          eventIds: [...selectedEventIds],
          defaultReason,
          activityDefaults: defaultsPayload,
          sourceEventId,
        }),
      });
      const json = (await response.json()) as { review?: PlayerReleasePlanReview; error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Plan konnte nicht geprüft werden.");
      }
      setReview(json.review ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan konnte nicht geprüft werden.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!review || review.validReleaseCount === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const defaultsPayload: Record<string, { maxMinutes?: number | null; reason?: string }> = {};
      for (const eventId of selectedEventIds) {
        const row = activityDefaults[eventId];
        if (!row) continue;
        defaultsPayload[eventId] = {
          maxMinutes: row.maxMinutes.trim() === "" ? null : Number(row.maxMinutes),
          reason: row.reason || defaultReason,
        };
      }

      const response = await fetch(apiPlanBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          personIds,
          eventIds: [...selectedEventIds],
          defaultReason,
          activityDefaults: defaultsPayload,
          sourceEventId,
        }),
      });
      const json = (await response.json()) as { createdReleaseIds?: string[]; error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Freigaben konnten nicht erstellt werden.");
      }
      setSuccessCount(json.createdReleaseIds?.length ?? review.validReleaseCount);
      await onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Freigaben konnten nicht erstellt werden.");
    } finally {
      setSubmitting(false);
    }
  }

  const playerSummary = personIds.length;
  const activitySummary = selectedEventIds.size;
  const releasePreview = playerSummary * activitySummary;

  const reviewByTeam = useMemo(() => {
    if (!review) return [];
    const map = new Map<
      string,
      { label: string; rows: { activity: PlayerReleasePlanningActivityCandidate; count: number }[] }
    >();
    for (const activity of review.activities) {
      const count = review.combinations.filter(
        (row) => row.eventId === activity.eventId && row.state !== "INVALID",
      ).length;
      const bucket = map.get(activity.targetTeamSeasonId) ?? {
        label: activity.targetTeamLabel,
        rows: [],
      };
      bucket.rows.push({ activity, count });
      map.set(activity.targetTeamSeasonId, bucket);
    }
    return [...map.values()];
  }, [review]);

  const sheetDescription =
    entryPoint === "MATCH_AUFGEBOT"
      ? `${playerSummary} Spieler · Zielteams und Einsätze in einem Plan wählen.`
      : `${playerSummary} Spieler · Einsätze über mehrere Teams hinweg wählen.`;

  const footer =
    successCount != null ? (
      <Button variant="primary" size="sm" onClick={onClose}>
        Schliessen
      </Button>
    ) : (
      <>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
          Abbrechen
        </Button>
        {review ? (
          <Button
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={review.validReleaseCount === 0}
            onClick={() => void handleConfirm()}
            data-testid="player-release-plan-confirm"
          >
            {review.validReleaseCount === 1
              ? "1 Freigabe erstellen"
              : `${review.validReleaseCount} Freigaben erstellen`}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={selectedEventIds.size === 0 || loading}
            onClick={() => void runReview()}
            data-testid="player-release-plan-review"
          >
            Übersicht
          </Button>
        )}
      </>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Spielerfreigaben planen"
      description={sheetDescription}
      footer={footer}
      data-testid="player-release-planning-sheet"
    >
      {successCount != null ? (
        <div className="space-y-2 text-sm" data-testid="player-release-plan-success">
          <p className="font-semibold text-[var(--text-1)]">
            {successCount === 1 ? "1 Freigabe erstellt" : `${successCount} Freigaben erstellt`}
          </p>
          <p className="text-[var(--text-2)]">
            {playerSummary} Spieler · {activitySummary} Einsätze
          </p>
        </div>
      ) : null}

      {successCount == null && loading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Einsätze werden geladen…
        </p>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {successCount == null && candidates?.sourceEventContext ? (
        <div
          className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="player-release-plan-source-match"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Ausgehend von
          </p>
          <p className="mt-1 font-medium text-[var(--text-1)]">
            {candidates.sourceTeamContext.label} · {candidates.sourceEventContext.dateLine} ·{" "}
            {candidates.sourceEventContext.timeLine}
          </p>
          {candidates.sourceEventContext.title ? (
            <p className="text-[var(--text-2)]">vs {candidates.sourceEventContext.title}</p>
          ) : null}
        </div>
      ) : null}

      {successCount == null &&
      candidates?.sourceTeamContext.lines.length &&
      !candidates.sourceEventContext ? (
        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-2)]">
          {candidates.sourceTeamContext.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}

      {successCount == null && !loading && candidates ? (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Spieler</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {personIds.map((id) => (
                <li
                  key={id}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-1)]"
                >
                  {personLabels[id] ?? id}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text-1)]">Freigeben für</p>
                <p className="text-xs text-[var(--muted)]">
                  {entryPoint === "MATCH_AUFGEBOT"
                    ? "Zielteams · passende Einsätze in der Nähe des Spiels"
                    : "Zielteams · kommende Einsätze"}
                </p>
              </div>
              <p className="text-xs text-[var(--text-2)]" data-testid="player-release-plan-preview-counts">
                {playerSummary} Spieler · {activitySummary} Einsätze · {releasePreview} Freigaben
              </p>
            </div>

            <div className="mt-3 space-y-2" data-testid="player-release-plan-target-teams">
              {candidates.targetTeams.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Keine passenden Einsätze in den nächsten Wochen.
                </p>
              ) : null}
              {candidates.targetTeams.map((team) => {
                const selectedInTeam = selectedCountForTeam(
                  team.targetTeamSeasonId,
                  team.activities,
                  selectedEventIds,
                );
                const expanded = expandedTeamIds.has(team.targetTeamSeasonId);
                const showMore = showMoreTeamIds.has(team.targetTeamSeasonId);
                const { primary, more } = partitionTargetTeamActivities(
                  team,
                  sourceStartAt,
                  timeZone,
                );
                const visibleActivities = showMore ? [...primary, ...more] : primary;

                const summaryLine =
                  selectedInTeam > 0
                    ? `${selectedInTeam} Einsatz${selectedInTeam === 1 ? "" : "e"} ausgewählt`
                    : `${team.activityCount} passende Einsätze`;

                return (
                  <div
                    key={team.targetTeamSeasonId}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                    data-testid={`player-release-plan-team-${team.targetTeamSeasonId}`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                      aria-expanded={expanded}
                      onClick={() => toggleTeamExpanded(team.targetTeamSeasonId)}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[var(--text-1)]">
                          {team.targetTeamLabel}
                        </span>
                        <span className="block text-xs text-[var(--text-2)]">{summaryLine}</span>
                      </span>
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                      )}
                    </button>
                    {expanded ? (
                      <div className="border-t border-[var(--border)] px-3 py-3">
                        {team.activities.filter((row) => row.selectable).length > 1 ? (
                          <button
                            type="button"
                            className="mb-2 text-xs font-semibold text-[var(--sce-primary)]"
                            onClick={() => selectAllInTeam(team.activities)}
                            data-testid={`player-release-plan-select-all-${team.targetTeamSeasonId}`}
                          >
                            Alle auswählen
                          </button>
                        ) : null}
                        <ul className="space-y-2">
                          {visibleActivities.map((activity) => (
                            <ActivitySelectRow
                              key={activity.eventId}
                              activity={activity}
                              selected={selectedEventIds.has(activity.eventId)}
                              onToggle={() => toggleActivity(activity.eventId)}
                            />
                          ))}
                        </ul>
                        {more.length > 0 && !showMore ? (
                          <button
                            type="button"
                            className="mt-3 text-xs font-semibold text-[var(--text-2)] underline-offset-2 hover:underline"
                            onClick={() =>
                              setShowMoreTeamIds((prev) => {
                                const next = new Set(prev);
                                next.add(team.targetTeamSeasonId);
                                return next;
                              })
                            }
                            data-testid={`player-release-plan-more-${team.targetTeamSeasonId}`}
                          >
                            Weitere Einsätze ({more.length})
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-[var(--text-1)]"
              aria-expanded={showDetails}
              aria-controls={detailsPanelId}
              onClick={() => setShowDetails((value) => !value)}
              data-testid="player-release-plan-details-toggle"
            >
              Details anpassen
              {showDetails ? (
                <ChevronUp className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden />
              )}
            </button>
            {showDetails ? (
              <div id={detailsPanelId} className="space-y-4 border-t border-[var(--border)] px-3 py-3">
                <label className="block text-sm">
                  <span className="text-xs font-medium text-[var(--text-2)]">Standard-Grund</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    value={defaultReason}
                    onChange={(event) => setDefaultReason(event.target.value)}
                  >
                    {PLAYER_RELEASE_REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {[...selectedEventIds].map((eventId) => {
                  const activity = flatActivities.find((row) => row.eventId === eventId);
                  const state = activityDefaults[eventId] ?? { maxMinutes: "", reason: defaultReason };
                  return (
                    <div key={eventId} className="rounded-md border border-[var(--border)] p-3 text-sm">
                      <p className="font-medium text-[var(--text-1)]">
                        {activity?.targetTeamLabel} · {activity?.dateLine} · {activity?.headline}
                      </p>
                      <label className="mt-2 block">
                        <span className="text-xs text-[var(--text-2)]">Max. Minuten (optional)</span>
                        <input
                          type="number"
                          min={1}
                          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                          value={state.maxMinutes}
                          onChange={(event) =>
                            setActivityDefaults((prev) => ({
                              ...prev,
                              [eventId]: { ...state, maxMinutes: event.target.value },
                            }))
                          }
                          data-testid={`player-release-plan-max-${eventId}`}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {review ? (
            <div
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm"
              data-testid="player-release-plan-review-panel"
            >
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="text-xs uppercase text-[var(--muted)]">Spieler</dt>
                  <dd className="text-lg font-semibold">{review.playerCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--muted)]">Einsätze</dt>
                  <dd className="text-lg font-semibold">{review.activityCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--muted)]">Freigaben</dt>
                  <dd className="text-lg font-semibold">{review.validReleaseCount}</dd>
                </div>
              </dl>
              {review.invalidNote ? (
                <p className="mt-3 text-xs text-[var(--warning)]">{review.invalidNote}</p>
              ) : null}
              <ul className="mt-3 space-y-3">
                {reviewByTeam.map((group) => (
                  <li key={group.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
                      {group.label}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {group.rows.map(({ activity, count }) => {
                        const maxDefault = activityDefaults[activity.eventId]?.maxMinutes;
                        return (
                          <li key={activity.eventId} className="text-[var(--text-2)]">
                            {activity.dateLine} · {activity.headline}
                            <span className="text-[var(--text-1)]"> — {count} Spieler</span>
                            {maxDefault?.trim() ? (
                              <span className="text-[var(--muted)]"> · Max. {maxDefault} Min.</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
