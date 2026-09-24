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
import PlanningEditorShell from "@/components/admin/shared/planning-editor/PlanningEditorShell";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import {
  PLANNING_EDITOR_PRIMARY_COLUMN_CLASS,
  PLANNING_EDITOR_PRIMARY_WORKSPACE_GRID_CLASS,
  PLANNING_EDITOR_SECONDARY_COLUMN_CLASS,
} from "@/components/admin/shared/planning-editor/planning-editor-layout";
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
      <PlanningEditorShell testId="training-session-edit-page">
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
          className={PLANNING_EDITOR_PRIMARY_WORKSPACE_GRID_CLASS}
          data-testid="training-session-edit-workspace-grid"
        >
          <PlanningEditorSection
            className={PLANNING_EDITOR_PRIMARY_COLUMN_CLASS}
            ariaLabelledBy="training-session-edit-datetime-heading"
            testId="training-session-edit-datetime-panel"
          >
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
          </PlanningEditorSection>

          <PlanningEditorSection
            className={cn("space-y-2", PLANNING_EDITOR_SECONDARY_COLUMN_CLASS)}
            ariaLabelledBy="training-session-edit-participation-heading"
            testId="training-session-edit-participation-panel"
          >
              <PlanningEditorSectionHeading
                id="training-session-edit-participation-heading"
                title={t("participationHeading")}
                description={t("participationDescription")}
              />
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
          </PlanningEditorSection>
        </div>

        <PlanningEditorSection testId="training-session-edit-allocations-panel">
            <TrainingSessionAllocationEditor
              sessionId={trainingSession.id}
              initialAllocations={sessionAllocations}
              seriesAllocations={seriesAllocations}
              facilityGroups={facilityGroups}
              canManage={canManage}
              sessionStartAt={trainingSession.startAt}
              sessionEndAt={trainingSession.endAt}
            />
        </PlanningEditorSection>

        <PlanningEditorSection
          ariaLabelledBy="training-session-edit-participants-heading"
          testId="training-session-edit-participants-panel"
        >
            <TrainingSessionParticipantsPanel participants={participantRoster.participants} />
        </PlanningEditorSection>
      </PlanningEditorShell>
    </ToastProvider>
  );
}
