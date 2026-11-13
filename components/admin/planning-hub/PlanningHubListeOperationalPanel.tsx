"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { OperationalDensePanelShell } from "@/components/admin/shared/planning/OperationalDensePanelShell";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PlanningOperationalResourceGroup } from "@/components/admin/shared/planning/PlanningOperationalResourceGroup";
import { PlanningHubListeOperationalPanelErrorBoundary } from "./PlanningHubListeOperationalPanelErrorBoundary";
import SpieleManagementMatchPreparationPanel from "@/components/admin/matchcenter/SpieleManagementMatchPreparationPanel";
import PlannerOperationalStatusSection from "./PlannerOperationalStatusSection";
import PlanningHubListeInlineManipulationHost from "./PlanningHubListeInlineManipulationHost";
import DressingRoomOccupancyEditor from "./DressingRoomOccupancyEditor";
import { WeekplannerTournamentParticipantDressingSection } from "@/components/admin/planner/WeekplannerTournamentParticipantDressingSection";
import VeranstaltungFacilityAllocationEditor from "@/components/admin/veranstaltungen/VeranstaltungFacilityAllocationEditor";
import type { EventFacilityAllocationDto } from "@/lib/events/event-facility-allocation-types";
import {
  WeekplannerDateTimeFields,
  WeekplannerEditorError,
  initialEditorDate,
} from "@/components/admin/planner/WeekplannerActivityEditorShell";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";
import { getPlanningHubItemHref } from "@/lib/planning-hub/planning-navigation";
import {
  weekplannerMatchOperationalAssessment,
  weekplannerMatchToMatchcenterSummary,
} from "@/lib/planning-hub/weekplanner-match-matchcenter-bridge";
import { useWeekplannerTrainingAllocationInlinePatch } from "@/lib/planning-hub/use-weekplanner-training-allocation-inline-patch";
import {
  canDomainManagePlannerItem,
  canOperationalManagePlannerItem,
  type PlannerCanonicalEditAccess,
} from "@/lib/planning-hub/planner-canonical-edit-access";
import type { PlanningHubListeMenuAction } from "@/lib/planning-hub/liste-operational-menu";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import { listOperationalRowStatus, listOperationalStatusLabel } from "@/lib/planning-hub/list-operational";
import { cn } from "@/lib/cn";
import { parseClubEventScheduleFromApiBody } from "@/lib/events/club-event-api-scheduling";
import { ClubEventScheduleError } from "@/lib/events/club-event-scheduling";
import {
  isoToLocalTime,
  localToUtcIso,
} from "@/lib/weekplanner/weekplanner-editor-time";
import { useRouter } from "next/navigation";
import { reviveWeekplannerItemFromTransport } from "@/lib/planning-hub/manipulation-transport";
import { weekplannerItemPlanningWindow } from "@/lib/planning-hub/weekplanner-item-planning-window";

export type PlanningHubListeOperationalFocus = PlanningHubListeMenuAction | null;

type Props = {
  item: WeekplannerItem;
  locale: string;
  timezone: string;
  focus: PlanningHubListeOperationalFocus;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  tenantDressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  plannerEditAccess: PlannerCanonicalEditAccess | null;
  alternativePlanActive: boolean;
  onSaved: () => void;
};

function resourceLabelFromRefs(refs: { name: string; facilityName?: string }[]): string | null {
  if (refs.length === 0) return null;
  const ref = refs[0];
  return ref.facilityName ? `${ref.name} (${ref.facilityName})` : ref.name;
}

