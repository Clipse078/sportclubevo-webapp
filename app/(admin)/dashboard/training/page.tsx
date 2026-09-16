import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listTrainingSeries } from "@/lib/training/training-service";
import { buildTrainingSeriesCockpitViewModel } from "@/lib/training/series-cockpit-data";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { listAllocationSummaryByTenant } from "@/lib/training/training-allocation-service";
import { listSessionAllocationSummaryByTenant } from "@/lib/training/session-allocation-service";
import {
  resolveTrainingDayWindow,
  resolveTrainingMonthWindow,
  resolveTrainingWeekWindow,
  listTrainingSessionDateBounds,
  formatTrainingDayLabel,
  formatTrainingMonthLabel,
  formatTrainingWeekLabel,
  normalizeTrainingCenterView,
  TRAINING_DEFAULT_TIMEZONE,
} from "@/lib/training/date-range";
import { buildTrainingCenterViewModel, normalizeTrainingActionFilter } from "@/lib/training/view-model";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import TrainingCenterOverview from "@/components/admin/training/TrainingCenterOverview";
import TrainingSeriesListView from "@/components/admin/training/TrainingSeriesListView";
import { buildWochenplanerResourcesHrefFromLegacyTrainingParams } from "@/lib/planning-hub/training-planungsraster-redirect";
import { cn } from "@/lib/cn";

type TrainingPageSearchParams = {
  tab?: string;
  archived?: string;
  view?: string;
  month?: string;
  week?: string;
  day?: string;
  filter?: string;
  category?: string;
  facility?: string;
  team?: string;
  conflicts?: string;
  unallocated?: string;
  daypart?: string;
};

type Props = {
  searchParams?: Promise<TrainingPageSearchParams>;
};

const TOP_TABS: { key: "kalender" | "serien"; label: string }[] = [
  { key: "kalender", label: "Kalender" },
  { key: "serien", label: "Serien" },
];

const TRAINING_DESCRIPTION =
  "Trainingskalender, Einzeltrainings und Serien — Ressourcenplanung im Wochenplaner.";

