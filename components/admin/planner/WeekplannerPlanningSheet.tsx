"use client";

/**
 * components/admin/planner/WeekplannerPlanningSheet.tsx
 *
 * PLANNING-UX-C3 — Wochenplaner Premium Editing Workspace.
 *
 * Renders the canonical planning editor inside a right-side Sheet overlay
 * (~750–820 px desktop width, full viewport height) so the visual resource
 * allocator has sufficient horizontal space to render readable cards.
 *
 * The Wochenplan week grid remains visible behind the sheet for coordinator
 * context. All canonical mutation paths from WeekplannerCanonicalPlanningEditor
 * are preserved — this file is purely a layout wrapper.
 *
 * Architecture invariants:
 *   - All saves still go through the same canonical API endpoints.
 *   - Canonical PlanningResourcePicker via WeekplannerPlanningResourceSection.
 *   - No duplicate planning records; no new availability engine.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WeekplannerPlanningResourceSection } from "@/components/admin/planner/WeekplannerPlanningResourceSection";
import {
  WeekplannerActivityEditorSheet,
  WeekplannerActivityIdentityCard,
  WeekplannerDateTimeFields,
  WeekplannerEditorError,
  WeekplannerEditorFooter,
  WeekplannerSectionLabel,
  initialEditorDate,
} from "@/components/admin/planner/WeekplannerActivityEditorShell";
import { WeekplannerTournamentParticipantDressingSection } from "@/components/admin/planner/WeekplannerTournamentParticipantDressingSection";
import VeranstaltungFacilityAllocationEditor from "@/components/admin/veranstaltungen/VeranstaltungFacilityAllocationEditor";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { FacilityResourceType } from "@prisma/client";
import DressingRoomOccupancyEditor from "@/components/admin/planning-hub/DressingRoomOccupancyEditor";
import {
  getMatchEndTimeCorrectionHref,
  matchRequiresEndTimeAction,
  MATCH_END_TIME_ACTION_LABEL,
  MATCH_END_TIME_MISSING_COPY,
} from "@/lib/match/match-operational-completeness";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";
import {
  isoToLocalDate,
  isoToLocalTime,
  localToUtcIso,
  setsEqual,
} from "@/lib/weekplanner/weekplanner-editor-time";
import {
  isMatchScheduleExternallyOwned,
  saveManualMatchSchedule,
  saveMatchOperationalEndOverride,
  saveTournamentSchedule,
} from "@/lib/weekplanner/weekplanner-match-schedule";
import { parseClubEventScheduleFromApiBody } from "@/lib/events/club-event-api-scheduling";
import type { EventFacilityAllocationDto } from "@/lib/events/event-facility-allocation-types";

// ── Types ─────────────────────────────────────────────────────────────────────

type SheetProps = {
  item: WeekplannerItem | null;
  facilityGroupsByAllocationGroup: {
    PITCH_HALL: FacilityGroup[];
    DRESSING_ROOM: FacilityGroup[];
  };
  timezone: string;
  tenantDressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  onClose: () => void;
  onSaved: () => void;
};

// ── TrainingEditor ────────────────────────────────────────────────────────────

function TrainingEditorContent({
  item,
  facilityGroupsByAllocationGroup,
  timezone,
  tenantDressingRoomOccupancyPresets,
  onClose,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "TRAINING" }>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  timezone: string;
  tenantDressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const formId = useId();

  const initDate = isoToLocalDate(item.canonicalStartAt, timezone);
  const initStart = isoToLocalTime(item.canonicalStartAt);
  const initEnd = isoToLocalTime(item.canonicalEndAt);
  const initPitchIds = new Set(item.canonicalPitchAllocations.map((r) => r.facilityResourceId));
  const initRoomIds = new Set(item.canonicalDressingRoomAllocations.map((r) => r.facilityResourceId));

  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(initEnd);
  const [selectedPitchIds, setSelectedPitchIds] = useState<Set<string>>(initPitchIds);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(initRoomIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAt = useMemo(() => {
    if (!date || !startTime) return "";
    return localToUtcIso(date, startTime, timezone) ?? "";
  }, [date, startTime, timezone]);

  const endAt = useMemo(() => {
    if (!date || !endTime) return "";
    return localToUtcIso(date, endTime, timezone) ?? "";
  }, [date, endTime, timezone]);

  const {
    pitchAvailability,
    dressingRoomAvailability,
    isLoading: availabilityLoading,
  } = useFacilityAvailability({
    enabled: !!startAt,
    startAt,
    endAt,
    excludeTrainingSessionId: item.trainingSessionId,
  });

  const timesValid = !!startTime && !!endTime && startTime < endTime;
  const timeChanged = date !== initDate || startTime !== initStart || endTime !== initEnd;
  const pitchChanged = !setsEqual(selectedPitchIds, initPitchIds);
  const roomChanged = !setsEqual(selectedRoomIds, initRoomIds);
  const hasChanges = timeChanged || pitchChanged || roomChanged;

  async function handleSave() {
    if (!timesValid || !hasChanges) return;
    setSaving(true);
    setError(null);

    try {
      const sessionId = item.trainingSessionId;

      if (timeChanged) {
        const res = await fetch(`/api/training-sessions/${sessionId}/reschedule`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, startsAt: startTime, endsAt: endTime }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Zeitänderung fehlgeschlagen.");
        }
      }

      if (pitchChanged || roomChanged) {
        const currentAllocationsRes = await fetch(`/api/training-sessions/${sessionId}/allocations`);
        const currentData = (await currentAllocationsRes.json().catch(() => null)) as
          | { allocations?: Array<{ id: string; facilityResourceType: string }> }
          | null;
        const currentAllocations = currentData?.allocations ?? [];

        const pitchAllocations = currentAllocations.filter(
          (a) => classifyFacilityResourceType(a.facilityResourceType as FacilityResourceType) === "PITCH_HALL",
        );
        const roomAllocations = currentAllocations.filter(
          (a) => classifyFacilityResourceType(a.facilityResourceType as FacilityResourceType) === "DRESSING_ROOM",
        );

        const toDelete = [
          ...(pitchChanged ? pitchAllocations : []),
          ...(roomChanged ? roomAllocations : []),
        ];

        await Promise.all(
          toDelete.map((a) =>
            fetch(`/api/training-sessions/${sessionId}/allocations/${a.id}`, { method: "DELETE" }),
          ),
        );

        const toAdd = [
          ...(pitchChanged ? Array.from(selectedPitchIds) : []),
          ...(roomChanged ? Array.from(selectedRoomIds) : []),
        ];

        for (const resourceId of toAdd) {
          const res = await fetch(`/api/training-sessions/${sessionId}/allocations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ facilityResourceId: resourceId }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            console.warn("Allocation add failed:", data?.error);
          }
        }
      }

      router.refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  return (
    <WeekplannerActivityEditorSheet
      description={item.title}
      onClose={onClose}
      footer={
        <WeekplannerEditorFooter
          saving={saving}
          hasChanges={hasChanges}
          canSave={timesValid}
          onSave={handleSave}
          onClose={onClose}
        />
      }
    >
      <div data-testid="weekplanner-canonical-editor" className="space-y-6">
        <WeekplannerActivityIdentityCard item={item} timezone={timezone} />
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

        <div className="space-y-2">
          <WeekplannerSectionLabel>Spielfeld / Halle</WeekplannerSectionLabel>
          <WeekplannerPlanningResourceSection
            kind="pitch_hall"
            facilityGroups={facilityGroupsByAllocationGroup.PITCH_HALL}
            selectedResourceIds={selectedPitchIds}
            onSelect={(id) => setSelectedPitchIds((prev) => new Set([...prev, id]))}
            onDeselect={(id) =>
              setSelectedPitchIds((prev) => {
                const s = new Set(prev);
                s.delete(id);
                return s;
              })
            }
            availabilityByResourceId={pitchAvailability}
            disabled={saving || availabilityLoading}
            testId="wochenplaner-canonical-pitch"
            unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen"
          />
        </div>

        <div className="space-y-2">
          <WeekplannerSectionLabel>Garderobe</WeekplannerSectionLabel>
          <WeekplannerPlanningResourceSection
            kind="dressing_room"
            facilityGroups={facilityGroupsByAllocationGroup.DRESSING_ROOM}
            selectedResourceIds={selectedRoomIds}
            onSelect={(id) => setSelectedRoomIds((prev) => new Set([...prev, id]))}
            onDeselect={(id) =>
              setSelectedRoomIds((prev) => {
                const s = new Set(prev);
                s.delete(id);
                return s;
              })
            }
            availabilityByResourceId={dressingRoomAvailability}
            disabled={saving || availabilityLoading}
            testId="wochenplaner-canonical-room"
            unassignedLabel="Keine Garderobe zugewiesen"
          />
          {tenantDressingRoomOccupancyPresets && selectedRoomIds.size > 0 && (
            <DressingRoomOccupancyEditor
              item={item}
              activityType="TRAINING"
              activityId={item.trainingSessionId}
              tenantPresets={tenantDressingRoomOccupancyPresets}
              onSaved={onSaved}
            />
          )}
        </div>
      </div>
    </WeekplannerActivityEditorSheet>
  );
}

// ── MatchEditor ───────────────────────────────────────────────────────────────

function MatchEditorContent({
  item,
  facilityGroupsByAllocationGroup,
  timezone,
  tenantDressingRoomOccupancyPresets,
  onClose,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "MATCH" }>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  timezone: string;
  tenantDressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const formId = useId();
  const scheduleExternallyOwned = isMatchScheduleExternallyOwned(item.eventSource);

  const initDate = isoToLocalDate(item.canonicalStartAt, timezone);
  const initStart = isoToLocalTime(item.canonicalStartAt, timezone);
  const initEnd = isoToLocalTime(item.canonicalEndAt, timezone);
  const initPitchCode = item.canonicalPitchAllocations[0]?.code ?? "";
  const initHomeDressingCode = item.canonicalDressingRoomAllocations[0]?.code ?? "";
  const initAwayDressingCode = item.awayDressingRoomAllocations[0]?.code ?? "";

  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(initEnd);
  const [pitchCode, setPitchCode] = useState(initPitchCode);
  const [homeDressingCode, setHomeDressingCode] = useState(initHomeDressingCode);
  const [awayDressingCode, setAwayDressingCode] = useState(initAwayDressingCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAt = useMemo(() => {
    if (scheduleExternallyOwned) return item.canonicalStartAt.toISOString();
    return localToUtcIso(date, startTime, timezone) ?? item.canonicalStartAt.toISOString();
  }, [scheduleExternallyOwned, date, startTime, timezone, item.canonicalStartAt]);

  const endAt = useMemo(() => {
    if (!endTime) return item.canonicalEndAt.toISOString();
    return localToUtcIso(date, endTime, timezone) ?? item.canonicalEndAt.toISOString();
  }, [date, endTime, timezone, item.canonicalEndAt]);

  const { pitchAvailability: pitchAvByCode, dressingRoomAvailability: roomAvByCode } = useFacilityAvailability({
    enabled: true,
    startAt,
    endAt,
    excludeEventId: item.eventId,
    keyBy: "code",
  });

  const pitchGroupsByCode = useMemo(
    () =>
      facilityGroupsByAllocationGroup.PITCH_HALL.map((fg) => ({
        ...fg,
        resources: fg.resources.map((r) => ({ ...r, id: r.code })),
      })),
    [facilityGroupsByAllocationGroup.PITCH_HALL],
  );

  const roomGroupsByCode = useMemo(
    () =>
      facilityGroupsByAllocationGroup.DRESSING_ROOM.map((fg) => ({
        ...fg,
        resources: fg.resources.map((r) => ({ ...r, id: r.code })),
      })),
    [facilityGroupsByAllocationGroup.DRESSING_ROOM],
  );

  const timeChanged =
    !scheduleExternallyOwned &&
    (date !== initDate || startTime !== initStart || endTime !== initEnd);
  const scheduleChanged =
    scheduleExternallyOwned && endTime !== initEnd;
  const hasChanges =
    timeChanged ||
    scheduleChanged ||
    pitchCode !== initPitchCode ||
    homeDressingCode !== initHomeDressingCode ||
    awayDressingCode !== initAwayDressingCode;

  const timesValid = !!startTime && !!endTime && startTime < endTime;

  async function handleSave() {
    if (!hasChanges || !timesValid) return;
    setSaving(true);
    setError(null);

    try {
      if (scheduleExternallyOwned && scheduleChanged) {
        const endIso = localToUtcIso(date, endTime, timezone);
        if (!endIso) throw new Error("Bitte eine gültige Endzeit angeben.");
        await saveMatchOperationalEndOverride(item.eventId, endIso);
      } else if (timeChanged) {
        const startIso = localToUtcIso(date, startTime, timezone);
        const endIso = localToUtcIso(date, endTime, timezone);
        if (!startIso || !endIso) throw new Error("Bitte gültige Uhrzeiten angeben.");
        await saveManualMatchSchedule(item.eventId, startIso, endIso);
      }

      const resourceChanged =
        pitchCode !== initPitchCode ||
        homeDressingCode !== initHomeDressingCode ||
        awayDressingCode !== initAwayDressingCode;
      if (resourceChanged) {
        const body: Record<string, string | null> = {
          pitchCode: pitchCode || null,
          homeDressingRoomCode: homeDressingCode || null,
          awayDressingRoomCode: awayDressingCode || null,
        };
        const res = await fetch(`/api/matchcenter/${item.eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
        }
      }
      router.refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  const matchTitle = `${item.homeSide.displayName} vs. ${item.awaySide.displayName}`;

  return (
    <WeekplannerActivityEditorSheet
      description={matchTitle}
      onClose={onClose}
      footer={
        <WeekplannerEditorFooter
          saving={saving}
          hasChanges={hasChanges}
          canSave={timesValid}
          onSave={handleSave}
          onClose={onClose}
        />
      }
    >
      <div data-testid="weekplanner-canonical-editor" className="space-y-6">
        <WeekplannerActivityIdentityCard item={item} timezone={timezone} />

        {matchRequiresEndTimeAction({
          startAt: item.canonicalStartAt,
          endAt: item.canonicalEndAt,
        }) ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900">
            <p className="font-semibold">{MATCH_END_TIME_ACTION_LABEL}</p>
            <p className="mt-0.5 text-xs text-amber-800/90">{MATCH_END_TIME_MISSING_COPY}</p>
            <Link
              href={getMatchEndTimeCorrectionHref(item.eventId)}
              className="mt-2 inline-block text-xs font-semibold text-amber-900 hover:underline"
            >
              {MATCH_END_TIME_ACTION_LABEL}
            </Link>
          </div>
        ) : null}

        {error ? <WeekplannerEditorError message={error} /> : null}

        <WeekplannerDateTimeFields
          formId={formId}
          date={date}
          startTime={startTime}
          endTime={endTime}
          onDateChange={setDate}
          onStartChange={setStartTime}
          onEndChange={setEndTime}
          dateReadOnly={scheduleExternallyOwned}
          startReadOnly={scheduleExternallyOwned}
          endTestId="weekplanner-match-canonical-end"
        />
        {scheduleExternallyOwned ? (
          <p className="text-xs text-[var(--muted)]">
            Anstoß und Datum werden vom Anbieter synchronisiert. Endzeit kann operativ angepasst werden.
          </p>
        ) : null}

        <div className="space-y-2">
          <WeekplannerSectionLabel>Spielfeld / Halle</WeekplannerSectionLabel>
          <WeekplannerPlanningResourceSection
            kind="pitch_hall"
            facilityGroups={pitchGroupsByCode}
            selectedResourceIds={pitchCode ? new Set([pitchCode]) : new Set()}
            onSelect={(code) => setPitchCode(code)}
            onDeselect={() => setPitchCode("")}
            availabilityByResourceId={pitchAvByCode}
            disabled={saving}
            singleSelect
            testId="wochenplaner-canonical-match-pitch"
            unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen"
          />
        </div>

        <div className="space-y-2">
          <WeekplannerSectionLabel>Heimkabine</WeekplannerSectionLabel>
          <WeekplannerPlanningResourceSection
            kind="dressing_room"
            facilityGroups={roomGroupsByCode}
            selectedResourceIds={homeDressingCode ? new Set([homeDressingCode]) : new Set()}
            onSelect={(code) => setHomeDressingCode(code)}
            onDeselect={() => setHomeDressingCode("")}
            availabilityByResourceId={roomAvByCode}
            disabled={saving}
            singleSelect
            testId="wochenplaner-canonical-match-home-room"
            unassignedLabel="Keine Garderobe zugewiesen"
            subjectLabel="Heim"
          />
        </div>

        <div className="space-y-2">
          <WeekplannerSectionLabel>Gastkabine</WeekplannerSectionLabel>
          <WeekplannerPlanningResourceSection
            kind="dressing_room"
            facilityGroups={roomGroupsByCode}
            selectedResourceIds={awayDressingCode ? new Set([awayDressingCode]) : new Set()}
            onSelect={(code) => setAwayDressingCode(code)}
            onDeselect={() => setAwayDressingCode("")}
            availabilityByResourceId={roomAvByCode}
            disabled={saving}
            singleSelect
            testId="wochenplaner-canonical-match-away-room"
            unassignedLabel="Keine Garderobe zugewiesen"
            subjectLabel="Gast"
          />
        </div>

        {tenantDressingRoomOccupancyPresets && (homeDressingCode || awayDressingCode) && (
          <DressingRoomOccupancyEditor
            item={item}
            activityType="MATCH"
            activityId={item.eventId}
            tenantPresets={tenantDressingRoomOccupancyPresets}
            onSaved={onSaved}
          />
        )}
      </div>
    </WeekplannerActivityEditorSheet>
  );
}

// ── TournamentEditor ──────────────────────────────────────────────────────────

function TournamentEditorContent({
  item,
  facilityGroupsByAllocationGroup,
  timezone,
  tenantDressingRoomOccupancyPresets,
  onClose,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "TOURNAMENT" }>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  timezone: string;
  tenantDressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const formId = useId();

  const initDate = initialEditorDate(item, timezone);
  const initStart = isoToLocalTime(item.canonicalStartAt, timezone);
  const initEnd = isoToLocalTime(item.canonicalEndAt, timezone);
  const initPitchIds = new Set(item.canonicalPitchAllocations.map((r) => r.facilityResourceId));
  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(initEnd);
  const [selectedPitchIds, setSelectedPitchIds] = useState<Set<string>>(initPitchIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAt = useMemo(
    () => localToUtcIso(date, startTime, timezone) ?? item.canonicalStartAt.toISOString(),
    [date, startTime, timezone, item.canonicalStartAt],
  );
  const endAt = useMemo(
    () => localToUtcIso(date, endTime, timezone) ?? item.canonicalEndAt.toISOString(),
    [date, endTime, timezone, item.canonicalEndAt],
  );

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: !!startAt,
    startAt,
    endAt,
    excludeEventId: item.eventId,
  });

  const timesValid = !!startTime && !!endTime && startTime < endTime;
  const timeChanged = date !== initDate || startTime !== initStart || endTime !== initEnd;
  const pitchChanged = !setsEqual(selectedPitchIds, initPitchIds);
  const hasChanges = timeChanged || pitchChanged;

  async function handleSave() {
    if (!hasChanges || !timesValid) return;
    setSaving(true);
    setError(null);

    try {
      if (timeChanged) {
        await saveTournamentSchedule(item.eventId, startAt, endAt);
      }

      const toRemove = Array.from(initPitchIds).filter((id) => !selectedPitchIds.has(id));
      const toAdd = Array.from(selectedPitchIds).filter((id) => !initPitchIds.has(id));

      const allocsRes = await fetch(`/api/tournaments/${item.eventId}/resource-allocations`);
      const allocsData = (await allocsRes.json().catch(() => null)) as
        | { allocations?: Array<{ id: string; facilityResourceId: string }> }
        | null;
      const existingAllocs = allocsData?.allocations ?? [];

      await Promise.all(
        toRemove
          .map((resourceId) => existingAllocs.find((a) => a.facilityResourceId === resourceId))
          .filter(Boolean)
          .map((a) =>
            fetch(`/api/tournaments/${item.eventId}/resource-allocations/${a!.id}`, { method: "DELETE" }),
          ),
      );

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  return (
    <WeekplannerActivityEditorSheet
      description={item.title}
      onClose={onClose}
      footer={
        <WeekplannerEditorFooter
          saving={saving}
          hasChanges={hasChanges}
          canSave={timesValid}
          onSave={handleSave}
          onClose={onClose}
        />
      }
    >
      <div data-testid="weekplanner-canonical-editor" className="space-y-6">
        <WeekplannerActivityIdentityCard item={item} timezone={timezone} />
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

        <div className="space-y-2">
          <WeekplannerSectionLabel>Spielfeld / Halle</WeekplannerSectionLabel>
          <WeekplannerPlanningResourceSection
            kind="pitch_hall"
            facilityGroups={facilityGroupsByAllocationGroup.PITCH_HALL}
            selectedResourceIds={selectedPitchIds}
            onSelect={(id) => setSelectedPitchIds((prev) => new Set([...prev, id]))}
            onDeselect={(id) =>
              setSelectedPitchIds((prev) => {
                const s = new Set(prev);
                s.delete(id);
                return s;
              })
            }
            availabilityByResourceId={pitchAvailability}
            disabled={saving}
            testId="wochenplaner-canonical-tournament-pitch"
            unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen"
          />
        </div>

        <WeekplannerTournamentParticipantDressingSection
          tournamentId={item.eventId}
          facilityGroups={facilityGroupsByAllocationGroup.DRESSING_ROOM}
          dressingRoomAvailability={dressingRoomAvailability}
          onMutation={() => router.refresh()}
        />

        {tenantDressingRoomOccupancyPresets &&
          item.participantAllocations.some((p) => p.dressingRoomAllocations.length > 0) && (
            <DressingRoomOccupancyEditor
              item={item}
              activityType="TOURNAMENT"
              activityId={item.eventId}
              tenantPresets={tenantDressingRoomOccupancyPresets}
              onSaved={onSaved}
            />
          )}
      </div>
    </WeekplannerActivityEditorSheet>
  );
}

function VeranstaltungEditorContent({
  item,
  facilityGroupsByAllocationGroup,
  timezone,
  tenantDressingRoomOccupancyPresets,
  onClose,
  onSaved,
}: {
  item: Extract<WeekplannerItem, { type: "VERANSTALTUNG" }>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  timezone: string;
  tenantDressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const formId = useId();

  const initDate = initialEditorDate(item, timezone);
  const initStart = isoToLocalTime(item.canonicalStartAt, timezone);
  const initEnd = isoToLocalTime(item.canonicalEndAt, timezone);
  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(initEnd);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<EventFacilityAllocationDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${item.eventId}/facility-allocations`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          allocations?: EventFacilityAllocationDto[];
        } | null;
        if (!cancelled) {
          setAllocations(data?.allocations ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setAllocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [item.eventId]);

  const startAt = useMemo(
    () => localToUtcIso(date, startTime, timezone) ?? item.canonicalStartAt.toISOString(),
    [date, startTime, timezone, item.canonicalStartAt],
  );
  const endAt = useMemo(
    () => localToUtcIso(date, endTime, timezone) ?? item.canonicalEndAt.toISOString(),
    [date, endTime, timezone, item.canonicalEndAt],
  );

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: !!startAt,
    startAt,
    endAt,
    excludeEventId: item.eventId,
  });

  const timesValid = !!startTime && !!endTime && startTime < endTime;
  const timeChanged = date !== initDate || startTime !== initStart || endTime !== initEnd;
  const hasChanges = timeChanged;

  async function handleSave() {
    if (!hasChanges || !timesValid) return;
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
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  return (
    <WeekplannerActivityEditorSheet
      description={item.title}
      onClose={onClose}
      footer={
        <WeekplannerEditorFooter
          saving={saving}
          hasChanges={hasChanges}
          canSave={timesValid}
          onSave={handleSave}
          onClose={onClose}
        />
      }
    >
      <div data-testid="weekplanner-canonical-editor" className="space-y-6">
        <WeekplannerActivityIdentityCard item={item} timezone={timezone} />
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

        {allocations ? (
          <VeranstaltungFacilityAllocationEditor
            eventId={item.eventId}
            canManage
            initialAllocations={allocations}
            pitchHallFacilityGroups={facilityGroupsByAllocationGroup.PITCH_HALL}
            dressingRoomFacilityGroups={facilityGroupsByAllocationGroup.DRESSING_ROOM}
            pitchAvailabilityByResourceId={pitchAvailability}
            dressingRoomAvailabilityByResourceId={dressingRoomAvailability}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">Ressourcen werden geladen…</p>
        )}

      </div>
    </WeekplannerActivityEditorSheet>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * WeekplannerPlanningSheet
 *
 * Renders the appropriate canonical editor (Training / Match / Tournament)
 * inside a right-side Sheet overlay. `item === null` means the sheet is closed.
 */