function TrainingOperationalPanel({
  item,
  locale,
  timezone,
  facilityGroupsByAllocationGroup,
  tenantDressingRoomOccupancyPresets,
  plannerEditAccess,
  focus,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "TRAINING" }>;
} & Omit<Props, "item" | "alternativePlanActive">) {
  const tResources = useTranslations("PlanningResources");
  const { replaceAllocationGroup, isKindPending, isSaving } = useWeekplannerTrainingAllocationInlinePatch(
    item.trainingSessionId,
  );
  const canManageResources =
    !!plannerEditAccess &&
    (canDomainManagePlannerItem(item, plannerEditAccess) ||
      canOperationalManagePlannerItem(item, plannerEditAccess));
  const canEditSchedule = !!plannerEditAccess?.canManageTrainings;

  const pitchIds = useMemo(
    () => new Set(item.pitchAllocations.map((r) => r.facilityResourceId)),
    [item.pitchAllocations],
  );
  const roomIds = useMemo(
    () => new Set(item.dressingRoomAllocations.map((r) => r.facilityResourceId)),
    [item.dressingRoomAllocations],
  );

  const { startAt, endAt } = weekplannerItemPlanningWindow(item);
  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: true,
    startAt,
    endAt,
    excludeTrainingSessionId: item.trainingSessionId,
  });

  const statusLabel = listOperationalStatusLabel(listOperationalRowStatus(item));
  const openPointsLabel = statusLabel.includes("offen") || statusLabel === "Unvollständig" ? statusLabel : null;

  const [scheduleOpen, setScheduleOpen] = useState(focus === "schedule");
  const router = useRouter();
  const formId = `liste-training-schedule-${item.id}`;
  const initDate = initialEditorDate(item, timezone);
  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(isoToLocalTime(item.canonicalStartAt));
  const [endTime, setEndTime] = useState(isoToLocalTime(item.canonicalEndAt));
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  async function saveSchedule() {
    if (!canEditSchedule) return;
    setScheduleSaving(true);
    setScheduleError(null);
    try {
      const res = await fetch(`/api/training-sessions/${item.trainingSessionId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startsAt: startTime, endsAt: endTime }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Zeitänderung fehlgeschlagen.");
      }
      router.refresh();
      onSaved();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setScheduleSaving(false);
    }
  }

  return (
    <OperationalDensePanelShell
      sectionTitle="Trainingsvorbereitung"
      openPointsLabel={openPointsLabel}
      isSaving={isSaving || scheduleSaving}
      testId={`planning-hub-liste-operational-panel-${item.id}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <PlannerOperationalStatusSection item={item} locale={locale} timezone={timezone} variant="detail-popover" />
      <span data-testid="planning-hub-liste-operational-editor" className="sr-only" aria-hidden>
        operational
      </span>
      <div className="mt-2 space-y-3">
        <PlanningOperationalResourceGroup testId={`planning-hub-liste-training-resources-${item.id}`}>
          <PlanningSingleResourceAssignment
            kind="pitch_hall"
            subjectLabel="Spielfeld"
            suppressKindIcon
            resourceName={resourceLabelFromRefs(item.pitchAllocations)}
            unassignedLabel={tResources("unassignedPitchHall")}
            facilityGroups={facilityGroupsByAllocationGroup.PITCH_HALL}
            selectedResourceIds={pitchIds}
            onSelect={async (id) => {
              const ok = await replaceAllocationGroup("pitch", [id]);
              if (ok) onSaved();
            }}
            onDeselect={async () => {
              const ok = await replaceAllocationGroup("pitch", []);
              if (ok) onSaved();
            }}
            availabilityByResourceId={pitchAvailability}
            canManage={canManageResources}
            disabled={isKindPending("pitch")}
            testId={`planning-hub-liste-training-pitch-${item.id}`}
          />
          <PlanningSingleResourceAssignment
            kind="dressing_room"
            subjectLabel="Garderobe"
            suppressKindIcon
            resourceName={resourceLabelFromRefs(item.dressingRoomAllocations)}
            unassignedLabel={tResources("unassignedDressingRoom")}
            facilityGroups={facilityGroupsByAllocationGroup.DRESSING_ROOM}
            selectedResourceIds={roomIds}
            onSelect={async (id) => {
              const ok = await replaceAllocationGroup("dressing", [id]);
              if (ok) onSaved();
            }}
            onDeselect={async () => {
              const ok = await replaceAllocationGroup("dressing", []);
              if (ok) onSaved();
            }}
            availabilityByResourceId={dressingRoomAvailability}
            canManage={canManageResources}
            disabled={isKindPending("dressing")}
            testId={`planning-hub-liste-training-dressing-${item.id}`}
          />
        </PlanningOperationalResourceGroup>
        {tenantDressingRoomOccupancyPresets && roomIds.size > 0 ? (
          <DressingRoomOccupancyEditor
            item={item}
            activityType="TRAINING"
            activityId={item.trainingSessionId}
            tenantPresets={tenantDressingRoomOccupancyPresets}
            onSaved={onSaved}
          />
        ) : null}
        {canEditSchedule ? (
          <div data-testid={`planning-hub-liste-schedule-section-${item.id}`} className="rounded-lg border border-[var(--border)]/70">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              aria-expanded={scheduleOpen}
              onClick={() => setScheduleOpen((v) => !v)}
            >
              <span className="text-sm font-medium text-[var(--foreground)]">Termin</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", scheduleOpen && "rotate-180")} />
            </button>
            {scheduleOpen ? (
              <div className="space-y-2 border-t border-[var(--border)]/60 px-3 py-2">
                {scheduleError ? <WeekplannerEditorError message={scheduleError} /> : null}
                <WeekplannerDateTimeFields
                  formId={formId}
                  date={date}
                  startTime={startTime}
                  endTime={endTime}
                  onDateChange={setDate}
                  onStartChange={setStartTime}
                  onEndChange={setEndTime}
                />
                <p className="text-[11px] text-[var(--muted)]">
                  Gilt für diese Trainingseinheit (occurrence), nicht die ganze Serie.
                </p>
                <button
                  type="button"
                  className="fca-button-primary text-sm"
                  disabled={scheduleSaving}
                  onClick={() => void saveSchedule()}
                  data-testid={`planning-hub-liste-schedule-save-${item.id}`}
                >
                  Termin speichern
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </OperationalDensePanelShell>
  );
}

function MatchOperationalPanel({
  item,
  facilityGroupsByAllocationGroup,
  plannerEditAccess,
}: {
  item: Extract<WeekplannerItem, { type: "MATCH" }>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  plannerEditAccess: PlannerCanonicalEditAccess | null;
}) {
  const match = useMemo(() => weekplannerMatchToMatchcenterSummary(item), [item]);
  const assessment = useMemo(() => weekplannerMatchOperationalAssessment(item), [item]);
  const canManageOperational =
    !!plannerEditAccess &&
    (canDomainManagePlannerItem(item, plannerEditAccess) ||
      canOperationalManagePlannerItem(item, plannerEditAccess));
  const canManagePublication = !!plannerEditAccess?.canManageEvents;

  return (
    <>
      <span data-testid="planning-hub-liste-operational-editor" className="sr-only" aria-hidden>
        operational
      </span>
      <SpieleManagementMatchPreparationPanel
        match={match}
        assessment={assessment}
        pitchHallFacilityGroups={facilityGroupsByAllocationGroup.PITCH_HALL}
        dressingRoomFacilityGroups={facilityGroupsByAllocationGroup.DRESSING_ROOM}
        canManageOperationalAllocations={canManageOperational}
        canManagePublication={canManagePublication}
        publicationVisibilityState={item.publicationVisibility ? "ready" : "unavailable"}
      />
    </>
  );
}

function TournamentOperationalPanel({
  item,
  locale,
  timezone,
  facilityGroupsByAllocationGroup,
  tenantDressingRoomOccupancyPresets,
  plannerEditAccess,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "TOURNAMENT" }>;
} & Omit<Props, "item" | "alternativePlanActive" | "focus">) {
  const canManage =
    !!plannerEditAccess &&
    (canDomainManagePlannerItem(item, plannerEditAccess) ||
      canOperationalManagePlannerItem(item, plannerEditAccess));
  const { startAt, endAt } = weekplannerItemPlanningWindow(item);
  const { dressingRoomAvailability } = useFacilityAvailability({
    enabled: true,
    startAt,
    endAt,
    excludeEventId: item.eventId,
  });
  const statusLabel = listOperationalStatusLabel(listOperationalRowStatus(item));

  return (
    <OperationalDensePanelShell
      sectionTitle="Turniervorbereitung"
      openPointsLabel={statusLabel === "Unvollständig" ? statusLabel : null}
      testId={`planning-hub-liste-operational-panel-${item.id}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <PlannerOperationalStatusSection item={item} locale={locale} timezone={timezone} variant="detail-popover" />
      <span data-testid="planning-hub-liste-operational-editor" className="sr-only" aria-hidden>
        operational
      </span>
      {canManage ? (
        <div className="mt-2 space-y-3">
          <TournamentPitchAssignmentRow
            item={item}
            facilityGroups={facilityGroupsByAllocationGroup.PITCH_HALL}
            onSaved={onSaved}
          />
          <WeekplannerTournamentParticipantDressingSection
            tournamentId={item.eventId}
            facilityGroups={facilityGroupsByAllocationGroup.DRESSING_ROOM}
            dressingRoomAvailability={dressingRoomAvailability}
            onMutation={onSaved}
          />
          {tenantDressingRoomOccupancyPresets &&
          item.participantAllocations.some((p) => p.dressingRoomAllocations.length > 0) ? (
            <DressingRoomOccupancyEditor
              item={item}
              activityType="TOURNAMENT"
              activityId={item.eventId}
              tenantPresets={tenantDressingRoomOccupancyPresets}
              onSaved={onSaved}
            />
          ) : null}
        </div>
      ) : null}
    </OperationalDensePanelShell>
  );
}

function TournamentPitchAssignmentRow({
  item,
  facilityGroups,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "TOURNAMENT" }>;
  facilityGroups: FacilityGroup[];
  onSaved: () => void;
}) {
  const tResources = useTranslations("PlanningResources");
  const router = useRouter();
  const pitchIds = useMemo(
    () => new Set(item.pitchAllocations.map((r) => r.facilityResourceId)),
    [item.pitchAllocations],
  );
  const { startAt, endAt } = weekplannerItemPlanningWindow(item);
  const { pitchAvailability } = useFacilityAvailability({
    enabled: true,
    startAt,
    endAt,
    excludeEventId: item.eventId,
  });
  const [pending, setPending] = useState(false);

  async function replacePitch(nextIds: string[]) {
    setPending(true);
    try {
      const allocsRes = await fetch(`/api/tournaments/${item.eventId}/resource-allocations`);
      const allocsData = (await allocsRes.json().catch(() => null)) as
        | { allocations?: Array<{ id: string; facilityResourceId: string }> }
        | null;
      const existingAllocs = allocsData?.allocations ?? [];
      const toRemove = existingAllocs.filter((a) => !nextIds.includes(a.facilityResourceId));
      await Promise.all(
        toRemove.map((a) =>
          fetch(`/api/tournaments/${item.eventId}/resource-allocations/${a.id}`, { method: "DELETE" }),
        ),
      );
      const toAdd = nextIds.filter((id) => !existingAllocs.some((a) => a.facilityResourceId === id));
      await Promise.all(
        toAdd.map((resourceId) =>
          fetch(`/api/tournaments/${item.eventId}/resource-allocations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ facilityResourceId: resourceId }),
          }),
        ),
      );
      router.refresh();
      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <PlanningOperationalResourceGroup testId={`planning-hub-liste-tournament-resources-${item.id}`}>
      <PlanningSingleResourceAssignment
        kind="pitch_hall"
        subjectLabel="Spielfeld"
        suppressKindIcon
        resourceName={resourceLabelFromRefs(item.pitchAllocations)}
        unassignedLabel={tResources("unassignedPitchHall")}
        facilityGroups={facilityGroups}
        selectedResourceIds={pitchIds}
        onSelect={async (id) => replacePitch([id])}
        onDeselect={async () => replacePitch([])}
        availabilityByResourceId={pitchAvailability}
        canManage
        disabled={pending}
        testId={`planning-hub-liste-tournament-pitch-${item.id}`}
      />
    </PlanningOperationalResourceGroup>
  );
}

