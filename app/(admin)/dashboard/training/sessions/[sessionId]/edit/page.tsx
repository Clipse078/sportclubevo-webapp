import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Layers } from "lucide-react";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getTrainingSession } from "@/lib/training/session-generation-service";
import { TrainingSessionNotFoundError } from "@/lib/training/errors";
import { listAllocationsByTrainingSeries } from "@/lib/training/training-allocation-service";
import { listAllocationsByTrainingSession } from "@/lib/training/session-allocation-service";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import { ToastProvider } from "@/components/ui/ToastProvider";
import TrainingSessionEditForm from "@/components/admin/training/TrainingSessionEditForm";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import { TrainingSessionAllocationEditor } from "@/components/admin/training/TrainingSessionAllocationEditor";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import { buildTrainingSessionWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";

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

  return (
    <ToastProvider>
      <div className="max-w-[900px] space-y-6">
        <Link
          href="/dashboard/training"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zu Trainings
        </Link>

        <AdminSectionHeader
          eyebrow="Einzeltraining bearbeiten"
          title={`${trainingSession.teamName} · ${trainingSession.trainingSeriesTitle}`}
          description={`Teil der Serie «${trainingSession.trainingSeriesTitle}». Änderungen gelten ausschliesslich für dieses eine Training.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={buildTrainingSeriesEditHref(trainingSession.trainingSeriesId)}
                className="fca-button-secondary inline-flex items-center gap-1.5 text-sm"
              >
                <Layers className="h-3.5 w-3.5" />
                Zur Serie
              </Link>
              <Link href={wochenplanerHref} className="fca-button-secondary inline-flex items-center gap-1.5 text-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                Im Wochenplaner anzeigen
              </Link>
            </div>
          }
        />

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <TrainingSessionEditForm
            sessionId={trainingSession.id}
            canManage={canManage}
            isRescheduled={trainingSession.isRescheduled}
            effectiveDate={trainingSession.date}
            effectiveStartTime={formatWallTime(trainingSession.startAt, trainingSession.timezone)}
            effectiveEndTime={formatWallTime(trainingSession.endAt, trainingSession.timezone)}
            originalDate={trainingSession.originalDate}
            originalStartTime={formatWallTime(trainingSession.originalStartAt, trainingSession.timezone)}
            originalEndTime={formatWallTime(trainingSession.originalEndAt, trainingSession.timezone)}
            timezone={trainingSession.timezone}
            locale={locale}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Teilnahme</h2>
          <p className="mb-4 text-sm text-gray-500">
            Antwortfrist für dieses einzelne Training (Serien-Standard bleibt unverändert).
          </p>
          <ParticipationRequestConfigEditor
            apiPath={`/api/training-sessions/${trainingSession.id}/participation-request`}
            timeZone={timezone}
            disabled={!canManage}
            values={{
              participationResponseDueAt: trainingSession.participationResponseDueAt,
              participationReminder1At: trainingSession.participationReminder1At,
              participationReminder2At: trainingSession.participationReminder2At,
              participationReminder1PresetKey: trainingSession.participationReminder1PresetKey,
              participationReminder2PresetKey: trainingSession.participationReminder2PresetKey,
            }}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <TrainingSessionAllocationEditor
            sessionId={trainingSession.id}
            initialAllocations={sessionAllocations}
            seriesAllocations={seriesAllocations}
            facilityGroups={facilityGroups}
            canManage={canManage}
            sessionStartAt={trainingSession.startAt}
            sessionEndAt={trainingSession.endAt}
          />
        </div>
      </div>
    </ToastProvider>
  );
}
