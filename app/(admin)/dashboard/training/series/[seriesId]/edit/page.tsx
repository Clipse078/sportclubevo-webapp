import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { getTrainingSeries } from "@/lib/training/training-service";
import { listAllocationsByTrainingSeries } from "@/lib/training/training-allocation-service";
import { findTeamSeasonPickerRow } from "@/lib/training/queries";
import { TrainingSeriesNotFoundError } from "@/lib/training/errors";
import { countSeriesOccurrenceAllocationExceptions } from "@/lib/training/series-cockpit-exception-data";
import { buildTrainingSeriesWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";
import { formatTrainingSeriesEditHeaderMeta } from "@/lib/training/training-series-edit-presentation";
import { TrainingAllocationEditor } from "@/components/admin/training/TrainingAllocationEditor";
import TrainingSeriesRecordWorkspace from "@/components/admin/training/record/TrainingSeriesRecordWorkspace";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { prisma } from "@/lib/db/prisma";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";

type Props = { params: Promise<{ seriesId: string }> };

function toDateInputValue(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export default async function EditTrainingSeriesPage({ params }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.TRAININGS_DELETE,
  ]);

  const canDelete = hasPermission(session, PERMISSIONS.TRAININGS_DELETE);
  const canManage = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const canEditTeamPublication = hasPermission(session, PERMISSIONS.TEAMS_MANAGE);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const { seriesId } = await params;

  let series;
  try {
    series = await getTrainingSeries(tenantId, seriesId);
  } catch (err) {
    if (err instanceof TrainingSeriesNotFoundError) notFound();
    throw err;
  }

  const [
    teamSeasonRow,
    teamSeasonPublication,
    occurrenceExceptionCount,
    allocations,
    facilities,
    operationalDurationPolicy,
  ] = await Promise.all([
    findTeamSeasonPickerRow(tenantId, series.teamSeasonId),
    prisma.teamSeason.findFirst({
      where: { id: series.teamSeasonId, team: { tenantId } },
      select: {
        trainingWebsiteVisible: true,
        infoboardVisible: true,
      },
    }),
    countSeriesOccurrenceAllocationExceptions(tenantId, seriesId, series.timezone),
    listAllocationsByTrainingSeries(tenantId, seriesId).catch((err) => {
      if (err instanceof TrainingSeriesNotFoundError) notFound();
      throw err;
    }),
    getFacilitiesForTenant(tenantId),
    getTenantOperationalDurationPolicy(tenantId),
  ]);

  const facilityGroups: FacilityGroup[] = facilities
    .filter((f) => f.status !== "ARCHIVED")
    .map((f) => ({
      facilityId: f.id,
      facilityName: f.name,
      facilityType: f.type as string,
      resources: f.resources
        .filter((r) => r.status !== "ARCHIVED")
        .map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type,
          facilityId: f.id,
          facilityName: f.name,
          facilityType: f.type as string,
        })),
    }))
    .filter((fg) => fg.resources.length > 0);

  const headerMeta = formatTrainingSeriesEditHeaderMeta({ series, allocations });
  const wochenplanerHref = buildTrainingSeriesWochenplanerHref({
    teamSeasonId: series.teamSeasonId,
    timezone: series.timezone,
  });

  const exceptionNotice =
    occurrenceExceptionCount > 0 ? (
      <div
        className="flex items-start gap-3 rounded-xl border border-[var(--blue)]/30 bg-[var(--blue)]/10 px-4 py-3 text-sm text-[var(--foreground)]"
        data-testid="training-series-edit-exception-notice"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" aria-hidden />
        <div className="space-y-1">
          <p>
            Diese Serie hat{" "}
            <span className="font-semibold">
              {occurrenceExceptionCount === 1
                ? "1 Einzeltermin-Ausnahme"
                : `${occurrenceExceptionCount} Einzeltermin-Ausnahmen`}
            </span>
            . Änderungen an der Serie wirken sich nicht automatisch auf bereits abweichend zugewiesene Einzeltermine aus.
          </p>
          <Link
            href="/dashboard/training"
            className="inline-flex text-xs font-semibold text-[var(--blue)] underline-offset-2 hover:underline"
          >
            Zur Trainings-Übersicht
          </Link>
        </div>
      </div>
    ) : null;

  return (
    <TrainingSeriesRecordWorkspace
      seriesId={series.id}
      seriesStatus={series.status}
      teamSeasons={teamSeasonRow ? [teamSeasonRow] : []}
      defaultValues={{
        teamSeasonId: series.teamSeasonId,
        title: series.title,
        description: series.description,
        timezone: series.timezone,
        validFrom: toDateInputValue(series.validFrom),
        validUntil: toDateInputValue(series.validUntil),
        weekdaySchedules: series.weekdaySchedules,
      }}
      resourcesSection={
        <TrainingAllocationEditor
          trainingSeriesId={series.id}
          trainingSeriesTitle={series.title}
          initialAllocations={allocations}
          facilityGroups={facilityGroups}
          canManage={canManage}
          layout="workspace"
        />
      }
      wochenplanerHref={wochenplanerHref}
      scheduleRail={headerMeta.scheduleRail}
      pitchLabel={headerMeta.pitchLabel}
      dressingRoomLabel={headerMeta.dressingRoomLabel}
      updatedAtIso={series.updatedAt}
      publication={{
        trainingWebsiteVisible: teamSeasonPublication?.trainingWebsiteVisible ?? true,
        infoboardVisible: teamSeasonPublication?.infoboardVisible ?? true,
        canEditTeamPublication,
      }}
      canManage={canManage}
      canDelete={canDelete}
      exceptionNotice={exceptionNotice}
      defaultTrainingDurationMinutes={operationalDurationPolicy.TRAINING.durationMinutes}
    />
  );
}