function VeranstaltungOperationalPanel({
  item,
  locale,
  timezone,
  facilityGroupsByAllocationGroup,
  tenantDressingRoomOccupancyPresets,
  plannerEditAccess,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "VERANSTALTUNG" }>;
} & Pick<
  Props,
  "locale" | "timezone" | "facilityGroupsByAllocationGroup" | "tenantDressingRoomOccupancyPresets" | "plannerEditAccess" | "onSaved"
>) {
  const canManage =
    !!plannerEditAccess && canDomainManagePlannerItem(item, plannerEditAccess);
  const router = useRouter();
  const formId = `liste-veranstaltung-schedule-${item.id}`;
  const [date, setDate] = useState(initialEditorDate(item, timezone));
  const [startTime, setStartTime] = useState(isoToLocalTime(item.canonicalStartAt));
  const [endTime, setEndTime] = useState(isoToLocalTime(item.canonicalEndAt));
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<EventFacilityAllocationDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${item.eventId}/facility-allocations`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { allocations?: EventFacilityAllocationDto[] } | null;
        if (!cancelled) setAllocations(data?.allocations ?? []);
      })
      .catch(() => {
        if (!cancelled) setAllocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [item.eventId]);

  const planningWindow = useMemo(() => weekplannerItemPlanningWindow(item), [item]);
  const startAt = useMemo(
    () => localToUtcIso(date, startTime, timezone) ?? planningWindow.startAt,
    [date, startTime, timezone, planningWindow.startAt],
  );
  const endAt = useMemo(
    () => localToUtcIso(date, endTime, timezone) ?? planningWindow.endAt,
    [date, endTime, timezone, planningWindow.endAt],
  );

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: !!startAt,
    startAt,
    endAt,
    excludeEventId: item.eventId,
  });

  async function saveSchedule() {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const schedule = parseClubEventScheduleFromApiBody(
        {
          allDay: item.allDay,
          startDate: date,
          startTime,
          endDate: date,
          endTime,
        },
        timezone,
        { allDay: item.allDay, startAt: item.canonicalStartAt, endAt: item.canonicalEndAt },
      );
      const res = await fetch(`/api/events/${item.eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: schedule.startAt.toISOString(),
          endAt: schedule.endAt?.toISOString() ?? null,
          allDay: schedule.allDay,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Speichern fehlgeschlagen.");
      router.refresh();
      onSaved();
    } catch (err) {
      if (err instanceof ClubEventScheduleError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <OperationalDensePanelShell
      sectionTitle="Ressourcen & Termin"
      testId={`planning-hub-liste-operational-panel-${item.id}`}
      isSaving={saving}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]" data-testid="planning-hub-liste-veranstaltung-scope">
        Termin und Einrichtungen für diese Veranstaltung. Stammdaten im{" "}
        <Link href={getVeranstaltungHref(item.eventId)} className="font-semibold text-[var(--sce-primary)] hover:underline">
          Veranstaltungsbereich
        </Link>
        .
      </p>
      <PlannerOperationalStatusSection item={item} locale={locale} timezone={timezone} variant="detail-popover" />
      <span data-testid="planning-hub-liste-operational-editor" className="sr-only" aria-hidden>
        operational
      </span>
      <div className="mt-2 space-y-3">
        {allocations ? (
          <VeranstaltungFacilityAllocationEditor
            eventId={item.eventId}
            canManage={canManage}
            initialAllocations={allocations}
            pitchHallFacilityGroups={facilityGroupsByAllocationGroup.PITCH_HALL}
            dressingRoomFacilityGroups={facilityGroupsByAllocationGroup.DRESSING_ROOM}
            pitchAvailabilityByResourceId={pitchAvailability}
            dressingRoomAvailabilityByResourceId={dressingRoomAvailability}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">Ressourcen werden geladen…</p>
        )}
        <div className="rounded-lg border border-[var(--border)]/70">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            aria-expanded={scheduleOpen}
            onClick={() => setScheduleOpen((v) => !v)}
          >
            <span className="text-sm font-medium text-[var(--foreground)]">Termin</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", scheduleOpen && "rotate-180")} />
          </button>
          {scheduleOpen && canManage ? (
            <div className="space-y-2 border-t border-[var(--border)]/60 px-3 py-2">
              {error ? <WeekplannerEditorError message={error} /> : null}
              <WeekplannerDateTimeFields
                formId={formId}
                date={date}
                startTime={startTime}
                endTime={endTime}
                onDateChange={setDate}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
              <button
                type="button"
                className="fca-button-primary text-sm"
                disabled={saving}
                onClick={() => void saveSchedule()}
                data-testid={`planning-hub-liste-veranstaltung-schedule-save-${item.id}`}
              >
                Termin speichern
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </OperationalDensePanelShell>
  );
}

function DetailsModuleLink({ item }: { item: WeekplannerItem }) {
  const href = getPlanningHubItemHref(item);
  if (!href) return null;
  return (
    <p className="text-xs text-[var(--text-2)]">
      <Link href={href} className="font-semibold text-[var(--sce-primary)] hover:underline">
        Vollständige Bearbeitung im Quellmodul →
      </Link>
    </p>
  );
}

export default function PlanningHubListeOperationalPanel(props: Props) {
  const { focus, alternativePlanActive } = props;
  const item = useMemo(() => reviveWeekplannerItemFromTransport(props.item), [props.item]);

  if (alternativePlanActive) {
    return (
      <OperationalDensePanelShell
        sectionTitle="Betriebsplan"
        testId={`planning-hub-liste-operational-panel-${item.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">
          Ressourcen und Overrides für alternative Betriebspläne bearbeiten Sie in der Kalender-Ansicht — nicht inline in
          der Liste.
        </p>
        {focus === "details" ? <DetailsModuleLink item={item} /> : null}
      </OperationalDensePanelShell>
    );
  }

  return (
    <div data-testid={`planning-hub-liste-operational-shell-${item.id}`}>
      {focus === "details" ? (
        <div className="mb-2 px-0.5">
          <DetailsModuleLink item={item} />
        </div>
      ) : null}
      <PlanningHubListeInlineManipulationHost
        item={item}
        focus={focus}
        locale={props.locale}
        timezone={props.timezone}
        onSaved={props.onSaved}
      />
      <PlanningHubListeOperationalPanelErrorBoundary itemId={item.id}>
        {item.type === "MATCH" ? (
          <MatchOperationalPanel
            item={item}
            facilityGroupsByAllocationGroup={props.facilityGroupsByAllocationGroup}
            plannerEditAccess={props.plannerEditAccess}
          />
        ) : item.type === "TRAINING" ? (
          <TrainingOperationalPanel {...props} item={item} />
        ) : item.type === "TOURNAMENT" ? (
          <TournamentOperationalPanel {...props} item={item} />
        ) : (
          <VeranstaltungOperationalPanel {...props} item={item} />
        )}
      </PlanningHubListeOperationalPanelErrorBoundary>
    </div>
  );
}