export function WeekplannerPlanningSheet({
  item,
  facilityGroupsByAllocationGroup,
  timezone,
  tenantDressingRoomOccupancyPresets,
  onClose,
  onSaved,
}: SheetProps) {
  if (!item) return null;

  if (item.type === "TRAINING") {
    return (
      <TrainingEditorContent
        item={item}
        facilityGroupsByAllocationGroup={facilityGroupsByAllocationGroup}
        timezone={timezone}
        tenantDressingRoomOccupancyPresets={tenantDressingRoomOccupancyPresets}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  if (item.type === "MATCH") {
    return (
      <MatchEditorContent
        item={item}
        facilityGroupsByAllocationGroup={facilityGroupsByAllocationGroup}
        timezone={timezone}
        tenantDressingRoomOccupancyPresets={tenantDressingRoomOccupancyPresets}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  if (item.type === "TOURNAMENT") {
    return (
      <TournamentEditorContent
        item={item}
        facilityGroupsByAllocationGroup={facilityGroupsByAllocationGroup}
        timezone={timezone}
        tenantDressingRoomOccupancyPresets={tenantDressingRoomOccupancyPresets}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  if (item.type === "VERANSTALTUNG") {
    return (
      <VeranstaltungEditorContent
        item={item}
        facilityGroupsByAllocationGroup={facilityGroupsByAllocationGroup}
        timezone={timezone}
        tenantDressingRoomOccupancyPresets={tenantDressingRoomOccupancyPresets}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return null;
}
