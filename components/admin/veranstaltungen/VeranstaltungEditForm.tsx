"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import PlanningEditorActions from "@/components/admin/shared/planning-editor/PlanningEditorActions";
import PlanningEditorOperationalWorkspace from "@/components/admin/shared/planning-editor/PlanningEditorOperationalWorkspace";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import { PLANNING_EDITOR_FORM_GRID_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import {
  clubEventScheduleFormFromPersisted,
  parseClubEventScheduleInput,
} from "@/lib/events/club-event-scheduling";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import type { EventFacilityAllocationDto } from "@/lib/events/event-facility-allocation-types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import VeranstaltungAusspielungFields, {
  type VeranstaltungAusspielungValues,
} from "./VeranstaltungAusspielungFields";
import VeranstaltungScheduleFields, {
  type VeranstaltungScheduleFieldValues,
} from "./VeranstaltungScheduleFields";
import VeranstaltungFacilityAllocationEditor from "./VeranstaltungFacilityAllocationEditor";

type SeasonSummary = {
  id: string;
  key: string;
  name: string;
};

type VeranstaltungEditFormProps = {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startAt: Date | string;
    endAt: Date | string | null;
    allDay: boolean;
    organizerName: string | null;
    remarks: string | null;
    status: string;
    source: string;
    websiteVisible: boolean;
    infoboardVisible: boolean;
    homepageVisible: boolean;
    wochenplanVisible: boolean;
    trainingsplanVisible: boolean;
    teamPageVisible: boolean;
    season: SeasonSummary | null;
  };
  timeZone?: string | null;
  canManage?: boolean;
  /** Participation, tasks, collaboration — primary operational column. */
  operationalPrimarySections?: ReactNode;
  /** Compact participation / status controls for the right rail. */
  operationalRailSections?: ReactNode;
  pitchHallFacilityGroups?: FacilityGroup[];
  dressingRoomFacilityGroups?: FacilityGroup[];
  otherFacilityGroups?: FacilityGroup[];
  initialFacilityAllocations?: EventFacilityAllocationDto[];
};

