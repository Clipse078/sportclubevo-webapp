"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SceActivityComposer from "@/components/sce/activity-composer/SceActivityComposer";
import type { SceActivityCreateDefinition } from "@/lib/sce/activity-composer/types";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { SceActivityCreateSuccessResult } from "@/lib/sce/activity-composer/success-result";
import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import { resolveTrainingComposerTitleForResume } from "@/lib/training/composer/training-composer-draft-access";
import { hydrateTrainingComposerFormFromDraft } from "@/lib/training/composer/hydrate-training-composer-form-from-draft";
import type { SceActivityCreateResumeDraft } from "@/lib/sce/activity-composer/draft-persistence-capability";
import { buildTrainingCreateTabNavigationConfig } from "@/lib/training/training-create-workflow-config";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { PLANNING_EDITOR_FORM_GRID_CLASS, PLANNING_RESOURCE_SECTION_LABEL_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import TeamSeasonSearchablePicker from "@/components/admin/shared/TeamSeasonSearchablePicker";
import TrainingWeekdayScheduleEditor, {
  type TrainingWeekdayScheduleRow,
} from "@/components/admin/training/form/TrainingWeekdayScheduleEditor";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import { weekdayFromDate, zonedTimeToUtc } from "@/lib/training/recurrence";
import type { Weekday } from "@/lib/training/types";
import {
  computeTrainingCreateTabErrors,
  firstInvalidTrainingCreateTab,
} from "@/lib/training/training-create-validation";
import {
  addMinutesToTrainingWallClockTime,
  DEFAULT_TRAINING_WALL_CLOCK_START,
} from "@/lib/training/training-schedule-presentation";
import { defaultTrainingCreateEndTime } from "@/lib/training/training-create-schedule-defaults";
import type { TeamSeasonOption } from "@/components/admin/training/TrainingSeriesCreateForm";

const WEEKDAY_ORDER: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Montag",
  TUESDAY: "Dienstag",
  WEDNESDAY: "Mittwoch",
  THURSDAY: "Donnerstag",
  FRIDAY: "Freitag",
  SATURDAY: "Samstag",
  SUNDAY: "Sonntag",
};

type Props = {
  teamSeasons: TeamSeasonOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  timeZone?: string;
  defaultTrainingDurationMinutes: number;
  containerMode?: "page" | "overlay";
  effectiveGovernance: SceActivityEffectiveGovernance;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: (result: SceActivityCreateSuccessResult<{ seriesId: string; outcome: string }>) => void;
  initialDraftId?: string | null;
  initialResumeDraft?: { draftId: string; payload: TrainingComposerDraftPayload } | null;
  reviewerComment?: string | null;
};

