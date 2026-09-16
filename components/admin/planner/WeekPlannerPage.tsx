"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";
import type { WochenplanPlanDto } from "@/lib/wochenplan/plan-types";
import { WeekplannerPlanBar } from "./WeekplannerPlanBar";
import { WeekplannerPlanningSheet } from "./WeekplannerPlanningSheet";
import { WeekplannerOperationalPlanningSheet } from "./WeekplannerOperationalPlanningSheet";
import PlanningHubCreateMenu, {
  type PlanningHubCreatePermissions,
} from "@/components/admin/planning-hub/PlanningHubCreateMenu";
import PlanningHubConflictAttention from "@/components/admin/planning-hub/PlanningHubConflictAttention";
import PlanningHubConflictSheet from "@/components/admin/planning-hub/PlanningHubConflictSheet";
import PlanningHubCalendarView from "@/components/admin/planning-hub/PlanningHubCalendarView";
import PlanningHubResourceDayView from "@/components/admin/planning-hub/PlanningHubResourceDayView";
import { PlanningHubManipulationProvider } from "@/components/admin/planning-hub/PlanningHubManipulationContext";
import {
  buildResourceSegmentsForDay,
} from "@/lib/planning-hub/scheduler/resource-segments";
import PlanningHubListeView from "@/components/admin/planning-hub/PlanningHubListeView";
import PlanningHubWeekFilters from "@/components/admin/planning-hub/PlanningHubWeekFilters";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import {
  buildPlanningHubHref,
  resolvePlanningHubResourceDay,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";
import { dayKeyInTimeZone } from "@/lib/planning-hub/scheduler/time-zone";
import type { WeekplannerOverrideRow } from "./WeekplannerAllocationOverrideEditor";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

type OverrideEditingContext = {
  planId: string;
  planName: string;
  overridesByKey: Record<string, WeekplannerOverrideRow[]>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
};

type CanonicalEditingContext = {
  canManageTrainings: boolean;
  canManageEvents: boolean;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
};

type WeekPlannerPageProps = {
  week: WeekplannerWeek;
  todayParam: string;
  locale?: string;
  timezone?: string;
  wochenplanPlans?: WochenplanPlanDto[];
  plans?: WeekplannerPlanDto[];
  viewedWochenplanPlanId?: string | null;
  selectedPlanParam?: string | null;
  materializedWeekplannerPlanId?: string | null;
  activePlanId?: string | null;
  canManagePlans?: boolean;
  overrideEditing?: OverrideEditingContext;
  canonicalEditing?: CanonicalEditingContext;
  urlState?: PlanningHubUrlState;
  facilityOptions?: { value: string; label: string }[];
  createPermissions?: PlanningHubCreatePermissions;
};

function weekHref(param: string, urlState: PlanningHubUrlState): string {
  return buildPlanningHubHref({ ...urlState, week: param });
}

function getMissingAllocations(item: WeekplannerItem): string[] {
  const missing: string[] = [];
  if (item.pitchAllocations.length === 0) missing.push("Spielfeld");
  if (item.type === "MATCH") {
    if (item.dressingRoomAllocations.length === 0) missing.push("Heimkabine");
    if (item.awayDressingRoomAllocations.length === 0) missing.push("Gastkabine");
  }
  return missing;
}

export default function WeekPlannerPage({
  week,
  todayParam,
  locale = "de-CH",
  timezone = "Europe/Zurich",
  wochenplanPlans = [],
  plans = [],
  viewedWochenplanPlanId = null,
  selectedPlanParam = null,
  materializedWeekplannerPlanId = null,
  activePlanId = null,
  canManagePlans = false,
  overrideEditing,
  canonicalEditing,
  urlState: urlStateProp,
  facilityOptions = [],
  createPermissions,
}: WeekPlannerPageProps) {
  const router = useRouter();
  const urlState: PlanningHubUrlState = urlStateProp ?? {
    week: week.param,
    perspective: "kalender",
    activity: "alle",
    team: null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
  };

  const filteredWeek = applyPlanningHubFilters(week, urlState);
  const totalItems = filteredWeek.days.reduce((sum, day) => sum + day.items.length, 0);
  const todayDayKey = dayKeyInTimeZone(new Date(), timezone);

  const isStandardplan = activePlanId === null;
  const incompleteCount = isStandardplan
    ? filteredWeek.days.reduce(
        (sum, day) =>
          sum + day.items.filter((item) => getMissingAllocations(item).length > 0).length,
        0,
      )
    : 0;

  const [editingItem, setEditingItem] = useState<WeekplannerItem | null>(null);
  const [operationalEditingItem, setOperationalEditingItem] = useState<WeekplannerItem | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<PlanningConflictIncident | null>(null);
  const [conflictPicker, setConflictPicker] = useState<PlanningConflictIncident[] | null>(null);

  const canEdit = !!canonicalEditing;

  const teamOptions = (() => {
    const map = new Map<string, string>();
    for (const day of week.days) {
      for (const item of day.items) {
        if (item.type === "TRAINING") {
          map.set(item.teamSeasonId, item.teamNames[0] ?? item.title);
        } else if (item.teamNames[0]) {
          map.set(item.teamNames[0], item.teamNames[0]);
        }
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "de-CH"));
  })();

  const itemsById = new Map(
    week.days.flatMap((day) => day.items.map((item) => [item.id, item] as const)),
  );

  function handleEdit(item: WeekplannerItem) {
    if (!canonicalEditing) return;
    const canEditThisItem =
      item.type !== "VERANSTALTUNG" &&
      ((item.type === "TRAINING" && canonicalEditing.canManageTrainings) ||
        ((item.type === "MATCH" || item.type === "TOURNAMENT") && canonicalEditing.canManageEvents));
    if (canEditThisItem) setEditingItem(item);
  }

  function handleOperationalEdit(item: WeekplannerItem) {
    if (!overrideEditing) return;
    setOperationalEditingItem(item);
  }

  function handleItemActivate(item: WeekplannerItem) {
    if (item.type === "VERANSTALTUNG") {
      router.push(`/dashboard/veranstaltungen/${item.eventId}`);
      return;
    }
    if (activePlanId && overrideEditing) {
      handleOperationalEdit(item);
      return;
    }
    if (isStandardplan && canEdit) {
      handleEdit(item);
    }
  }

  function handleReviewConflicts(incidents: PlanningConflictIncident[]) {
    if (incidents.length === 1) {
      setSelectedIncident(incidents[0]!);
      return;
    }
    setConflictPicker(incidents);
  }

  const resolvedUrlState = { ...urlState, week: week.param };

  const manipulationFacilityGroups =
    canonicalEditing?.facilityGroupsByAllocationGroup ??
    overrideEditing?.facilityGroupsByAllocationGroup;

  const resourceRowsForManipulation = useMemo(() => {
    if (urlState.perspective !== "ressourcen" || !manipulationFacilityGroups) return [];
    const filtered = applyPlanningHubFilters(week, resolvedUrlState);
    const weekDayKeys = filtered.days.map((d) => d.dayKey);
    const selectedDay = resolvePlanningHubResourceDay(weekDayKeys, urlState.day, todayDayKey);
    const day = filtered.days.find((d) => d.dayKey === selectedDay) ?? filtered.days[0];
    if (!day) return [];
    const segments = buildResourceSegmentsForDay(day.items, urlState.resourceCategory);
    return segments.map((s) => ({
      resourceId: s.resource.facilityResourceId,
      ref: s.resource,
    }));
  }, [week, resolvedUrlState, urlState.perspective, urlState.day, urlState.resourceCategory, todayDayKey, manipulationFacilityGroups]);

  const wrapManipulation = (node: ReactNode) => {
    if (!manipulationFacilityGroups) return node;
    return (
      <PlanningHubManipulationProvider
        week={week}
        urlState={resolvedUrlState}
        locale={locale}
        timezone={timezone}
        isStandardplan={isStandardplan}
        alternativePlanId={activePlanId}
        canManageTrainings={canonicalEditing?.canManageTrainings ?? false}
        canManageEvents={canonicalEditing?.canManageEvents ?? false}
        facilityGroupsByAllocationGroup={manipulationFacilityGroups}
        overridesByKey={overrideEditing?.overridesByKey}
        resourceRows={resourceRowsForManipulation}
      >
        {node}
      </PlanningHubManipulationProvider>
    );
  };

  return (
    <div className="space-y-3" data-testid="planning-hub-workspace">
      <AdminSectionHeader
        eyebrow="Planung"
        title="Wochenplaner"
        description="Alles, was diese Woche im Verein stattfindet."
        actions={createPermissions ? <PlanningHubCreateMenu permissions={createPermissions} /> : undefined}
      />

      <div className="space-y-2 border-b border-[var(--border)] pb-3">
        <WeekplannerPlanBar
          weekParam={week.param}
          wochenplanPlans={wochenplanPlans}
          weekplannerPlans={plans}
          selectedPlanParam={selectedPlanParam ?? viewedWochenplanPlanId}
          materializedWeekplannerPlanId={materializedWeekplannerPlanId}
          canManage={canManagePlans}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={weekHref(week.previousParam, resolvedUrlState)}
              aria-label="Vorherige Woche"
              data-testid="weekplanner-previous-week"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <p className="text-sm font-semibold text-[var(--foreground)]" data-testid="weekplanner-range-label">
              {week.rangeLabel}
            </p>
            <Link
              href={weekHref(week.nextParam, resolvedUrlState)}
              aria-label="Nächste Woche"
              data-testid="weekplanner-next-week"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href={weekHref(todayParam, resolvedUrlState)}
              data-testid="weekplanner-today"
              className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-2.5 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            >
              Heute
            </Link>
          </div>

          <div
            className="flex items-center gap-0.5 rounded-md border border-[var(--border)] p-0.5"
            data-testid="planning-hub-perspective"
          >
            {(
              [
                ["kalender", "Kalender"],
                ["ressourcen", "Ressourcen"],
                ["liste", "Liste"],
              ] as const
            ).map(([perspective, label]) => (
              <Link
                key={perspective}
                href={buildPlanningHubHref(resolvedUrlState, { perspective })}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-semibold",
                  urlState.perspective === perspective
                    ? "bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {urlState.perspective === "ressourcen" && (
          <div className="flex gap-1">
            <Link
              href={buildPlanningHubHref(resolvedUrlState, { resourceCategory: "pitch" })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                urlState.resourceCategory === "pitch"
                  ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "border-[var(--border)] text-[var(--text-2)]",
              )}
            >
              Spielfeld / Halle
            </Link>
            <Link
              href={buildPlanningHubHref(resolvedUrlState, { resourceCategory: "dressing" })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                urlState.resourceCategory === "dressing"
                  ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "border-[var(--border)] text-[var(--text-2)]",
              )}
            >
              Garderobe
            </Link>
          </div>
        )}

        <PlanningHubWeekFilters
          urlState={resolvedUrlState}
          teamOptions={teamOptions}
          facilityOptions={facilityOptions}
        />

        <PlanningHubConflictAttention
          week={week}
          incompleteCount={incompleteCount}
          onReviewConflicts={handleReviewConflicts}
        />
      </div>

      {totalItems === 0 ? (
        <EmptyState
          heading="Keine Planungseinträge"
          description="Für diese Kalenderwoche gibt es keine passenden Aktivitäten."
        />
      ) : urlState.perspective === "kalender" ? (
        wrapManipulation(
          <PlanningHubCalendarView
            week={week}
            urlState={resolvedUrlState}
            locale={locale}
            timezone={timezone}
            todayDayKey={todayDayKey}
            onItemActivate={handleItemActivate}
          />,
        )
      ) : urlState.perspective === "ressourcen" ? (
        wrapManipulation(
          <PlanningHubResourceDayView
            week={week}
            urlState={resolvedUrlState}
            locale={locale}
            timezone={timezone}
            todayDayKey={todayDayKey}
            onItemActivate={handleItemActivate}
          />,
        )
      ) : (
        <PlanningHubListeView
          week={week}
          urlState={resolvedUrlState}
          locale={locale}
          timezone={timezone}
          planName={activePlanId ? plans.find((p) => p.id === activePlanId)?.name ?? null : null}
          onItemActivate={handleItemActivate}
        />
      )}

      {canonicalEditing && (
        <WeekplannerPlanningSheet
          item={editingItem}
          facilityGroupsByAllocationGroup={canonicalEditing.facilityGroupsByAllocationGroup}
          timezone={timezone}
          onClose={() => setEditingItem(null)}
          onSaved={() => setEditingItem(null)}
        />
      )}

      {overrideEditing && (
        <WeekplannerOperationalPlanningSheet
          item={operationalEditingItem}
          planId={overrideEditing.planId}
          planName={overrideEditing.planName}
          overridesByKey={overrideEditing.overridesByKey}
          facilityGroupsByAllocationGroup={overrideEditing.facilityGroupsByAllocationGroup}
          timezone={timezone}
          onClose={() => setOperationalEditingItem(null)}
          onSaved={() => setOperationalEditingItem(null)}
        />
      )}

      <PlanningHubConflictSheet
        incident={selectedIncident}
        itemsById={itemsById}
        locale={locale}
        timezone={timezone}
        reassignContext={
          canonicalEditing
            ? {
                canManageTrainings: canonicalEditing.canManageTrainings,
                canManageEvents: canonicalEditing.canManageEvents,
                isStandardplan: activePlanId === null,
              }
            : undefined
        }
        onClose={() => setSelectedIncident(null)}
        onReassignItem={(item) => {
          setSelectedIncident(null);
          handleEdit(item);
        }}
      />

      {conflictPicker && conflictPicker.length > 1 && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          role="dialog"
          aria-label="Konflikte auswählen"
        >
          <div className="max-h-[70vh] w-full max-w-md overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
            <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Konflikte prüfen</p>
            <ul className="space-y-1">
              {conflictPicker.map((incident) => (
                <li key={incident.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setConflictPicker(null);
                      setSelectedIncident(incident);
                    }}
                  >
                    {incident.facilityResourceName} · {incident.occupancyCount} Belegungen
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--text-2)]"
              onClick={() => setConflictPicker(null)}
            >
              Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
