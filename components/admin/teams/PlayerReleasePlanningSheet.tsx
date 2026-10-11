"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { PLAYER_RELEASE_REASON_OPTIONS } from "@/lib/match-squad/player-release-presentation";
import type {
  PlayerReleasePlanningActivityCandidate,
  PlayerReleasePlanningCandidatesResult,
  PlayerReleasePlanReview,
} from "@/lib/match-squad/player-release-planning-service";

type Props = {
  open: boolean;
  onClose: () => void;
  teamId: string;
  teamSeasonId: string;
  personIds: string[];
  personLabels: Record<string, string>;
  onCompleted: () => void | Promise<void>;
};

type ActivityDefaults = Record<string, { maxMinutes: string; reason: string }>;

export default function PlayerReleasePlanningSheet({
  open,
  onClose,
  teamId,
  teamSeasonId,
  personIds,
  personLabels,
  onCompleted,
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

  const apiPlanBase = `/api/teams/${teamId}/team-seasons/${teamSeasonId}/player-releases/plan`;

  const reset = useCallback(() => {
    setCandidates(null);
    setSelectedEventIds(new Set());
    setReview(null);
    setShowDetails(false);
    setActivityDefaults({});
    setError(null);
    setSuccessCount(null);
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
      body: JSON.stringify({ personIds }),
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
  }, [open, apiPlanBase, personIds, reset]);

  const flatActivities = useMemo(() => {
    const rows: PlayerReleasePlanningActivityCandidate[] = [];
    for (const group of candidates?.activitiesByDate ?? []) {
      rows.push(...group.activities);
    }
    return rows;
  }, [candidates?.activitiesByDate]);

  function toggleActivity(eventId: string) {
    setReview(null);
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
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

  const footer = successCount != null ? (
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
      description={`${playerSummary} Spieler · Einsätze über mehrere Teams hinweg wählen.`}
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

      {successCount == null && candidates?.sourceTeamContext.lines.length ? (
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
                <p className="text-sm font-semibold text-[var(--text-1)]">Einsätze</p>
                <p className="text-xs text-[var(--muted)]">Chronologisch · Zielteam sichtbar</p>
              </div>
              <p className="text-xs text-[var(--text-2)]" data-testid="player-release-plan-preview-counts">
                {playerSummary} Spieler · {activitySummary} Einsätze · {releasePreview} Freigaben
              </p>
            </div>

            <div className="mt-3 space-y-4">
              {candidates.activitiesByDate.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Keine passenden Einsätze in den nächsten Wochen.</p>
              ) : null}
              {candidates.activitiesByDate.map((group) => (
                <div key={group.dateGroupKey}>
                  <p className="text-xs font-semibold text-[var(--text-2)]">{group.dateLine}</p>
                  <ul className="mt-2 space-y-2">
                    {group.activities.map((activity) => {
                      const selected = selectedEventIds.has(activity.eventId);
                      return (
                        <li key={activity.eventId}>
                          <button
                            type="button"
                            disabled={!activity.selectable}
                            onClick={() => toggleActivity(activity.eventId)}
                            className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm transition ${
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
                                {activity.timeLine} · {activity.headline}
                              </span>
                              {activity.subline ? (
                                <span className="mt-0.5 block text-[var(--text-2)]">{activity.subline}</span>
                              ) : null}
                              {activity.locationLine ? (
                                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                                  {activity.locationLine}
                                </span>
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
                    })}
                  </ul>
                </div>
              ))}
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
                        {activity?.dateLine} · {activity?.headline}
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
              <ul className="mt-3 space-y-2">
                {review.activities.map((activity) => {
                  const count = review.combinations.filter(
                    (row) => row.eventId === activity.eventId && row.state !== "INVALID",
                  ).length;
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
            </div>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
