"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SceActivityComposer from "@/components/sce/activity-composer/SceActivityComposer";
import type { SceActivityCreateDefinition } from "@/lib/sce/activity-composer/types";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { SceActivityCreateSuccessResult } from "@/lib/sce/activity-composer/success-result";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";
import { buildClubEventCreateTabNavigationConfig } from "@/lib/veranstaltungen/club-event-create-workflow-config";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PlanningResourcePicker } from "@/components/admin/shared/planning/PlanningResourcePicker";
import { TRAINING_ALLOCATION_GROUP_LABELS } from "@/lib/training/allocation-groups";
import { parseClubEventScheduleInput } from "@/lib/events/club-event-scheduling";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import PlanningEditorActions from "@/components/admin/shared/planning-editor/PlanningEditorActions";
import { SportingActivityFormIdentitySummary } from "@/components/sporting-activity/SportingActivityFormIdentitySummary";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import {
  PLANNING_EDITOR_FORM_GRID_CLASS,
  PLANNING_RESOURCE_SECTION_LABEL_CLASS,
} from "@/components/admin/shared/planning-editor/planning-editor-layout";
import VeranstaltungAusspielungFields, {
  type VeranstaltungAusspielungValues,
} from "./VeranstaltungAusspielungFields";
import VeranstaltungScheduleFields, {
  type VeranstaltungScheduleFieldValues,
} from "./VeranstaltungScheduleFields";
import ClubEventOrganisationalAudienceEditor, {
  clubEventOrganisationalAudienceEditorToApiPayload,
  type ClubEventOrganisationalAudienceEditorValue,
} from "./ClubEventOrganisationalAudienceEditor";
import ClubEventCreateWorkflowShell from "./ClubEventCreateWorkflowShell";
import VeranstaltungRecurrenceFields, {
  recurrenceValuesToApiPayload,
  type VeranstaltungRecurrenceFieldValues,
} from "./VeranstaltungRecurrenceFields";
import {
  computeClubEventCreateTabErrors,
  firstInvalidClubEventCreateTab,
} from "@/lib/veranstaltungen/club-event-create-validation";

type SeasonItem = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

type SeasonsResponse = {
  currentSeasonKey: string | null;
  nextSeasonKey: string | null;
  seasons: SeasonItem[];
};

const VERANSTALTUNG_CATEGORIES = [
  "Generalversammlung",
  "Trainersitzung",
  "Vorstandssitzung",
  "Vereinsanlass",
  "Sponsorenanlass",
  "Helfereinsatz",
  "Interne Veranstaltung",
  "Sonstiges",
] as const;

const DEFAULT_TIMES = { startTime: "18:00", endTime: "20:00" };

type ResourceDraftRow = {
  localId: string;
  facilityResourceId: string;
  facilityResourceName: string;
};

type VeranstaltungCreateFormProps = {
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  otherFacilityGroups?: FacilityGroup[];
  timeZone?: string | null;
  containerMode?: "page" | "overlay";
  effectiveGovernance: SceActivityEffectiveGovernance;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: (result: SceActivityCreateSuccessResult<{ eventIds: string[]; outcome: string }>) => void;
};

function resolveResourceDisplay(
  facilityGroups: FacilityGroup[],
  facilityResourceId: string,
): string {
  for (const group of facilityGroups) {
    const resource = group.resources.find((r) => r.id === facilityResourceId);
    if (resource) return resource.name;
  }
  return facilityResourceId;
}

