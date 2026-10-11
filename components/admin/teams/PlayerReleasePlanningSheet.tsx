"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { PLAYER_RELEASE_REASON_OPTIONS } from "@/lib/match-squad/player-release-presentation";
import type { PlayerReleasePlannerEntryPoint } from "@/lib/match-squad/player-release-planner-context";
import { buildPlannerCandidatesRequestBody } from "@/lib/match-squad/player-release-planner-context";
import type {
  PlayerReleasePlanningActivityCandidate,
  PlayerReleasePlanningCandidatesResult,
  PlayerReleasePlanningTargetTeam,
  PlayerReleasePlanReview,
} from "@/lib/match-squad/player-release-planning-service";
import { partitionTargetTeamActivities } from "@/lib/match-squad/player-release-planning-sort";

const TARGET_TEAM_SEARCH_THRESHOLD = 10;

type PlannerView = "teams" | "activities";

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

function eventIdsForTeam(team: PlayerReleasePlanningTargetTeam): Set<string> {
  return new Set(team.activities.map((row) => row.eventId));
}

function assertTeamActivitiesOwnership(
  teamSeasonId: string,
  activities: PlayerReleasePlanningActivityCandidate[],
): void {
  if (process.env.NODE_ENV === "production") return;
  for (const activity of activities) {
    if (activity.targetTeamSeasonId !== teamSeasonId) {
      throw new Error(
        `Activity ${activity.eventId} belongs to ${activity.targetTeamSeasonId}, expected ${teamSeasonId}`,
      );
    }
  }
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
  const [plannerView, setPlannerView] = useState<PlannerView>("teams");
  const [activeTargetTeamSeasonId, setActiveTargetTeamSeasonId] = useState<string | null>(null);
  const [draftEventIds, setDraftEventIds] = useState<Set<string>>(new Set());
  const [showMoreActivities, setShowMoreActivities] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const teamRowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const activitiesHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusTeamRowOnTeamsView = useRef<string | null>(null);

  const apiPlanBase = `/api/teams/${teamId}/team-seasons/${teamSeasonId}/player-releases/plan`;

  const reset = useCallback(() => {
    setCandidates(null);
    setSelectedEventIds(new Set());
    setReview(null);
    setShowDetails(false);
    setActivityDefaults({});
    setError(null);
    setSuccessCount(null);
    setPlannerView("teams");
    setActiveTargetTeamSeasonId(null);
    setDraftEventIds(new Set());
    setShowMoreActivities(false);
    setTeamSearchQuery("");
    focusTeamRowOnTeamsView.current = null;
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
          setPlannerView("teams");
          setActiveTargetTeamSeasonId(null);
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

  const activeTargetTeam = useMemo(() => {
    if (!candidates || !activeTargetTeamSeasonId) return null;
    return (
      candidates.targetTeams.find((team) => team.targetTeamSeasonId === activeTargetTeamSeasonId) ??
      null
    );
  }, [activeTargetTeamSeasonId, candidates]);

  const visibleTargetTeams = useMemo(() => {
    if (!candidates) return [];
    return candidates.targetTeams.filter((team) => team.activityCount > 0 && team.activities.length > 0);
  }, [candidates]);

  const filteredTargetTeams = useMemo(() => {
    const query = teamSearchQuery.trim().toLowerCase();
    if (!query) return visibleTargetTeams;
    return visibleTargetTeams.filter((team) => team.targetTeamLabel.toLowerCase().includes(query));
  }, [teamSearchQuery, visibleTargetTeams]);

  useEffect(() => {
    if (plannerView !== "activities") return;
    activitiesHeadingRef.current?.focus();
  }, [plannerView, activeTargetTeamSeasonId]);

  useEffect(() => {
    if (plannerView !== "teams" || !focusTeamRowOnTeamsView.current) return;
    const row = teamRowRefs.current.get(focusTeamRowOnTeamsView.current);
    focusTeamRowOnTeamsView.current = null;
    row?.focus();
  }, [plannerView, filteredTargetTeams]);

  function openTeamActivities(teamSeasonId: string) {
    const team = candidates?.targetTeams.find((row) => row.targetTeamSeasonId === teamSeasonId);
    if (!team) return;
    assertTeamActivitiesOwnership(teamSeasonId, team.activities);
    const committed = new Set<string>();
    for (const activity of team.activities) {
      if (selectedEventIds.has(activity.eventId)) committed.add(activity.eventId);
    }
    setReview(null);
    setShowDetails(false);
    setShowMoreActivities(false);
    setDraftEventIds(committed);
    setActiveTargetTeamSeasonId(teamSeasonId);
    setPlannerView("activities");
  }

  function backToTeamsWithoutApply() {
    if (activeTargetTeamSeasonId) {
      focusTeamRowOnTeamsView.current = activeTargetTeamSeasonId;
    }
    setShowDetails(false);
    setShowMoreActivities(false);
    setDraftEventIds(new Set());
    setActiveTargetTeamSeasonId(null);
    setPlannerView("teams");
  }

  function applyTeamActivities() {
    if (!activeTargetTeam) return;
    const teamEventIds = eventIdsForTeam(activeTargetTeam);
    setReview(null);
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      for (const eventId of teamEventIds) next.delete(eventId);
      for (const eventId of draftEventIds) {
        if (teamEventIds.has(eventId)) next.add(eventId);
      }
      return next;
    });
    focusTeamRowOnTeamsView.current = activeTargetTeam.targetTeamSeasonId;
    setShowDetails(false);
    setShowMoreActivities(false);
    setDraftEventIds(new Set());
    setActiveTargetTeamSeasonId(null);
    setPlannerView("teams");
  }

  function toggleDraftActivity(eventId: string) {
    setDraftEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  function selectAllDraftInTeam(activities: PlayerReleasePlanningActivityCandidate[]) {
    setDraftEventIds((prev) => {
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
  const draftSelectionCount = draftEventIds.size;

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
      ? `${playerSummary} Spieler · Zielteam wählen, dann passende Einsätze.`
      : `${playerSummary} Spieler · Zielteams und Einsätze schrittweise wählen.`;

  const activityPartition = useMemo(() => {
    if (!activeTargetTeam) return { primary: [] as PlayerReleasePlanningActivityCandidate[], more: [] };
    assertTeamActivitiesOwnership(activeTargetTeamSeasonId!, activeTargetTeam.activities);
    return partitionTargetTeamActivities(activeTargetTeam, sourceStartAt, timeZone);
  }, [activeTargetTeam, activeTargetTeamSeasonId, sourceStartAt, timeZone]);

  const visibleTeamActivities = showMoreActivities
    ? [...activityPartition.primary, ...activityPartition.more]
    : activityPartition.primary;

  const footer =
    successCount != null ? (
      <Button variant="primary" size="sm" onClick={onClose}>
        Schliessen
      </Button>
    ) : plannerView === "activities" && !review ? (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={backToTeamsWithoutApply}
          disabled={submitting}
          data-testid="player-release-plan-back-teams"
        >
          ← Teams
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={applyTeamActivities}
          disabled={loading}
          data-testid="player-release-plan-apply-team"
        >
          {draftSelectionCount > 0
            ? `${draftSelectionCount} Einsatz${draftSelectionCount === 1 ? "" : "e"} übernehmen`
            : "Übernehmen"}
        </Button>
      </>
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

          {plannerView === "teams" ? (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">Freigeben für</p>
                  <p className="text-xs text-[var(--muted)]">
                    {entryPoint === "MATCH_AUFGEBOT"
                      ? "Mannschaft wählen · Einsätze im nächsten Schritt"
                      : "Mannschaft wählen · Einsätze im nächsten Schritt"}
                  </p>
                </div>
                <p
                  className="text-xs text-[var(--text-2)]"
                  data-testid="player-release-plan-preview-counts"
                >
                  {playerSummary} Spieler · {activitySummary} Einsätze · {releasePreview} Freigaben
                </p>
              </div>

              {visibleTargetTeams.length >= TARGET_TEAM_SEARCH_THRESHOLD ? (
                <div className="mt-3">
                  <input
                    type="search"
                    value={teamSearchQuery}
                    onChange={(event) => setTeamSearchQuery(event.target.value)}
                    placeholder="Team suchen…"
                    className="fca-input h-9 w-full text-sm"
                    data-testid="player-release-plan-team-search"
                    aria-label="Team suchen"
                  />
                </div>
              ) : null}

              <div className="mt-3 space-y-2" data-testid="player-release-plan-target-teams">
                {filteredTargetTeams.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    {visibleTargetTeams.length === 0
                      ? "Keine passenden Einsätze in den nächsten Wochen."
                      : "Kein Team entspricht der Suche."}
                  </p>
                ) : null}
                {filteredTargetTeams.map((team) => {
                  const selectedInTeam = selectedCountForTeam(
                    team.targetTeamSeasonId,
                    team.activities,
                    selectedEventIds,
                  );
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
                        ref={(node) => {
                          if (node) teamRowRefs.current.set(team.targetTeamSeasonId, node);
                          else teamRowRefs.current.delete(team.targetTeamSeasonId);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                        aria-label={`${team.targetTeamLabel}, ${summaryLine}`}
                        onClick={() => openTeamActivities(team.targetTeamSeasonId)}
                        data-testid={`player-release-plan-team-open-${team.targetTeamSeasonId}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--text-1)]">
                            {team.targetTeamLabel}
                          </span>
                          <span className="block text-xs text-[var(--text-2)]">{summaryLine}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {plannerView === "activities" && activeTargetTeam ? (
            <div data-testid="player-release-plan-team-activities-view">
              <button
                type="button"
                className="text-xs font-semibold text-[var(--sce-primary)]"
                onClick={backToTeamsWithoutApply}
                data-testid="player-release-plan-back-teams-inline"
              >
                ← Freigeben für
              </button>
              <h3
                ref={activitiesHeadingRef}
                tabIndex={-1}
                className="mt-2 text-sm font-semibold text-[var(--text-1)] outline-none"
              >
                {activeTargetTeam.targetTeamLabel}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {activeTargetTeam.activityCount} passende Einsätze
              </p>

              {activeTargetTeam.activities.filter((row) => row.selectable).length > 1 ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[var(--sce-primary)]"
                  onClick={() => selectAllDraftInTeam(activeTargetTeam.activities)}
                  data-testid={`player-release-plan-select-all-${activeTargetTeam.targetTeamSeasonId}`}
                >
                  Alle auswählen
                </button>
              ) : null}

              <ul className="mt-3 space-y-2">
                {visibleTeamActivities.map((activity) => (
                  <ActivitySelectRow
                    key={activity.eventId}
                    activity={activity}
                    selected={draftEventIds.has(activity.eventId)}
                    onToggle={() => toggleDraftActivity(activity.eventId)}
                  />
                ))}
              </ul>

              {activityPartition.more.length > 0 && !showMoreActivities ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[var(--text-2)] underline-offset-2 hover:underline"
                  onClick={() => setShowMoreActivities(true)}
                  data-testid={`player-release-plan-more-${activeTargetTeam.targetTeamSeasonId}`}
                >
                  Weitere Einsätze ({activityPartition.more.length})
                </button>
              ) : null}

              <div className="mt-4 rounded-lg border border-[var(--border)]">
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
                  <div
                    id={detailsPanelId}
                    className="space-y-4 border-t border-[var(--border)] px-3 py-3"
                  >
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
                    {[...draftEventIds].map((eventId) => {
                      const activity = activeTargetTeam.activities.find((row) => row.eventId === eventId);
                      const state = activityDefaults[eventId] ?? { maxMinutes: "", reason: defaultReason };
                      return (
                        <div
                          key={eventId}
                          className="rounded-md border border-[var(--border)] p-3 text-sm"
                        >
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
            </div>
          ) : null}

          {review && plannerView === "teams" ? (
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