let localIdCounter = 0;
function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}`;
}

function resolveResourceDisplay(facilityGroups: FacilityGroup[], facilityResourceId: string): string {
  for (const group of facilityGroups) {
    const resource = group.resources.find((r) => r.id === facilityResourceId);
    if (resource) return resource.name;
  }
  return facilityResourceId;
}

function buildDefaultWeekdayRows(
  validFrom: string,
  startsAt: string,
  endsAt: string,
): TrainingWeekdayScheduleRow[] {
  let activeWeekday: Weekday | null = null;
  if (validFrom) {
    try {
      activeWeekday = weekdayFromDate(new Date(`${validFrom}T00:00:00.000Z`));
    } catch {
      activeWeekday = null;
    }
  }
  return WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    enabled: weekday === activeWeekday,
    startsAt,
    endsAt,
  }));
}

export default function TrainingCreateForm({
  teamSeasons,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  timeZone = "Europe/Zurich",
  defaultTrainingDurationMinutes,
  containerMode = "page",
  effectiveGovernance,
  open = true,
  onClose,
  onSuccess,
  initialDraftId = null,
  initialResumeDraft = null,
  reviewerComment = null,
}: Props) {
  const router = useRouter();
  const serverHydrated = initialResumeDraft?.payload
    ? hydrateTrainingComposerFormFromDraft(initialResumeDraft.payload)
    : null;

  const [teamSeasonId, setTeamSeasonId] = useState(serverHydrated?.teamSeasonId ?? "");
  const [title, setTitle] = useState(serverHydrated?.title ?? "");
  const [description, setDescription] = useState(serverHydrated?.description ?? "");
  const [validFrom, setValidFrom] = useState(serverHydrated?.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(serverHydrated?.validUntil ?? "");
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(serverHydrated?.recurrenceEnabled ?? false);
  const [startsAt, setStartsAt] = useState(
    serverHydrated?.weekdaySchedules[0]?.startsAt ?? DEFAULT_TRAINING_WALL_CLOCK_START,
  );
  const [endsAt, setEndsAt] = useState(
    serverHydrated?.weekdaySchedules[0]?.endsAt ??
      defaultTrainingCreateEndTime(defaultTrainingDurationMinutes),
  );
  const endsAtManualRef = useRef(false);

  const [weekdayRows, setWeekdayRows] = useState<TrainingWeekdayScheduleRow[]>(() =>
    serverHydrated?.weekdaySchedules.length
      ? WEEKDAY_ORDER.map((weekday) => {
          const match = serverHydrated.weekdaySchedules.find((row) => row.weekday === weekday);
          return {
            weekday,
            label: WEEKDAY_LABELS[weekday],
            enabled: Boolean(match),
            startsAt: match?.startsAt ?? startsAt,
            endsAt: match?.endsAt ?? endsAt,
          };
        })
      : buildDefaultWeekdayRows(validFrom, startsAt, endsAt),
  );

  const [pitchDraft, setPitchDraft] = useState<{ localId: string; facilityResourceId: string; facilityResourceName: string } | null>(() => {
    const row = serverHydrated?.resources.find((r) => r.kind === "pitch_hall");
    return row
      ? { localId: nextLocalId("pitch"), facilityResourceId: row.facilityResourceId, facilityResourceName: row.facilityResourceName }
      : null;
  });
  const [dressingDraft, setDressingDraft] = useState<{ localId: string; facilityResourceId: string; facilityResourceName: string } | null>(() => {
    const row = serverHydrated?.resources.find((r) => r.kind === "dressing_room");
    return row
      ? { localId: nextLocalId("dressing"), facilityResourceId: row.facilityResourceId, facilityResourceName: row.facilityResourceName }
      : null;
  });

  const [draftId, setDraftId] = useState<string | null>(initialResumeDraft?.draftId ?? initialDraftId);
  const [persistedBaseline, setPersistedBaseline] = useState<TrainingComposerDraftPayload | null>(
    initialResumeDraft?.payload ?? null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const selectedTeamSeason = useMemo(
    () => teamSeasons.find((ts) => ts.id === teamSeasonId) ?? null,
    [teamSeasons, teamSeasonId],
  );

  useEffect(() => {
    if (title.trim() || !selectedTeamSeason) return;
    setTitle(`${selectedTeamSeason.teamName} Training`);
  }, [selectedTeamSeason, title]);

  useEffect(() => {
    if (serverHydrated?.weekdaySchedules.length) return;
    setWeekdayRows(buildDefaultWeekdayRows(validFrom, startsAt, endsAt));
  }, [validFrom, serverHydrated?.weekdaySchedules.length, startsAt, endsAt]);

  useEffect(() => {
    if (recurrenceEnabled) return;
    if (!validFrom) return;
    let anchorWeekday: Weekday | null = null;
    try {
      anchorWeekday = weekdayFromDate(new Date(`${validFrom}T00:00:00.000Z`));
    } catch {
      anchorWeekday = null;
    }
    if (!anchorWeekday) return;
    setWeekdayRows((rows) =>
      rows.map((row) =>
        row.weekday === anchorWeekday
          ? { ...row, enabled: true, startsAt, endsAt }
          : { ...row, enabled: false, startsAt, endsAt },
      ),
    );
  }, [recurrenceEnabled, validFrom, startsAt, endsAt]);

  function handleStartsAtChange(value: string) {
    setStartsAt(value);
    if (!endsAtManualRef.current) {
      const nextEnd = addMinutesToTrainingWallClockTime(value, defaultTrainingDurationMinutes);
      if (nextEnd) setEndsAt(nextEnd);
    }
    setWeekdayRows((rows) => rows.map((row) => (row.enabled ? { ...row, startsAt: value } : row)));
  }

  function handleEndsAtChange(value: string) {
    endsAtManualRef.current = true;
    setEndsAt(value);
    setWeekdayRows((rows) => rows.map((row) => (row.enabled ? { ...row, endsAt: value } : row)));
  }

  const scheduleInterval = useMemo(() => {
    if (!validFrom || !startsAt || !endsAt || startsAt >= endsAt) return null;
    try {
      const startAt = zonedTimeToUtc(validFrom, startsAt, timeZone).toISOString();
      const endAt = zonedTimeToUtc(validFrom, endsAt, timeZone).toISOString();
      return { startAt, endAt };
    } catch {
      return null;
    }
  }, [validFrom, startsAt, endsAt, timeZone]);

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: scheduleInterval != null,
    startAt: scheduleInterval?.startAt ?? "",
    endAt: scheduleInterval?.endAt,
  });

  const buildPayload = useCallback((): TrainingComposerDraftPayload => {
    const resources: TrainingComposerDraftPayload["resources"] = [];
    if (pitchDraft) {
      resources.push({
        facilityResourceId: pitchDraft.facilityResourceId,
        facilityResourceName: pitchDraft.facilityResourceName,
        kind: "pitch_hall",
      });
    }
    if (dressingDraft) {
      resources.push({
        facilityResourceId: dressingDraft.facilityResourceId,
        facilityResourceName: dressingDraft.facilityResourceName,
        kind: "dressing_room",
      });
    }

    const weekdaySchedules = weekdayRows
      .filter((row) => row.enabled)
      .map((row) => ({
        weekday: row.weekday,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      }));

    return {
      teamSeasonId,
      title,
      description,
      timezone: timeZone,
      validFrom,
      validUntil: recurrenceEnabled ? validUntil : validFrom,
      recurrenceEnabled,
      weekdaySchedules,
      resources,
      publication: { noteOnly: true },
    };
  }, [
    teamSeasonId,
    title,
    description,
    timeZone,
    validFrom,
    validUntil,
    recurrenceEnabled,
    weekdayRows,
    pitchDraft,
    dressingDraft,
  ]);

  const tabErrors = useMemo(
    () => (submitAttempted ? computeTrainingCreateTabErrors(buildPayload()) : {}),
    [submitAttempted, buildPayload],
  );

  const resumeDraft = useMemo((): SceActivityCreateResumeDraft<TrainingComposerDraftPayload> | undefined => {
    if (!draftId || !persistedBaseline) return undefined;
    return { draftId, baselineDraft: persistedBaseline };
  }, [draftId, persistedBaseline]);

  const composerTitle = useMemo(() => {
    if (!resumeDraft) return "Training erstellen";
    return resolveTrainingComposerTitleForResume(persistedBaseline?.title ?? title);
  }, [persistedBaseline?.title, resumeDraft, title]);

  const recurrenceSummary = useMemo(() => {
    const active = weekdayRows.filter((row) => row.enabled);
    if (!recurrenceEnabled) {
      if (!validFrom) return "Ein Training ohne Wiederholung.";
      return active.length
        ? `Ein Training am ${validFrom} (${WEEKDAY_LABELS[active[0]!.weekday]}) · ${active[0]!.startsAt}–${active[0]!.endsAt}`
        : "Ein Training ohne Wiederholung — bitte Datum wählen.";
    }
    const days = active.map((row) => WEEKDAY_LABELS[row.weekday]).join(", ");
    return `Wöchentlich ab ${validFrom || "—"} · ${days || "keine Trainingstage"} · bis ${validUntil || "—"}`;
  }, [weekdayRows, recurrenceEnabled, validFrom, validUntil]);

  const definition = useMemo((): SceActivityCreateDefinition<
    TrainingComposerDraftPayload,
    { seriesId: string; outcome: string }
  > => {
    return {
      activityKind: "TRAINING",
      title: composerTitle,
      createActionLabel: "Training erstellen",
      defaultTab: "uebersicht",
      buildTabNavigationConfig: buildTrainingCreateTabNavigationConfig,
      initialDraft: buildPayload(),
      validateDraft: (draft) => {
        const errors = computeTrainingCreateTabErrors(draft);
        return {
          valid: Object.keys(errors).length === 0,
          tabErrors: errors,
          firstInvalidTab: firstInvalidTrainingCreateTab(errors) ?? undefined,
        };
      },
      submitDraft: async (draft) => {
        setSubmitAttempted(true);
        const payload = { ...buildPayload(), ...draft };
        const res = await fetch("/api/training/composer/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, payload }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          outcome?: string;
          seriesId?: string;
          firstInvalidTab?: string;
        } | null;
        if (!res.ok) {
          return { ok: false as const, error: data?.error ?? "Training konnte nicht erstellt werden." };
        }
        return {
          ok: true as const,
          result: {
            seriesId: data?.seriesId ?? "",
            outcome: data?.outcome ?? "PUBLISHED",
          },
        };
      },
      draftPersistence: {
        supportsDraftPersistence: true,
        validateDraftForSave: () => ({ valid: true, tabErrors: {} }),
        saveDraft: async ({ draft, draftId: existingDraftId }) => {
          const payload = { ...buildPayload(), ...draft };
          const res = await fetch("/api/training/composer/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId: existingDraftId ?? draftId, payload }),
          });
          const data = (await res.json().catch(() => null)) as { error?: string; draftId?: string } | null;
          if (!res.ok || !data?.draftId) {
            return { ok: false as const, error: data?.error ?? "Entwurf speichern fehlgeschlagen." };
          }
          setDraftId(data.draftId);
          setPersistedBaseline(payload);
          return { ok: true as const, result: { draftId: data.draftId }, draftId: data.draftId };
        },
      },
      tabs: [],
    };
  }, [buildPayload, composerTitle, draftId]);

  const handleComposerSuccess = useCallback(
    (result: SceActivityCreateSuccessResult<{ seriesId: string; outcome: string }>) => {
      onSuccess?.(result);
      if (result.outcome === "SUBMITTED_FOR_APPROVAL") {
        router.push("/dashboard/training");
        router.refresh();
        return;
      }
      const seriesId = result.domainPayload?.seriesId;
      if (seriesId) {
        router.push(`/dashboard/training/series/${seriesId}/edit`);
      } else {
        router.push("/dashboard/training");
      }
      router.refresh();
    },
    [onSuccess, router],
  );

  useEffect(() => {
    if (initialResumeDraft || !initialDraftId) return;
    let active = true;
    async function loadDraft() {
      setLoadError(null);
      const res = await fetch(`/api/training/composer/drafts/${encodeURIComponent(initialDraftId!)}`);
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        draftId?: string;
        payload?: TrainingComposerDraftPayload;
      } | null;
      if (!active) return;
      if (!res.ok || !data?.payload || !data.draftId) {
        setLoadError(data?.error ?? "Entwurf konnte nicht geladen werden.");
        return;
      }
      const hydrated = hydrateTrainingComposerFormFromDraft(data.payload);
      setDraftId(data.draftId);
      setPersistedBaseline(data.payload);
      setTeamSeasonId(hydrated.teamSeasonId);
      setTitle(hydrated.title);
      setDescription(hydrated.description);
      setValidFrom(hydrated.validFrom);
      setValidUntil(hydrated.validUntil);
      setRecurrenceEnabled(hydrated.recurrenceEnabled);
      if (hydrated.weekdaySchedules[0]) {
        setStartsAt(hydrated.weekdaySchedules[0].startsAt);
        setEndsAt(hydrated.weekdaySchedules[0].endsAt);
      }
      setWeekdayRows(
        WEEKDAY_ORDER.map((weekday) => {
          const match = hydrated.weekdaySchedules.find((row) => row.weekday === weekday);
          return {
            weekday,
            label: WEEKDAY_LABELS[weekday],
            enabled: Boolean(match),
            startsAt: match?.startsAt ?? DEFAULT_TRAINING_WALL_CLOCK_START,
            endsAt: match?.endsAt ?? defaultTrainingCreateEndTime(defaultTrainingDurationMinutes),
          };
        }),
      );
    }
    void loadDraft();
    return () => {
      active = false;
    };
  }, [initialDraftId, initialResumeDraft, defaultTrainingDurationMinutes]);

  const uebersichtPanel = (
    <PlanningEditorSection testId="training-create-overview-section" ariaLabelledBy="training-create-overview-heading">
      <PlanningEditorSectionHeading id="training-create-overview-heading" title="Übersicht" />
      <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
        <label className="block space-y-2 md:col-span-2">
          <span className="fca-label">Trainingsname</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="fca-input h-8 text-sm"
            data-testid="training-create-title"
          />
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="fca-label">Beschreibung (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="fca-input min-h-[4rem] text-sm"
            rows={3}
          />
        </label>
      </div>
    </PlanningEditorSection>
  );

  const teamPanel = (
    <PlanningEditorSection testId="training-create-team-section" ariaLabelledBy="training-create-team-heading">
      <PlanningEditorSectionHeading id="training-create-team-heading" title="Team" />
      <TeamSeasonSearchablePicker
        options={teamSeasons}
        value={teamSeasonId}
        onChange={setTeamSeasonId}
        testId="training-create-team-season-select"
      />
    </PlanningEditorSection>
  );

  const terminPanel = (
    <PlanningEditorSection testId="training-create-schedule-section" ariaLabelledBy="training-create-schedule-heading">
      <PlanningEditorSectionHeading id="training-create-schedule-heading" title="Termin" />
      <p className="mb-3 text-sm text-[var(--text-2)]" data-testid="training-create-termin-hint">
        {recurrenceEnabled
          ? "Startdatum und Uhrzeit legen den Beginn der Serie fest. Die Trainingstage pro Woche legen Sie unter Wiederholung fest."
          : "Datum und Uhrzeit definieren das eine Training — ohne Wiederholung entsteht genau ein Termin."}
      </p>
      <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
        <label className="block space-y-2">
          <span className="fca-label">{recurrenceEnabled ? "Startdatum" : "Datum"}</span>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="fca-input h-8 text-sm"
            data-testid="training-create-date"
            aria-describedby="training-create-termin-date-hint"
          />
          <span id="training-create-termin-date-hint" className="block text-xs text-[var(--text-2)]">
            {recurrenceEnabled
              ? "Ab diesem Datum werden die gewählten Trainingstage geplant (erster Termin am passenden Wochentag)."
              : "Der Termin fällt auf diesen Kalendertag."}
          </span>
        </label>
        <label className="block space-y-2">
          <span className="fca-label">Start</span>
          <input
            type="time"
            value={startsAt}
            onChange={(e) => handleStartsAtChange(e.target.value)}
            className="fca-input h-8 text-sm"
          />
        </label>
        <label className="block space-y-2">
          <span className="fca-label">Ende</span>
          <input
            type="time"
            value={endsAt}
            onChange={(e) => handleEndsAtChange(e.target.value)}
            className="fca-input h-8 text-sm"
          />
        </label>
      </div>
    </PlanningEditorSection>
  );

  const wiederholungPanel = (
    <PlanningEditorSection testId="training-create-recurrence-section" ariaLabelledBy="training-create-recurrence-heading">
      <PlanningEditorSectionHeading id="training-create-recurrence-heading" title="Wiederholung" />
      <div className="space-y-4">
        <SwitchToggle
          id="training-create-recurrence-toggle"
          checked={recurrenceEnabled}
          onChange={setRecurrenceEnabled}
          label="Wöchentliche Wiederholung"
          description={
            recurrenceEnabled
              ? "Mehrere Termine pro Woche im gewählten Zeitraum."
              : "Aus — es wird genau ein Training erstellt (Termin-Tab)."
          }
        />
        {recurrenceEnabled ? (
          <>
            <p className="text-sm text-[var(--text-2)]">
              Wählen Sie die Trainingstage und optional unterschiedliche Zeiten pro Tag. Der erste Termin
              liegt am nächsten gewählten Wochentag ab Startdatum.
            </p>
            <label className="block max-w-xs space-y-2">
              <span className="fca-label">Serie gültig bis</span>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="fca-input h-8 text-sm"
                data-testid="training-create-valid-until"
              />
              <span className="block text-xs text-[var(--text-2)]">
                Letzter Kalendertag, an dem noch ein Training geplant wird.
              </span>
            </label>
            <TrainingWeekdayScheduleEditor
              rows={weekdayRows}
              onToggle={(weekday) =>
                setWeekdayRows((rows) =>
                  rows.map((row) => (row.weekday === weekday ? { ...row, enabled: !row.enabled } : row)),
                )
              }
              onTimeChange={(weekday, field, value) =>
                setWeekdayRows((rows) =>
                  rows.map((row) => (row.weekday === weekday ? { ...row, [field]: value } : row)),
                )
              }
              testIdPrefix="training-create-weekday"
            />
          </>
        ) : (
          <p className="text-sm text-[var(--text-2)]" data-testid="training-create-recurrence-off-note">
            Datum und Uhrzeit stehen im Tab Termin. Aktivieren Sie die Wiederholung für eine wöchentliche Serie.
          </p>
        )}
        <p className="text-sm text-[var(--text-2)]" data-testid="training-create-recurrence-summary">
          {recurrenceSummary}
        </p>
      </div>
    </PlanningEditorSection>
  );

  const ressourcenPanel = (
    <PlanningEditorSection testId="training-create-resources-section" ariaLabelledBy="training-create-resources-heading">
      <PlanningEditorSectionHeading id="training-create-resources-heading" title="Ressourcen" />
      <div className="space-y-4">
        <div className="space-y-2">
          <p className={PLANNING_RESOURCE_SECTION_LABEL_CLASS}>Spielfeld / Halle</p>
          <PlanningSingleResourceAssignment
            kind="pitch_hall"
            showSubjectLabel={false}
            subjectLabel="Spielfeld / Halle"
            resourceName={pitchDraft?.facilityResourceName ?? null}
            unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen."
            facilityGroups={pitchHallFacilityGroups}
            selectedResourceIds={new Set(pitchDraft ? [pitchDraft.facilityResourceId] : [])}
            onSelect={(id) =>
              setPitchDraft({
                localId: nextLocalId("pitch"),
                facilityResourceId: id,
                facilityResourceName: resolveResourceDisplay(pitchHallFacilityGroups, id),
              })
            }
            onDeselect={() => setPitchDraft(null)}
            availabilityByResourceId={pitchAvailability}
            canManage
            testId="training-create-pitch-allocation"
          />
        </div>
        <div className="space-y-2">
          <p className={PLANNING_RESOURCE_SECTION_LABEL_CLASS}>Garderobe</p>
          <PlanningSingleResourceAssignment
            kind="dressing_room"
            showSubjectLabel={false}
            subjectLabel="Garderobe"
            resourceName={dressingDraft?.facilityResourceName ?? null}
            unassignedLabel="Noch keine Garderobe zugewiesen."
            facilityGroups={dressingRoomFacilityGroups}
            selectedResourceIds={new Set(dressingDraft ? [dressingDraft.facilityResourceId] : [])}
            onSelect={(id) =>
              setDressingDraft({
                localId: nextLocalId("dressing"),
                facilityResourceId: id,
                facilityResourceName: resolveResourceDisplay(dressingRoomFacilityGroups, id),
              })
            }
            onDeselect={() => setDressingDraft(null)}
            availabilityByResourceId={dressingRoomAvailability}
            canManage
            testId="training-create-dressing-allocation"
          />
        </div>
      </div>
    </PlanningEditorSection>
  );

  definition.tabs = [
    { key: "uebersicht", label: "Übersicht", render: () => uebersichtPanel },
    { key: "team", label: "Team", render: () => teamPanel },
    { key: "termin", label: "Termin", render: () => terminPanel },
    { key: "wiederholung", label: "Wiederholung", render: () => wiederholungPanel },
    { key: "ressourcen", label: "Ressourcen", render: () => ressourcenPanel },
  ];

  return (
    <div data-testid="training-create-form">
      {reviewerComment ? (
        <div className="fca-status-box mb-3 border-amber-200 bg-amber-50 text-amber-900" data-testid="training-reviewer-comment">
          <p className="text-xs font-semibold uppercase tracking-wide">Rückmeldung Freigabe</p>
          <p className="mt-1 text-sm">{reviewerComment}</p>
        </div>
      ) : null}
      {loadError ? <div className="fca-status-box fca-status-box-error mb-3">{loadError}</div> : null}
      <SceActivityComposer
        key={resumeDraft?.draftId ?? "training-create-new"}
        definition={definition}
        containerMode={containerMode}
        open={open}
        onClose={onClose ?? (() => router.push("/dashboard/training"))}
        onSuccess={handleComposerSuccess}
        effectiveGovernance={effectiveGovernance}
        resumeDraft={resumeDraft}
        testId="training-create-composer"
      />
    </div>
  );
}
