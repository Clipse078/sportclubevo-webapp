import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getTrainingSession } from "@/lib/training/session-generation-service";
import { TrainingSessionNotFoundError } from "@/lib/training/errors";
import { listAllocationsByTrainingSeries } from "@/lib/training/training-allocation-service";
import { listAllocationsByTrainingSession } from "@/lib/training/session-allocation-service";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { ToastProvider } from "@/components/ui/ToastProvider";
import TrainingSessionRecordWorkspace from "@/components/admin/training/record/TrainingSessionRecordWorkspace";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import { buildTrainingSessionWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";
import { weekdayFromDate, toDateOnlyUtc } from "@/lib/training/recurrence";

type Props = { params: Promise<{ sessionId: string }> };

function formatWallTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso));
}

export default async function TrainingSessionEditPage({ params }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const canManage = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const { sessionId } = await params;

  let trainingSession;
  try {
    trainingSession = await getTrainingSession(tenantContext.id, sessionId);
  } catch (err) {
    if (err instanceof TrainingSessionNotFoundError) notFound();
    throw err;
  }

  if (trainingSession.status !== "SCHEDULED") notFound();

  const locale = tenantContext.locale ?? "de-CH";
  const timezone = tenantContext.timezone ?? "Europe/Zurich";

  const [seriesAllocations, sessionAllocations, facilities] = await Promise.all([
    listAllocationsByTrainingSeries(tenantContext.id, trainingSession.trainingSeriesId),
    listAllocationsByTrainingSession(tenantContext.id, sessionId),
    getFacilitiesForTenant(tenantContext.id),
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

  const wochenplanerHref = buildTrainingSessionWochenplanerHref({
    sessionDate: trainingSession.date,
    teamSeasonId: trainingSession.teamSeasonId,
    timezone,
  });

  const seriesWeekday = weekdayFromDate(
    toDateOnlyUtc(new Date(`${trainingSession.originalDate}T12:00:00.000Z`)),
  );

  return (
    <ToastProvider>
      <TrainingSessionRecordWorkspace
        sessionId={trainingSession.id}
        trainingSeriesId={trainingSession.trainingSeriesId}
        trainingSeriesTitle={trainingSession.trainingSeriesTitle}
        teamName={trainingSession.teamName}
        canManage={canManage}
        isRescheduled={trainingSession.isRescheduled}
        effectiveDate={trainingSession.date}
        effectiveStartTime={formatWallTime(trainingSession.startAt, trainingSession.timezone)}
        effectiveEndTime={formatWallTime(trainingSession.endAt, trainingSession.timezone)}
        originalDate={trainingSession.originalDate}
        originalStartTime={formatWallTime(trainingSession.originalStartAt, trainingSession.timezone)}
        originalEndTime={formatWallTime(trainingSession.originalEndAt, trainingSession.timezone)}
        seriesWeekday={seriesWeekday}
        timezone={trainingSession.timezone}
        locale={locale}
        seriesEditHref={buildTrainingSeriesEditHref(trainingSession.trainingSeriesId)}
        wochenplanerHref={wochenplanerHref}
        dressingRoomOccupancyMode={trainingSession.dressingRoomOccupancyMode}
        initialSessionAllocations={sessionAllocations}
        seriesAllocations={seriesAllocations}
        facilityGroups={facilityGroups}
        sessionStartAt={trainingSession.startAt}
        sessionEndAt={trainingSession.endAt}
      />
    </ToastProvider>
  );
}