let localIdCounter = 0;
function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}`;
}

export default function VeranstaltungCreateForm({
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  otherFacilityGroups = [],
  timeZone = "Europe/Zurich",
  containerMode = "page",
  effectiveGovernance,
  open = true,
  onClose,
  onSuccess,
}: VeranstaltungCreateFormProps) {
  const router = useRouter();
  const t = useTranslations("Veranstaltungen.editor");
  const tf = useTranslations("Veranstaltungen.editor.fields");
  const tc = useTranslations("PlanningEditor.common");

  const [seasonId, setSeasonId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [schedule, setSchedule] = useState<VeranstaltungScheduleFieldValues>({
    allDay: false,
    startDate: "",
    endDate: "",
    startTime: DEFAULT_TIMES.startTime,
    endTime: DEFAULT_TIMES.endTime,
  });
  const rememberedTimes = useRef({ ...DEFAULT_TIMES });

  const [audience, setAudience] = useState<ClubEventOrganisationalAudienceEditorValue>({
    scope: "CLUB_WIDE",
    targets: [],
  });

  const [ausspielung, setAusspielung] = useState<VeranstaltungAusspielungValues>({
    websiteVisible: true,
    homepageVisible: false,
    wochenplanVisible: false,
  });

  const [seasonOptions, setSeasonOptions] = useState<SeasonItem[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [pitchDraft, setPitchDraft] = useState<ResourceDraftRow | null>(null);
  const [dressingDraft, setDressingDraft] = useState<ResourceDraftRow | null>(null);
  const [otherDrafts, setOtherDrafts] = useState<ResourceDraftRow[]>([]);
  const [otherPickerOpen, setOtherPickerOpen] = useState(false);

  const [recurrence, setRecurrence] = useState<VeranstaltungRecurrenceFieldValues>({
    enabled: false,
    frequency: "MONTHLY",
    intervalCount: 1,
    weekday: "TUESDAY",
    monthlyPatternKind: "ORDINAL_WEEKDAY",
    monthDay: 15,
    monthOrdinal: "FIRST",
    endMode: "AFTER_COUNT",
    endDate: "",
    occurrenceCount: 8,
  });

  const [draftId, setDraftId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const tabErrors = useMemo(
    () =>
      submitAttempted
        ? computeClubEventCreateTabErrors({
            seasonId,
            title,
            schedule,
            audience,
            recurrenceEnabled: recurrence.enabled,
            recurrenceEndDate: recurrence.endDate,
            recurrenceOccurrenceCount: String(recurrence.occurrenceCount),
            recurrenceEndMode: recurrence.endMode,
          })
        : {},
    [
      submitAttempted,
      seasonId,
      title,
      schedule,
      audience,
      recurrence.enabled,
      recurrence.endDate,
      recurrence.occurrenceCount,
      recurrence.endMode,
    ],
  );

  const scheduleInterval = useMemo(() => {
    if (!schedule.startDate) return null;
    try {
      const parsed = parseClubEventScheduleInput(
        {
          allDay: schedule.allDay,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        },
        timeZone,
      );
      return {
        startAt: parsed.startAt.toISOString(),
        endAt: (parsed.endAt ?? parsed.startAt).toISOString(),
      };
    } catch {
      return null;
    }
  }, [schedule, timeZone]);

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: scheduleInterval != null,
    startAt: scheduleInterval?.startAt ?? "",
    endAt: scheduleInterval?.endAt,
  });

  const addPitchDraft = useCallback(
    (facilityResourceId: string) => {
      setPitchDraft({
        localId: nextLocalId("pitch"),
        facilityResourceId,
        facilityResourceName: resolveResourceDisplay(pitchHallFacilityGroups, facilityResourceId),
      });
    },
    [pitchHallFacilityGroups],
  );

  const addDressingDraft = useCallback(
    (facilityResourceId: string) => {
      setDressingDraft({
        localId: nextLocalId("dressing"),
        facilityResourceId,
        facilityResourceName: resolveResourceDisplay(dressingRoomFacilityGroups, facilityResourceId),
      });
    },
    [dressingRoomFacilityGroups],
  );

  const addOtherDraft = useCallback(
    (facilityResourceId: string) => {
      setOtherDrafts((prev) => {
        if (prev.some((row) => row.facilityResourceId === facilityResourceId)) return prev;
        return [
          ...prev,
          {
            localId: nextLocalId("other"),
            facilityResourceId,
            facilityResourceName: resolveResourceDisplay(otherFacilityGroups, facilityResourceId),
          },
        ];
      });
    },
    [otherFacilityGroups],
  );

  const removeOtherDraft = useCallback((facilityResourceId: string) => {
    setOtherDrafts((prev) => prev.filter((row) => row.facilityResourceId !== facilityResourceId));
  }, []);

  const showOtherSection = otherFacilityGroups.length > 0 || otherDrafts.length > 0;
  const selectedResourceIds = useMemo(() => {
    const ids = new Set<string>();
    if (pitchDraft) ids.add(pitchDraft.facilityResourceId);
    if (dressingDraft) ids.add(dressingDraft.facilityResourceId);
    for (const row of otherDrafts) ids.add(row.facilityResourceId);
    return ids;
  }, [pitchDraft, dressingDraft, otherDrafts]);

  useEffect(() => {
    let active = true;

    async function loadSeasons() {
      setLoadingSeasons(true);
      try {
        const res = await fetch("/api/seasons", { method: "GET", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as SeasonsResponse | null;

        if (!res.ok) {
          throw new Error(
            (data as { error?: string } | null)?.error ?? tf("seasonLoading"),
          );
        }

        if (!active || !data) return;

        const seasons = Array.isArray(data.seasons) ? data.seasons : [];
        setSeasonOptions(seasons);

        const preferred = seasons.find((s) => s.isActive) ?? seasons[0] ?? null;
        setSeasonId(preferred?.id ?? "");
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : t("errors.createFailed"));
      } finally {
        if (active) setLoadingSeasons(false);
      }
    }

    loadSeasons();
    return () => {
      active = false;
    };
  }, [tf, t]);

  function handleCategoryChange(value: string) {
    setCategory(value);
    if (
      !title ||
      VERANSTALTUNG_CATEGORIES.includes(title as (typeof VERANSTALTUNG_CATEGORIES)[number])
    ) {
      setTitle(value);
    }
  }

  function handleScheduleChange(patch: Partial<VeranstaltungScheduleFieldValues>) {
    setSchedule((current) => {
      if (patch.allDay === true && !current.allDay) {
        rememberedTimes.current = {
          startTime: current.startTime || DEFAULT_TIMES.startTime,
          endTime: current.endTime || DEFAULT_TIMES.endTime,
        };
        return {
          ...current,
          ...patch,
          endDate: patch.endDate ?? (current.endDate || current.startDate),
        };
      }
      if (patch.allDay === false && current.allDay) {
        return {
          ...current,
          ...patch,
          startTime: rememberedTimes.current.startTime,
          endTime: rememberedTimes.current.endTime,
        };
      }
      return { ...current, ...patch };
    });
  }

  const buildPayload = useCallback((): ClubEventComposerDraftPayload => {
    const resources: ClubEventComposerDraftPayload["resources"] = [];
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
    for (const row of otherDrafts) {
      resources.push({
        facilityResourceId: row.facilityResourceId,
        facilityResourceName: row.facilityResourceName,
        kind: "other",
      });
    }
    return {
      seasonId,
      title,
      category,
      description,
      location,
      organizerName,
      remarks,
      schedule,
      audience,
      ausspielung,
      recurrence,
      resources,
    };
  }, [
    seasonId,
    title,
    category,
    description,
    location,
    organizerName,
    remarks,
    schedule,
    audience,
    ausspielung,
    recurrence,
    pitchDraft,
    dressingDraft,
    otherDrafts,
  ]);

  const definition = useMemo((): SceActivityCreateDefinition<
    ClubEventComposerDraftPayload,
    { eventIds: string[]; outcome: string }
  > => {
    return {
      activityKind: "CLUB_EVENT",
      title: "Neue Veranstaltung",
      createActionLabel: "Veranstaltung erstellen",
      defaultTab: "uebersicht",
      buildTabNavigationConfig: buildClubEventCreateTabNavigationConfig,
      initialDraft: buildPayload(),
      validateDraft: (draft) => {
        const tabErrors = computeClubEventCreateTabErrors({
          seasonId: draft.seasonId,
          title: draft.title,
          schedule: draft.schedule,
          audience: draft.audience,
          recurrenceEnabled: draft.recurrence.enabled,
          recurrenceEndDate: draft.recurrence.endDate,
          recurrenceOccurrenceCount: String(draft.recurrence.occurrenceCount),
          recurrenceEndMode: draft.recurrence.endMode,
        });
        const valid = Object.keys(tabErrors).length === 0;
        return {
          valid,
          tabErrors,
          firstInvalidTab: firstInvalidClubEventCreateTab(tabErrors) ?? undefined,
        };
      },
      submitDraft: async (draft) => {
        setSubmitAttempted(true);
        const payload = { ...buildPayload(), ...draft };
        const res = await fetch("/api/club-events/composer/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, payload }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          outcome?: string;
          eventIds?: string[];
        } | null;
        if (!res.ok) {
          return { ok: false as const, error: data?.error ?? t("errors.createFailed") };
        }
        return {
          ok: true as const,
          result: {
            eventIds: data?.eventIds ?? [],
            outcome: data?.outcome ?? "PUBLISHED",
          },
        };
      },
      draftPersistence: {
        supportsDraftPersistence: true,
        validateDraftForSave: () => ({ valid: true, tabErrors: {} }),
        saveDraft: async ({ draft, draftId: existingDraftId }) => {
          const payload = { ...buildPayload(), ...draft };
          const res = await fetch("/api/club-events/composer/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId: existingDraftId ?? draftId, payload }),
          });
          const data = (await res.json().catch(() => null)) as { error?: string; draftId?: string } | null;
          if (!res.ok || !data?.draftId) {
            return { ok: false as const, error: data?.error ?? "Entwurf speichern fehlgeschlagen." };
          }
          setDraftId(data.draftId);
          return { ok: true as const, result: { draftId: data.draftId }, draftId: data.draftId };
        },
      },
      tabs: [],
    };
  }, [
    audience,
    buildPayload,
    draftId,
    recurrence,
    schedule,
    seasonId,
    t,
    title,
  ]);

  const handleComposerSuccess = useCallback(
    (result: SceActivityCreateSuccessResult<{ eventIds: string[]; outcome: string }>) => {
      onSuccess?.(result);
      const eventIds = result.domainPayload?.eventIds ?? [];
      if (result.outcome === "PUBLISHED" && eventIds[0]) {
        router.push(`/dashboard/veranstaltungen/${eventIds[0]}/edit`);
      } else if (result.outcome === "SUBMITTED_FOR_APPROVAL") {
        router.push("/dashboard/veranstaltungen?submittedForApproval=1");
      } else {
        router.push("/dashboard/veranstaltungen");
      }
      router.refresh();
    },
    [onSuccess, router],
  );

  const workflowPanels = (
      <ClubEventCreateWorkflowShell
        tabErrors={tabErrors}
        uebersicht={
      <PlanningEditorSection testId="veranstaltung-create-details-section" ariaLabelledBy="veranstaltung-create-details-heading">
        <div className="space-y-3">
          <PlanningEditorSectionHeading id="veranstaltung-create-details-heading" title={t("sections.details")} />
          <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
            <label className="block space-y-2">
              <span className="fca-label">{tf("season")}</span>
              <select
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
                className="fca-select text-sm"
                required
                disabled={loadingSeasons}
              >
                <option value="">
                  {loadingSeasons ? tf("seasonLoading") : tf("seasonPlaceholder")}
                </option>
                {seasonOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isActive ? tf("seasonActiveSuffix") : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="fca-label">{tf("category")}</span>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="fca-select text-sm"
              >
                <option value="">{tf("categoryPlaceholder")}</option>
                {VERANSTALTUNG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="fca-label">
                {tf("title")} <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="fca-input h-8 text-sm"
                required
                placeholder={tf("titlePlaceholder")}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="fca-label">{tf("description")}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="fca-textarea min-h-[96px] text-sm"
                placeholder={tf("descriptionPlaceholder")}
              />
            </label>

            <label className="block space-y-2">
              <span className="fca-label">{tf("organizer")}</span>
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="fca-input h-8 text-sm"
                placeholder={tf("organizerPlaceholder")}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="fca-label">{tf("remarks")}</span>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="fca-input h-8 text-sm"
                placeholder={tf("remarksPlaceholder")}
              />
            </label>
          </div>
        </div>
      </PlanningEditorSection>
        }
        gueltigkeit={
      <PlanningEditorSection
        testId="veranstaltung-create-audience-section"
        ariaLabelledBy="veranstaltung-create-audience-heading"
      >
        <div className="space-y-3">
          <PlanningEditorSectionHeading
            id="veranstaltung-create-audience-heading"
            title="Gültigkeit"
          />
          <p className="text-sm text-[var(--text-2)]">
            Wählen Sie die Organisationseinheiten und Teams, für die diese Veranstaltung gilt.
          </p>
          <ClubEventOrganisationalAudienceEditor
            initial={{ scope: "CLUB_WIDE", teamIds: [], orgUnitIds: [], targets: [] }}
            onChange={setAudience}
          />
        </div>
      </PlanningEditorSection>
        }
        termin={
      <PlanningEditorSection testId="veranstaltung-create-schedule-section" ariaLabelledBy="veranstaltung-create-schedule-heading">
        <div className="space-y-3">
          <PlanningEditorSectionHeading id="veranstaltung-create-schedule-heading" title={t("sections.schedule")} />
          <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
            <VeranstaltungScheduleFields values={schedule} onChange={handleScheduleChange} />
            <label className="block space-y-2 md:col-span-2">
              <span className="fca-label">{tf("location")}</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="fca-input h-8 text-sm"
                placeholder={tf("locationPlaceholder")}
              />
            </label>
            <div className="md:col-span-2">
              <VeranstaltungRecurrenceFields
                schedule={schedule}
                values={recurrence}
                onChange={(patch) => setRecurrence((current) => ({ ...current, ...patch }))}
                timeZone={timeZone ?? "Europe/Zurich"}
              />
            </div>
          </div>
        </div>
      </PlanningEditorSection>
        }
        ressourcen={
      <PlanningEditorSection
        testId="veranstaltung-create-resources-section"
        ariaLabelledBy="veranstaltung-create-resources-heading"
      >
        <div className="space-y-3">
          <PlanningEditorSectionHeading
            id="veranstaltung-create-resources-heading"
            title={t("sections.resources")}
          />
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
              onSelect={addPitchDraft}
              onDeselect={() => setPitchDraft(null)}
              availabilityByResourceId={pitchAvailability}
              canManage
              testId="veranstaltung-create-pitch-allocation"
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
              onSelect={addDressingDraft}
              onDeselect={() => setDressingDraft(null)}
              availabilityByResourceId={dressingRoomAvailability}
              canManage
              testId="veranstaltung-create-dressing-allocation"
            />
            </div>
            {showOtherSection ? (
              <details
                className="group rounded-lg border border-[var(--border)] px-3 py-2"
                data-testid="veranstaltung-create-other-allocation"
                open={otherDrafts.length > 0}
              >
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[var(--text-2)]">
                  <ChevronDown
                    size={14}
                    className="text-[var(--muted)] transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                  {TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
                </summary>
                <div className="mt-3 space-y-2">
                  {otherDrafts.length > 0 ? (
                    <ul className="space-y-1 text-sm text-[var(--foreground)]">
                      {otherDrafts.map((row) => (
                        <li key={row.localId} className="flex justify-between gap-2">
                          <span>{row.facilityResourceName}</span>
                          <button
                            type="button"
                            className="text-xs text-[var(--sce-danger)]"
                            onClick={() => removeOtherDraft(row.facilityResourceId)}
                          >
                            Entfernen
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {!otherPickerOpen ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                      onClick={() => setOtherPickerOpen(true)}
                      data-testid="veranstaltung-create-other-allocation-add"
                    >
                      {otherDrafts.length > 0
                        ? "Weitere Ressource hinzufügen"
                        : "Ressource zuweisen"}
                    </button>
                  ) : null}
                  {otherPickerOpen ? (
                    <PlanningResourcePicker
                      kind="other"
                      title={TRAINING_ALLOCATION_GROUP_LABELS.OTHER}
                      facilityGroups={otherFacilityGroups}
                      selectedResourceIds={selectedResourceIds}
                      singleSelect={false}
                      onSelect={addOtherDraft}
                      onDeselect={removeOtherDraft}
                      testId="veranstaltung-create-other-allocation-picker"
                      onCancel={() => setOtherPickerOpen(false)}
                    />
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </PlanningEditorSection>
        }
        publikation={
          <PlanningPublicationPanel testId="veranstaltung-create-publication-panel">
            <VeranstaltungAusspielungFields
              values={ausspielung}
              onChange={(patch) => setAusspielung((current) => ({ ...current, ...patch }))}
              showHeading={false}
              testIdPrefix="veranstaltung-create-publication"
            />
          </PlanningPublicationPanel>
        }
      />
  );

  definition.tabs = [
    { key: "uebersicht", label: "Übersicht", render: () => workflowPanels },
    { key: "gueltigkeit", label: "Gültigkeit", render: () => workflowPanels },
    { key: "termin", label: "Termin", render: () => workflowPanels },
    { key: "ressourcen", label: "Ressourcen", render: () => workflowPanels },
    { key: "publikation", label: "Publikation", render: () => workflowPanels },
  ];

  return (
    <div data-testid="veranstaltung-create-form">
      {loadError ? <div className="fca-status-box fca-status-box-error mb-3">{loadError}</div> : null}
      <SceActivityComposer
        definition={definition}
        containerMode={containerMode}
        open={open}
        onClose={onClose ?? (() => router.push("/dashboard/veranstaltungen"))}
        onSuccess={handleComposerSuccess}
        effectiveGovernance={effectiveGovernance}
        testId="club-event-create-composer"
      />
    </div>
  );
}