export default function VeranstaltungEditForm({
  event,
  timeZone,
  canManage = true,
  operationalPrimarySections,
  operationalRailSections,
  pitchHallFacilityGroups = [],
  dressingRoomFacilityGroups = [],
  otherFacilityGroups = [],
  initialFacilityAllocations = [],
}: VeranstaltungEditFormProps) {
  const router = useRouter();
  const t = useTranslations("Veranstaltungen.editor");
  const tf = useTranslations("Veranstaltungen.editor.fields");
  const tc = useTranslations("PlanningEditor.common");
  const tz = resolveTenantEventTimezone(timeZone);

  const isArchived = event.status === "ARCHIVED";
  const isReadonly = isArchived || event.source === "CLUBCORNER_FVNWS" || !canManage;

  const initialSchedule = clubEventScheduleFormFromPersisted(
    {
      allDay: event.allDay,
      startAt: new Date(event.startAt),
      endAt: event.endAt ? new Date(event.endAt) : null,
    },
    tz,
  );

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [schedule, setSchedule] = useState<VeranstaltungScheduleFieldValues>({
    allDay: initialSchedule.allDay,
    startDate: initialSchedule.startDate,
    endDate: initialSchedule.endDate ?? initialSchedule.startDate,
    startTime: initialSchedule.startTime ?? "18:00",
    endTime: initialSchedule.endTime ?? "",
  });
  const rememberedTimes = useRef({
    startTime: initialSchedule.startTime ?? "18:00",
    endTime: initialSchedule.endTime ?? "20:00",
  });

  const [organizerName, setOrganizerName] = useState(event.organizerName ?? "");
  const [remarks, setRemarks] = useState(event.remarks ?? "");
  const [ausspielung, setAusspielung] = useState<VeranstaltungAusspielungValues>({
    websiteVisible: event.websiteVisible,
    homepageVisible: event.homepageVisible,
    wochenplanVisible: event.wochenplanVisible,
  });

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
        tz,
      );
      return {
        startAt: parsed.startAt.toISOString(),
        endAt: (parsed.endAt ?? parsed.startAt).toISOString(),
      };
    } catch {
      return null;
    }
  }, [schedule, tz]);

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: !isReadonly && scheduleInterval != null,
    startAt: scheduleInterval?.startAt ?? "",
    endAt: scheduleInterval?.endAt,
    excludeEventId: event.id,
  });

  function handleScheduleChange(patch: Partial<VeranstaltungScheduleFieldValues>) {
    setSchedule((current) => {
      if (patch.allDay === true && !current.allDay) {
        rememberedTimes.current = {
          startTime: current.startTime || "18:00",
          endTime: current.endTime || "20:00",
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
    if (isReadonly) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? t("errors.saveFailed"));
        return;
      }

      router.push("/dashboard/veranstaltungen?updated=1");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="veranstaltung-edit-form">
      <PlanningEditorOperationalWorkspace
        testId="veranstaltung-edit-operational-workspace"
        secondaryRail={
          <>
            <PlanningPublicationPanel testId="veranstaltung-edit-publication-panel">
              <VeranstaltungAusspielungFields
                values={ausspielung}
                onChange={(patch) => setAusspielung((current) => ({ ...current, ...patch }))}
                disabled={isReadonly}
                showHeading={false}
                testIdPrefix="veranstaltung-edit-publication"
              />
            </PlanningPublicationPanel>
            {operationalRailSections}
          </>
        }
        primary={
          <div className="space-y-3">
          <PlanningEditorSection testId="veranstaltung-edit-details-section" ariaLabelledBy="veranstaltung-edit-details-heading">
        <div className="space-y-3">
          <PlanningEditorSectionHeading id="veranstaltung-edit-details-heading" title={t("sections.details")} />
          {event.season ? (
            <p className="text-xs text-[var(--text-2)]">
              {tf("season")}: {event.season.name}
            </p>
          ) : null}
          <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
            <label className="block space-y-2 md:col-span-2">
              <span className="fca-label">{tf("title")}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="fca-input h-8 text-sm"
                required
                disabled={isReadonly}
              />
            </label>

            <VeranstaltungScheduleFields
              values={schedule}
              onChange={handleScheduleChange}
              disabled={isReadonly}
            />

            <label className="block space-y-2 md:col-span-2">
              <span className="fca-label">{tf("description")}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="fca-textarea min-h-[96px] text-sm"
                disabled={isReadonly}
              />
            </label>

            <label className="block space-y-2">
              <span className="fca-label">{tf("location")}</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="fca-input h-8 text-sm"
                disabled={isReadonly}
              />
            </label>

            <label className="block space-y-2">
              <span className="fca-label">{tf("organizer")}</span>
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="fca-input h-8 text-sm"
                disabled={isReadonly}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="fca-label">{tf("remarks")}</span>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="fca-input h-8 text-sm"
                disabled={isReadonly}
              />
            </label>
          </div>
        </div>
      </PlanningEditorSection>

      <PlanningEditorSection
        testId="veranstaltung-edit-resources-section"
        ariaLabelledBy="veranstaltung-edit-resources-heading"
      >
        <div className="space-y-3">
          <PlanningEditorSectionHeading
            id="veranstaltung-edit-resources-heading"
            title={t("sections.resources")}
          />
          <VeranstaltungFacilityAllocationEditor
            eventId={event.id}
            canManage={!isReadonly}
            initialAllocations={initialFacilityAllocations}
            pitchHallFacilityGroups={pitchHallFacilityGroups}
            dressingRoomFacilityGroups={dressingRoomFacilityGroups}
            otherFacilityGroups={otherFacilityGroups}
            pitchAvailabilityByResourceId={pitchAvailability}
            dressingRoomAvailabilityByResourceId={dressingRoomAvailability}
          />
        </div>
      </PlanningEditorSection>

          {operationalPrimarySections}
          </div>
        }
      />

      {error ? <div className="fca-status-box fca-status-box-error">{error}</div> : null}

      {!isReadonly ? (
        <PlanningEditorActions testId="veranstaltung-edit-actions">
          <button type="submit" disabled={submitting} className="fca-button-primary" data-testid="veranstaltung-edit-save">
            {submitting ? t("edit.saving") : t("edit.save")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/veranstaltungen")}
            className="fca-button-secondary"
          >
            {tc("cancel")}
          </button>
        </PlanningEditorActions>
      ) : null}
    </form>
  );
}
