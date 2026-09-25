"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { parseClubEventScheduleInput } from "@/lib/events/club-event-scheduling";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import PlanningEditorActions from "@/components/admin/shared/planning-editor/PlanningEditorActions";
import PlanningEditorOperationalWorkspace from "@/components/admin/shared/planning-editor/PlanningEditorOperationalWorkspace";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import PlanningEditorWorkSection from "@/components/admin/shared/planning-editor/PlanningEditorWorkSection";
import PlanningEditorCollaborationSection from "@/components/admin/shared/planning-editor/PlanningEditorCollaborationSection";
import PlanningEditorParticipantsSection from "@/components/admin/shared/planning-editor/PlanningEditorParticipantsSection";
import { PLANNING_EDITOR_FORM_GRID_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import VeranstaltungAusspielungFields, {
  type VeranstaltungAusspielungValues,
} from "./VeranstaltungAusspielungFields";
import VeranstaltungScheduleFields, {
  type VeranstaltungScheduleFieldValues,
} from "./VeranstaltungScheduleFields";

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
  timeZone?: string | null;
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
  timeZone = "Europe/Zurich",
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

  const [ausspielung, setAusspielung] = useState<VeranstaltungAusspielungValues>({
    websiteVisible: true,
    homepageVisible: false,
    wochenplanVisible: false,
  });

  const [seasonOptions, setSeasonOptions] = useState<SeasonItem[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [pitchDraft, setPitchDraft] = useState<ResourceDraftRow | null>(null);
  const [dressingDraft, setDressingDraft] = useState<ResourceDraftRow | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : t("errors.createFailed"));
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OTHER",
          source: "MANUAL",
          seasonId,
          title: title.trim(),
          description: description || null,
          location: location || null,
          allDay: schedule.allDay,
          startDate: schedule.startDate,
          endDate: schedule.allDay ? schedule.endDate || schedule.startDate : null,
          startTime: schedule.allDay ? null : schedule.startTime,
          endTime: schedule.allDay ? null : schedule.endTime || null,
          organizerName: organizerName || null,
          remarks: remarks || null,
          websiteVisible: ausspielung.websiteVisible,
          homepageVisible: ausspielung.homepageVisible,
          wochenplanVisible: ausspielung.wochenplanVisible,
          trainingsplanVisible: false,
          teamPageVisible: false,
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setError(data?.error ?? t("errors.createFailed"));
        return;
      }

      const created = data as { eventIds?: string[] } | null;
      const firstEventId = created?.eventIds?.[0];
      if (firstEventId) {
        for (const draft of [pitchDraft, dressingDraft].filter(Boolean)) {
          const allocRes = await fetch(`/api/events/${firstEventId}/facility-allocations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ facilityResourceId: draft!.facilityResourceId }),
          });
          if (!allocRes.ok) {
            const allocData = (await allocRes.json().catch(() => null)) as { error?: string } | null;
            throw new Error(allocData?.error ?? t("errors.createFailed"));
          }
        }
        router.push(`/dashboard/veranstaltungen/${firstEventId}/edit`);
      } else {
        router.push("/dashboard/veranstaltungen?submitted=1");
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const locale = "de-CH";

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="veranstaltung-create-form">
      <PlanningEditorOperationalWorkspace
        testId="veranstaltung-create-operational-workspace"
        secondaryRail={
          <PlanningPublicationPanel testId="veranstaltung-create-publication-panel">
            <VeranstaltungAusspielungFields
              values={ausspielung}
              onChange={(patch) => setAusspielung((current) => ({ ...current, ...patch }))}
              showHeading={false}
              testIdPrefix="veranstaltung-create-publication"
            />
          </PlanningPublicationPanel>
        }
        primary={
          <>
      <PlanningEditorSection testId="veranstaltung-create-details-section" ariaLabelledBy="veranstaltung-create-details-heading">
        <div className="space-y-3">
          <PlanningEditorSectionHeading id="veranstaltung-create-details-heading" title={t("sections.details")} />
          <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
            <label className="block space-y-2">
              <span className="fca-label">{tf("season")}</span>
              <select
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
                className="fca-select h-8 text-sm"
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
                className="fca-select h-8 text-sm"
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
              <span className="fca-label">{tf("location")}</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="fca-input h-8 text-sm"
                placeholder={tf("locationPlaceholder")}
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

      <PlanningEditorSection testId="veranstaltung-create-schedule-section" ariaLabelledBy="veranstaltung-create-schedule-heading">
        <div className="space-y-3">
          <PlanningEditorSectionHeading id="veranstaltung-create-schedule-heading" title={t("sections.schedule")} />
          <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
            <VeranstaltungScheduleFields values={schedule} onChange={handleScheduleChange} />
          </div>
        </div>
      </PlanningEditorSection>

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
            <PlanningSingleResourceAssignment
              kind="pitch_hall"
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
            <PlanningSingleResourceAssignment
              kind="dressing_room"
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
        </div>
      </PlanningEditorSection>
          </>
        }
      />

      <PlanningEditorParticipantsSection
        headingId="veranstaltung-create-participants-heading"
        testId="veranstaltung-create-participants-section"
        persisted={false}
      />

      <PlanningEditorWorkSection
        headingId="veranstaltung-create-work-heading"
        testId="veranstaltung-create-work-section"
        persisted={false}
        locale={locale}
        tasksPanel={null}
      />

      <PlanningEditorCollaborationSection
        headingId="veranstaltung-create-collaboration-heading"
        testId="veranstaltung-create-collaboration-section"
        persisted={false}
        tenantSlug=""
        canEdit={false}
        currentUserId={null}
        locale={locale}
        timezone="Europe/Zurich"
      />

      {error ? <div className="fca-status-box fca-status-box-error">{error}</div> : null}

      <PlanningEditorActions testId="veranstaltung-create-actions">
        <button
          type="submit"
          disabled={submitting || loadingSeasons || !seasonId || !schedule.startDate}
          className="fca-button-primary"
          data-testid="veranstaltung-create-submit"
        >
          {submitting ? t("create.submitting") : t("create.submit")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/veranstaltungen")}
          className="fca-button-secondary"
        >
          {tc("cancel")}
        </button>
      </PlanningEditorActions>
    </form>
  );
}
