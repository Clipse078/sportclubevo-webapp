"use client";

import { EventSource, EventType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { updatePlannerEntryAction } from "@/app/(admin)/dashboard/planner/actions";
import PlannerEntryDeleteButton from "@/components/admin/planner/PlannerEntryDeleteButton";
import PlannerEntryPublicationFields from "@/components/admin/planner/PlannerEntryPublicationFields";
import {
  buildMatchEditSubtitle,
  formatPlannerEditScheduleLine,
  plannerEditPageTitle,
} from "@/lib/planner/planner-entry-edit-copy";
import {
  getPlannerPublicationRowsForType,
  hiddenPublicationFieldKeys,
  type PlannerPublicationValues,
} from "@/lib/planner/planner-entry-publication-config";
import {
  MATCH_END_TIME_MISSING_HEADLINE,
  matchRequiresEndTimeAction,
} from "@/lib/match/match-operational-completeness";
import { formatAutomaticEndProvenanceLabel } from "@/lib/match/match-operational-interval-presenters";
import type {
  MatchOperationalDurationSource,
  MatchOperationalEndSource,
} from "@/lib/match/resolve-match-operational-interval";
import { cn } from "@/lib/cn";

type PlannerEditFormData = {
  seasons: Array<{
    id: string;
    key: string;
    name: string;
    isActive: boolean;
  }>;
  teams: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  selectedSeasonKey: string;
  selectedSeasonId: string;
  selectedType: EventType;
  backHref: string;
  eventId: string;
  teamName: string | null;
  seasonName: string;
  defaults: {
    title: string;
    source: EventSource;
    teamId: string;
    location: string;
    startAt: string;
    endAt: string;
    operationalEndAtOverride: string;
    opponentName: string;
    organizerName: string;
    competitionLabel: string;
    description: string;
    remarks: string;
    websiteVisible: boolean;
    infoboardVisible: boolean;
    homepageVisible: boolean;
    wochenplanVisible: boolean;
    trainingsplanVisible: boolean;
    teamPageVisible: boolean;
  };
  matchOperationalInterval: {
    endSource: MatchOperationalEndSource;
    durationSource: MatchOperationalDurationSource;
    durationMinutes: number;
    operationalEndAtIso: string;
  } | null;
};

type PlannerEntryEditFormProps = {
  data: PlannerEditFormData;
  canManage: boolean;
};

const SOURCE_LABELS: Record<EventSource, string> = {
  MANUAL: "Manuell",
  CLUBCORNER_FVNWS: "FVNWS API",
  CSV_EXCEL_IMPORT: "CSV / Excel",
  MUNICIPALITY_API: "Gemeinde API",
  SFV: "SFV",
};

function isExternallySynchronizedSource(source: EventSource): boolean {
  return source === EventSource.CLUBCORNER_FVNWS || source === EventSource.SFV;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="fca-label block text-[var(--text-2)]">{children}</label>
  );
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-sm text-[var(--foreground)]">{children}</p>
  );
}

function toOperationalEndLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function PlannerEntryEditForm({
  data,
  canManage,
}: PlannerEntryEditFormProps) {
  const router = useRouter();
  const defaults = data.defaults;
  const isExternallyOwned = isExternallySynchronizedSource(defaults.source);
  const isCoreReadonly = !canManage || isExternallyOwned;
  const isMatch = data.selectedType === EventType.MATCH;
  const showMatchOperationalEnd = isMatch && isExternallyOwned;

  const [startAt, setStartAt] = useState(defaults.startAt);
  const [endAt, setEndAt] = useState(defaults.endAt);
  const [operationalEndLocal, setOperationalEndLocal] = useState(() => {
    if (defaults.operationalEndAtOverride) return defaults.operationalEndAtOverride;
    return data.matchOperationalInterval
      ? toOperationalEndLocalValue(data.matchOperationalInterval.operationalEndAtIso)
      : "";
  });
  const [operationalProvenance, setOperationalProvenance] = useState(
    () => data.matchOperationalInterval,
  );
  const [operationalSaving, setOperationalSaving] = useState(false);
  const [operationalError, setOperationalError] = useState<string | null>(null);
  const [publication, setPublication] = useState<PlannerPublicationValues>({
    websiteVisible: defaults.websiteVisible,
    infoboardVisible: defaults.infoboardVisible,
    homepageVisible: defaults.homepageVisible,
    wochenplanVisible: defaults.wochenplanVisible,
    trainingsplanVisible: defaults.trainingsplanVisible,
    teamPageVisible: defaults.teamPageVisible,
  });

  const publicationRows = useMemo(
    () => getPlannerPublicationRowsForType(data.selectedType),
    [data.selectedType],
  );

  const hiddenPublicationKeys = useMemo(
    () => hiddenPublicationFieldKeys(data.selectedType),
    [data.selectedType],
  );

  const endTimeWarning = useMemo(() => {
    if (!isMatch || showMatchOperationalEnd) {
      return false;
    }
    return matchRequiresEndTimeAction({
      startAt: startAt || defaults.startAt,
      endAt: endAt,
    });
  }, [isMatch, showMatchOperationalEnd, startAt, endAt, defaults.startAt]);

  const operationalEndHint = useMemo(() => {
    if (!operationalProvenance) return null;
    return formatAutomaticEndProvenanceLabel({
      endSource: operationalProvenance.endSource,
      durationSource: operationalProvenance.durationSource,
      durationMinutes: operationalProvenance.durationMinutes,
    });
  }, [operationalProvenance]);

  const pageTitle = plannerEditPageTitle(data.selectedType);
  const subtitle =
    data.selectedType === EventType.MATCH
      ? buildMatchEditSubtitle({
          teamName: data.teamName,
          opponentName: defaults.opponentName,
          title: defaults.title,
        })
      : defaults.title;

  const displayEndForHeader = showMatchOperationalEnd
    ? operationalEndLocal || data.matchOperationalInterval?.operationalEndAtIso || null
    : endAt || null;
  const scheduleLine = formatPlannerEditScheduleLine(
    startAt || defaults.startAt,
    displayEndForHeader,
  );

  async function saveOperationalEnd(overrideValue: string | null) {
    if (!canManage || !showMatchOperationalEnd) return;
    setOperationalSaving(true);
    setOperationalError(null);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(data.eventId)}/operational-end`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          overrideValue === null
            ? { reset: true }
            : { operationalEndAtOverride: overrideValue },
        ),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        operationalEndAtOverride?: string | null;
      };
      if (!res.ok) {
        throw new Error(body?.error ?? "Speichern fehlgeschlagen");
      }
      router.refresh();
    } catch (err) {
      setOperationalError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setOperationalSaving(false);
    }
  }

  const showMatchFields = data.selectedType === EventType.MATCH;
  const showTrainingFields = data.selectedType === EventType.TRAINING;
  const showCompetitionFields =
    showMatchFields || data.selectedType === EventType.TOURNAMENT;

  return (
    <div
      className="mx-auto w-full max-w-[72rem] space-y-6 pb-10"
      data-testid="planner-entry-edit"
    >
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {pageTitle}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
            {subtitle}
          </h1>
          {scheduleLine ? (
            <p className="text-sm text-[var(--muted)]">{scheduleLine}</p>
          ) : null}
          {isExternallyOwned ? (
            <p className="text-xs text-[var(--muted)]">
              Quelle: {SOURCE_LABELS[defaults.source] ?? defaults.source} ·
              Synchronisierte Felder sind schreibgeschützt
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={data.backHref}
            className="inline-flex h-9 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
          >
            Zurück
          </Link>
          {canManage && !isCoreReadonly ? (
            <button
              type="submit"
              form="planner-entry-edit-form"
              className="inline-flex h-9 items-center rounded-md bg-[var(--sce-primary)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
              data-testid="planner-edit-save-header"
            >
              Änderungen speichern
            </button>
          ) : null}
        </div>
      </header>

      <form
        id="planner-entry-edit-form"
        action={updatePlannerEntryAction}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start"
      >
        <input type="hidden" name="eventId" value={data.eventId} />
        <input type="hidden" name="seasonId" value={data.selectedSeasonId} />
        <input type="hidden" name="seasonKey" value={data.selectedSeasonKey} />
        <input type="hidden" name="type" value={data.selectedType} />
        <input type="hidden" name="source" value={defaults.source} />

        {hiddenPublicationKeys.map((key) =>
          publication[key] ? (
            <input key={key} type="hidden" name={key} value="on" />
          ) : null,
        )}

        <div className="space-y-8">
          <section className="space-y-4" aria-labelledby="planner-section-spiel">
            <h2
              id="planner-section-spiel"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              {showMatchFields ? "Spiel" : "Details"}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Titel</FieldLabel>
                {isCoreReadonly ? (
                  <ReadOnlyValue>{defaults.title}</ReadOnlyValue>
                ) : (
                  <input
                    name="title"
                    required
                    defaultValue={defaults.title}
                    className="fca-input mt-1.5 w-full"
                  />
                )}
              </div>

              <div>
                <FieldLabel>Saison</FieldLabel>
                <ReadOnlyValue>{data.seasonName}</ReadOnlyValue>
              </div>

              {!isExternallyOwned ? null : (
                <div>
                  <FieldLabel>Quelle</FieldLabel>
                  <ReadOnlyValue>
                    {SOURCE_LABELS[defaults.source] ?? defaults.source}
                  </ReadOnlyValue>
                </div>
              )}

              <div>
                <FieldLabel>Team</FieldLabel>
                {isCoreReadonly ? (
                  <ReadOnlyValue>
                    {data.teams.find((t) => t.id === defaults.teamId)?.name ??
                      "Kein Team"}
                  </ReadOnlyValue>
                ) : (
                  <select
                    name="teamId"
                    defaultValue={defaults.teamId}
                    className="fca-input mt-1.5 w-full"
                  >
                    <option value="">Kein Team</option>
                    {data.teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {showMatchFields ? (
                <div>
                  <FieldLabel>Gegner</FieldLabel>
                  {isCoreReadonly ? (
                    <ReadOnlyValue>{defaults.opponentName || "—"}</ReadOnlyValue>
                  ) : (
                    <input
                      name="opponentName"
                      defaultValue={defaults.opponentName}
                      className="fca-input mt-1.5 w-full"
                      placeholder="Optional"
                    />
                  )}
                </div>
              ) : null}

              {showCompetitionFields ? (
                <div className="sm:col-span-2">
                  <FieldLabel>Wettbewerb / Label</FieldLabel>
                  {isCoreReadonly ? (
                    <ReadOnlyValue>
                      {defaults.competitionLabel || "—"}
                    </ReadOnlyValue>
                  ) : (
                    <input
                      name="competitionLabel"
                      defaultValue={defaults.competitionLabel}
                      className="fca-input mt-1.5 w-full"
                    />
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="planner-section-termin">
            <h2
              id="planner-section-termin"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Termin
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Start</FieldLabel>
                {isCoreReadonly ? (
                  <ReadOnlyValue>
                    {formatPlannerEditScheduleLine(startAt, null)}
                  </ReadOnlyValue>
                ) : (
                  <input
                    type="datetime-local"
                    name="startAt"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="fca-input mt-1.5 w-full"
                    data-testid="planner-edit-start-at"
                  />
                )}
              </div>

              <div>
                <FieldLabel>Ende</FieldLabel>
                {showMatchOperationalEnd ? (
                  <div className="mt-1.5 space-y-2">
                    {canManage ? (
                      <input
                        type="datetime-local"
                        value={operationalEndLocal}
                        onChange={(e) => setOperationalEndLocal(e.target.value)}
                        className="fca-input w-full"
                        data-testid="planner-edit-operational-end-at"
                        disabled={operationalSaving}
                      />
                    ) : (
                      <ReadOnlyValue>
                        {operationalEndLocal
                          ? formatPlannerEditScheduleLine(operationalEndLocal, null)
                          : "—"}
                      </ReadOnlyValue>
                    )}
                    {operationalEndHint ? (
                      <p className="text-xs text-[var(--muted)]" data-testid="planner-operational-end-provenance">
                        {operationalEndHint}
                      </p>
                    ) : null}
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                          disabled={operationalSaving || !operationalEndLocal}
                          onClick={() =>
                            void saveOperationalEnd(
                              new Date(operationalEndLocal).toISOString(),
                            )
                          }
                          data-testid="planner-save-operational-end"
                        >
                          Endzeit speichern
                        </button>
                        {operationalProvenance?.endSource === "SCE_OVERRIDE" ? (
                          <button
                            type="button"
                            className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-[var(--sce-primary)] hover:underline disabled:opacity-50"
                            disabled={operationalSaving}
                            onClick={() => void saveOperationalEnd(null)}
                            data-testid="planner-reset-operational-end"
                          >
                            Automatisch verwenden
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {operationalError ? (
                      <p className="text-xs text-[var(--danger)]" role="alert">
                        {operationalError}
                      </p>
                    ) : null}
                  </div>
                ) : isCoreReadonly ? (
                  <ReadOnlyValue>
                    {endAt ? formatPlannerEditScheduleLine(endAt, null) : "—"}
                  </ReadOnlyValue>
                ) : (
                  <>
                    <input
                      type="datetime-local"
                      name="endAt"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className={cn(
                        "fca-input mt-1.5 w-full",
                        endTimeWarning &&
                          "border-[var(--warning)] ring-1 ring-[var(--warning)]/40",
                      )}
                      data-testid="planner-edit-end-at"
                      aria-invalid={endTimeWarning || undefined}
                      aria-describedby={
                        endTimeWarning ? "planner-match-end-time-hint" : undefined
                      }
                    />
                    {endTimeWarning ? (
                      <p
                        id="planner-match-end-time-hint"
                        className="mt-1.5 text-xs text-[var(--warning)]"
                        data-testid="planner-match-end-time-warning"
                        role="status"
                      >
                        <span className="font-medium">
                          {MATCH_END_TIME_MISSING_HEADLINE}
                        </span>
                        {" · "}
                        Für dieses Spiel muss noch eine Endzeit gesetzt werden.
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Ort</FieldLabel>
                {isCoreReadonly ? (
                  <ReadOnlyValue>{defaults.location || "—"}</ReadOnlyValue>
                ) : (
                  <input
                    name="location"
                    defaultValue={defaults.location}
                    className="fca-input mt-1.5 w-full"
                  />
                )}
              </div>
            </div>
          </section>

          {(showTrainingFields ||
            defaults.organizerName ||
            !isCoreReadonly) && (
            <section
              className="space-y-4"
              aria-labelledby="planner-section-org"
            >
              <h2
                id="planner-section-org"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Organisation
              </h2>
              <div>
                <FieldLabel>Organisator</FieldLabel>
                {isCoreReadonly ? (
                  <ReadOnlyValue>{defaults.organizerName || "—"}</ReadOnlyValue>
                ) : (
                  <input
                    name="organizerName"
                    defaultValue={defaults.organizerName}
                    className="fca-input mt-1.5 w-full"
                    placeholder="Optional"
                  />
                )}
              </div>
            </section>
          )}

          <section className="space-y-3" aria-labelledby="planner-section-notes">
            <h2
              id="planner-section-notes"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Notizen
            </h2>
            <div>
              <FieldLabel>Beschreibung</FieldLabel>
              {isCoreReadonly ? (
                <ReadOnlyValue>{defaults.description || "—"}</ReadOnlyValue>
              ) : (
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={defaults.description}
                  className="fca-input mt-1.5 w-full resize-y"
                />
              )}
            </div>
            <div>
              <FieldLabel>Bemerkungen (intern)</FieldLabel>
              {isCoreReadonly ? (
                <ReadOnlyValue>{defaults.remarks || "—"}</ReadOnlyValue>
              ) : (
                <textarea
                  name="remarks"
                  rows={2}
                  defaultValue={defaults.remarks}
                  className="fca-input mt-1.5 w-full resize-y"
                />
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-5 lg:hidden">
            {canManage && !isExternallyOwned ? (
              <>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md bg-[var(--sce-primary)] px-4 text-sm font-semibold text-white"
                  data-testid="planner-edit-save-footer"
                >
                  Änderungen speichern
                </button>
                <Link
                  href={data.backHref}
                  className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-2)]"
                >
                  Abbrechen
                </Link>
                <PlannerEntryDeleteButton
                  eventId={data.eventId}
                  seasonKey={data.selectedSeasonKey}
                />
              </>
            ) : (
              <Link
                href={data.backHref}
                className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-2)]"
              >
                Zurück
              </Link>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <PlannerEntryPublicationFields
            rows={publicationRows}
            values={publication}
            onChange={(patch) =>
              setPublication((current) => ({ ...current, ...patch }))
            }
            disabled={isCoreReadonly}
          />

          {canManage && !isExternallyOwned ? (
            <div className="hidden lg:block">
              <PlannerEntryDeleteButton
                eventId={data.eventId}
                seasonKey={data.selectedSeasonKey}
              />
            </div>
          ) : null}
        </aside>
      </form>
    </div>
  );
}