export default async function TrainingCenterPage({ searchParams }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.TRAININGS_DELETE,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const canManage = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const canCreate = canManage || hasPermission(session, PERMISSIONS.TRAININGS_VIEW);
  const canDelete = hasPermission(session, PERMISSIONS.TRAININGS_DELETE);
  const params: TrainingPageSearchParams = searchParams ? await searchParams : {};
  const timezone = tenantContext.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const locale = tenantContext.locale ?? "de-CH";

  if (params.tab === "planungsraster") {
    redirect(
      buildWochenplanerResourcesHrefFromLegacyTrainingParams({
        day: params.day,
        week: params.week,
        facility: params.facility,
        team: params.team,
        conflicts: params.conflicts,
        category: params.category,
        timezone,
      }),
    );
  }

  const tab = params.tab === "serien" ? "serien" : "kalender";

  if (tab === "serien") {
    const showArchived = params.archived === "1";
    const allSeries = await listTrainingSeries(tenantContext.id, { includeArchived: true });
    const displayedSeries = showArchived ? allSeries : allSeries.filter((series) => series.status !== "ARCHIVED");
    const archivedCount = allSeries.filter((series) => series.status === "ARCHIVED").length;

    const [cockpitRows, facilities] = await Promise.all([
      buildTrainingSeriesCockpitViewModel(tenantContext.id, displayedSeries, timezone),
      getFacilitiesForTenant(tenantContext.id),
    ]);

    function facilityGroupsForTypes(types: readonly string[]): FacilityGroup[] {
      return facilities
        .filter((facility) => facility.status !== "ARCHIVED")
        .map((facility) => ({
          facilityId: facility.id,
          facilityName: facility.name,
          facilityType: facility.type as string,
          resources: facility.resources
            .filter((resource) => resource.status !== "ARCHIVED" && types.includes(resource.type))
            .map((resource) => ({
              id: resource.id,
              name: resource.name,
              code: resource.code,
              type: resource.type,
              facilityId: facility.id,
              facilityName: facility.name,
              facilityType: facility.type as string,
            })),
        }))
        .filter((group) => group.resources.length > 0);
    }

    const pitchFacilityGroups = facilityGroupsForTypes(["FULL_PITCH", "HALF_PITCH"]);
    const dressingRoomFacilityGroups = facilityGroupsForTypes(["DRESSING_ROOM"]);

    return (
      <div className="space-y-6">
        <AdminSectionHeader
          eyebrow="Planung"
          title="Trainings"
          description={TRAINING_DESCRIPTION}
          actions={
            canCreate ? (
              <Link href="/dashboard/training/new" className="fca-button-primary inline-flex items-center gap-1.5 text-sm">
                <Plus className="h-3.5 w-3.5" />
                Neue Trainingsserie
              </Link>
            ) : undefined
          }
        />
        <TopTabs active={tab} />
        <TrainingSeriesListView
          cockpitRows={cockpitRows}
          showArchived={showArchived}
          archivedCount={archivedCount}
          canManage={canManage}
          isCoordinator={canManage}
          canDelete={canDelete}
          pitchFacilityGroups={pitchFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        />
      </div>
    );
  }

  const view = normalizeTrainingCenterView(params.view);
  const actionFilter = normalizeTrainingActionFilter(params.filter);

  const now = new Date();
  const monthWindow = resolveTrainingMonthWindow({
    monthParam: params.month,
    now,
    timeZone: timezone,
  });
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: params.week,
    now,
    timeZone: timezone,
  });
  const dayWindow = resolveTrainingDayWindow({
    dayParam: params.day,
    now,
    timeZone: timezone,
  });

  const sessionDateBounds = listTrainingSessionDateBounds(view, {
    month: monthWindow,
    week: weekWindow,
    day: dayWindow,
  });

  const [sessions, allocationSummaries, sessionAllocationOverrides] = await Promise.all([
    listTrainingSessions(tenantContext.id, sessionDateBounds),
    listAllocationSummaryByTenant(tenantContext.id),
    listSessionAllocationSummaryByTenant(tenantContext.id),
  ]);

  const viewModel = buildTrainingCenterViewModel(sessions, allocationSummaries, {
    actionFilter,
    sessionAllocationOverrides,
  });

  return (
    <div className="max-w-[1400px] space-y-6">
      <AdminSectionHeader
        eyebrow="Planung"
        title="Trainings"
        description={TRAINING_DESCRIPTION}
        actions={
          canManage ? (
            <Link href="/dashboard/training/new" className="fca-button-primary inline-flex items-center gap-1.5 text-sm">
              <Plus className="h-3.5 w-3.5" />
              Neue Trainingsserie
            </Link>
          ) : undefined
        }
      />

      <TopTabs active={tab} />

      <TrainingCenterOverview
        view={view}
        actionFilter={actionFilter}
        viewModel={viewModel}
        monthWindow={{
          param: monthWindow.param,
          label: formatTrainingMonthLabel(monthWindow, locale, timezone),
          previousParam: monthWindow.previousParam,
          nextParam: monthWindow.nextParam,
          weeks: monthWindow.weeks,
        }}
        weekWindow={{
          param: weekWindow.param,
          label: formatTrainingWeekLabel(weekWindow, locale, timezone),
          previousParam: weekWindow.previousParam,
          nextParam: weekWindow.nextParam,
          days: weekWindow.days,
        }}
        dayWindow={{
          param: dayWindow.param,
          label: formatTrainingDayLabel(dayWindow.date, locale, timezone),
          previousParam: dayWindow.previousParam,
          nextParam: dayWindow.nextParam,
          date: dayWindow.date,
        }}
        canManage={canManage}
        timezone={timezone}
        locale={locale}
      />
    </div>
  );
}

function TopTabs({ active }: { active: "kalender" | "serien" }) {
  return (
    <div role="tablist" aria-label="Trainings-Bereiche" className="flex gap-1 border-b border-[var(--border)]">
      {TOP_TABS.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={`/dashboard/training?tab=${item.key}`}
            role="tab"
            aria-selected={isActive}
            data-testid={`trainingcenter-tab-${item.key}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              isActive
                ? "border-[var(--sce-primary)] text-[var(--sce-primary)]"
                : "border-transparent text-[var(--text-2)] hover:text-[var(--foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
