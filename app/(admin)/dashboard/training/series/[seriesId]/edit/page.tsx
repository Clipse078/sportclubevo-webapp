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
import TrainingCenterShell from "@/components/admin/training/TrainingCenterShell";
import TrainingSeriesForm from "@/components/admin/training/TrainingSeriesForm";
import TrainingSeriesDeleteControl from "@/components/admin/training/TrainingSeriesDeleteControl";
import { TrainingAllocationEditor } from "@/components/admin/training/TrainingAllocationEditor";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { cn } from "@/lib/cn";

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

  const [teamSeasonRow, occurrenceExceptionCount, allocations, facilities] = await Promise.all([
    findTeamSeasonPickerRow(tenantId, series.teamSeasonId),
    countSeriesOccurrenceAllocationExceptions(tenantId, seriesId, series.timezone),
    listAllocationsByTrainingSeries(tenantId, seriesId).catch((err) => {
      if (err instanceof TrainingSeriesNotFoundError) notFound();
      throw err;
    }),
    getFacilitiesForTenant(tenantId),
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

  return (
    <TrainingCenterShell
      variant="editor"
      activeTab="serien"
      title={`Bearbeiten: ${series.title}`}
      description="Manage recurring training schedule and resources."
    >
      {occurrenceExceptionCount > 0 ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--blue)_35%,var(--border))] bg-[color-mix(in_srgb,var(--blue)_8%,var(--surface))] px-4 py-3 text-sm text-[var(--foreground)]"
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
              href="/dashboard/training?tab=serien"
              className="inline-flex text-xs font-semibold text-[var(--sce-primary)] hover:underline"
            >
              Ausnahmen im Serien-Cockpit ansehen
            </Link>
          </div>
        </div>
      ) : null}

      <TrainingSeriesForm
        mode="edit"
        seriesId={series.id}
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
            embedded
          />
        }
        dangerSection={
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Trainingsserie löschen</p>
              <p className={cn("text-xs text-[var(--text-2)]")}>
                Entfernt die Serie und ihre generierten Termine endgültig.
              </p>
            </div>
            <TrainingSeriesDeleteControl
              seriesId={series.id}
              seriesTitle={series.title}
              canDelete={canDelete}
              variant="bare"
            />
          </div>
        }
      />
    </TrainingCenterShell>
  );
}
