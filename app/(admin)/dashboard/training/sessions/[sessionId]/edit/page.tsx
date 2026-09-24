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
import TrainingSessionEditForm from "@/components/admin/training/TrainingSessionEditForm";
import TrainingSessionEditHeader from "@/components/admin/training/TrainingSessionEditHeader";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import { TrainingSessionAllocationEditor } from "@/components/admin/training/TrainingSessionAllocationEditor";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import { buildTrainingSessionWochenplanerHref } from "@/lib/training/wochenplaner-deep-links";
import {
  formatTrainingSessionEditSeriesStandardLine,
  pickTrainingSessionEditPresentation,
} from "@/lib/training/training-session-edit-presentation";
import {
  TRAINING_FORM_MAX_WIDTH_CLASS,
  TRAINING_FORM_WORKSPACE_SURFACE_CLASS,
} from "@/components/admin/training/form/training-form-layout";
import { cn } from "@/lib/cn";
import { getTranslations } from "next-intl/server";
import { getTrainingSessionParticipantRoster } from "@/lib/training/training-session-participants";
import { TrainingSessionParticipantsPanel } from "@/components/admin/training/TrainingSessionParticipantsPanel";

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
  const t = await getTranslations("TrainingCenter.sessionEdit");

  const effectiveStartTime = formatWallTime(trainingSession.startAt, trainingSession.timezone);
  const effectiveEndTime = formatWallTime(trainingSession.endAt, trainingSession.timezone);
  const originalStartTime = formatWallTime(trainingSession.originalStartAt, trainingSession.timezone);
  const originalEndTime = formatWallTime(trainingSession.originalEndAt, trainingSession.timezone);

  const { pageTitle, scheduleContext } = pickTrainingSessionEditPresentation({
    teamName: trainingSession.teamName,
    trainingSeriesTitle: trainingSession.trainingSeriesTitle,
    date: trainingSession.date,
    timezone: trainingSession.timezone,
    locale,
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
  });

  const seriesStandardLine = formatTrainingSessionEditSeriesStandardLine({
    originalDate: trainingSession.originalDate,
    originalStartTime,
    originalEndTime,
    locale,
    timezone: trainingSession.timezone,
  });

  const [seriesAllocations, sessionAllocations, facilities, participantRoster] = await Promise.all([
    listAllocationsByTrainingSeries(tenantContext.id, trainingSession.trainingSeriesId),
    listAllocationsByTrainingSession(tenantContext.id, sessionId),
    getFacilitiesForTenant(tenantContext.id),
    getTrainingSessionParticipantRoster(tenantContext.id, sessionId),
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
      <div
        className={cn(TRAINING_FORM_MAX_WIDTH_CLASS, "min-w-0 space-y-3 pb-6")}
        data-testid="training-session-edit-page"
      >
        <TrainingSessionEditHeader
          backHref="/dashboard/training"
          backLabel={t("backNavTrainings")}
          title={pageTitle}
          scheduleContext={scheduleContext}
          seriesEditHref={buildTrainingSeriesEditHref(trainingSession.trainingSeriesId)}
          wochenplanerHref={wochenplanerHref}
          toSeriesLabel={t("toSeries")}
          wochenplanerLabel={t("showInWeekPlanner")}
        />

        <p className="text-xs leading-snug text-[var(--text-2)]" data-testid="training-session-edit-inheritance-intro">
          {t("inheritanceIntro")}
        </p>

        <div
          className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-12 lg:gap-4"
          data-testid="training-session-edit-workspace-grid"
        >
          <section
            className={cn(
              TRAINING_FORM_WORKSPACE_SURFACE_CLASS,
              "min-w-0 self-start lg:col-span-7 xl:col-span-8",
            )}
            aria-labelledby="training-session-edit-datetime-heading"
            data-testid="training-session-edit-datetime-panel"
          >
            <div className="px-3 py-3 md:px-4 md:py-3.5">
              <TrainingSessionEditForm
                sessionId={trainingSession.id}
                canManage={canManage}
                isRescheduled={trainingSession.isRescheduled}
                effectiveDate={trainingSession.date}
                effectiveStartTime={effectiveStartTime}
                effectiveEndTime={effectiveEndTime}
                originalDate={trainingSession.originalDate}
                originalStartTime={originalStartTime}
                originalEndTime={originalEndTime}
                timezone={trainingSession.timezone}
                locale={locale}
                seriesStandardLine={seriesStandardLine}
              />
            </div>
          </section>

          <section
            className={cn(
              TRAINING_FORM_WORKSPACE_SURFACE_CLASS,
              "min-w-0 self-start lg:col-span-5 xl:col-span-4",
            )}
            aria-labelledby="training-session-edit-participation-heading"
            data-testid="training-session-edit-participation-panel"
          >
            <div className="space-y-2 px-3 py-3 md:px-4 md:py-3.5">
              <div className="space-y-0.5">
                <h2
                  id="training-session-edit-participation-heading"
                  className="text-sm font-semibold tracking-tight text-[var(--foreground)]"
                >
                  {t("participationHeading")}
                </h2>
                <p className="text-xs text-[var(--text-2)]">{t("participationDescription")}</p>
              </div>
              <ParticipationRequestConfigEditor
                apiPath={`/api/training-sessions/${trainingSession.id}/participation-request`}
                timeZone={timezone}
                disabled={!canManage}
                layout="sessionEdit"
                values={{
                  participationResponseDueAt: trainingSession.participationResponseDueAt,
                  participationReminder1At: trainingSession.participationReminder1At,
                  participationReminder2At: trainingSession.participationReminder2At,
                  participationReminder1PresetKey: trainingSession.participationReminder1PresetKey,
                  participationReminder2PresetKey: trainingSession.participationReminder2PresetKey,
                }}
              />
            </div>
          </section>
        </div>

        <section
          className={cn(TRAINING_FORM_WORKSPACE_SURFACE_CLASS, "min-w-0 self-start")}
          data-testid="training-session-edit-allocations-panel"
        >
          <div className="px-3 py-3 md:px-4 md:py-3.5">
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
        </section>

        <section
          className={cn(TRAINING_FORM_WORKSPACE_SURFACE_CLASS, "min-w-0 self-start")}
          aria-labelledby="training-session-edit-participants-heading"
          data-testid="training-session-edit-participants-panel"
        >
          <div className="px-3 py-3 md:px-4 md:py-3.5">
            <TrainingSessionParticipantsPanel participants={participantRoster.participants} />
          </div>
        </section>
      </div>
    </ToastProvider>
  );
}
