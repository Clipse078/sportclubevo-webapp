import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getClubEvent } from "@/lib/events/club-events-service";
import { ToastProvider } from "@/components/ui/ToastProvider";
import PlanningEditorShell from "@/components/admin/shared/planning-editor/PlanningEditorShell";
import PlanningEditorHeader from "@/components/admin/shared/planning-editor/PlanningEditorHeader";
import VeranstaltungEditForm from "@/components/admin/veranstaltungen/VeranstaltungEditForm";
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
import ContextualTaskCreateTriggerServer from "@/components/admin/aufgaben/contextual/ContextualTaskCreateTriggerServer";
import PlanningEditorWorkSection from "@/components/admin/shared/planning-editor/PlanningEditorWorkSection";
import PlanningEditorCollaborationSection from "@/components/admin/shared/planning-editor/PlanningEditorCollaborationSection";
import PlanningEditorParticipantsSection from "@/components/admin/shared/planning-editor/PlanningEditorParticipantsSection";
import PlanningParticipantsList from "@/components/admin/shared/planning-editor/PlanningParticipantsList";
import ContextRelatedRequirementsPanel from "@/components/admin/aufgaben/contextual/ContextRelatedRequirementsPanel";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import {
  ensureClubEventParticipationResponses,
  loadClubEventPlanningParticipants,
} from "@/lib/planning/load-club-event-planning-participants";
import { getClubEventParticipationFields } from "@/lib/events/club-event-participation-fields";
import ClubEventParticipationAudienceEditor from "@/components/admin/veranstaltungen/ClubEventParticipationAudienceEditor";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ eventId: string }> };

export default async function VeranstaltungEditPage({ params }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const canManage = hasPermission(session, PERMISSIONS.EVENTS_MANAGE);
  const { eventId } = await params;

  const event = await getClubEvent(tenantContext.id, eventId);
  if (!event) notFound();

  await ensureClubEventParticipationResponses(tenantContext.id, eventId);

  const [participantsPresentation, participationFields] = await Promise.all([
    loadClubEventPlanningParticipants(tenantContext.id, eventId),
    getClubEventParticipationFields(tenantContext.id, eventId),
  ]);

  const locale = tenantContext.locale ?? "de-CH";
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";
  const t = await getTranslations("Veranstaltungen.editor.edit");
  const tWork = await getTranslations("PlanningEditor.operational.work");

  const scheduleContext = [t("eyebrow"), event.season?.name].filter(Boolean).join(" · ");

  const tasksPanel = (
    <ContextRelatedTasksPanel
      contextType="CLUB_EVENT"
      contextId={event.id}
      locale={locale}
      timeZone={timeZone}
    />
  );

  return (
    <ToastProvider>
      <PlanningEditorShell testId="veranstaltung-edit-page">
        <PlanningEditorHeader
          backHref="/dashboard/veranstaltungen"
          backLabel={t("backNav")}
          title={event.title}
          scheduleContext={scheduleContext}
          backLinkTestId="veranstaltung-edit-back-link"
          testId="veranstaltung-edit-header"
          contextTestId="veranstaltung-edit-schedule-context"
          actions={
            <ContextualTaskCreateTriggerServer
              contextType="CLUB_EVENT"
              contextId={event.id}
              variant="button"
              label={tWork("createTask")}
              locale={locale}
              timeZone={timeZone}
            />
          }
        />

        <p className="text-xs leading-snug text-[var(--text-2)]">{t("description")}</p>

        {!canManage ? (
          <div className="fca-status-box fca-status-box-warning" data-testid="veranstaltung-edit-readonly-notice">
            {t("readOnlyNotice")}
          </div>
        ) : null}

        <VeranstaltungEditForm event={event} timeZone={tenantContext.timezone} canManage={canManage} />

        <PlanningEditorParticipantsSection
          headingId="veranstaltung-edit-participants-heading"
          testId="veranstaltung-edit-participants-section"
          persisted
        >
          <ClubEventParticipationAudienceEditor eventId={event.id} disabled={!canManage} />
          <ParticipationRequestConfigEditor
            apiPath={`/api/events/${event.id}/participation-request`}
            timeZone={timeZone}
            disabled={!canManage}
            layout="sessionEdit"
            values={{
              participationResponseDueAt:
                participationFields?.participationResponseDueAt?.toISOString() ?? null,
              participationReminder1At:
                participationFields?.participationReminder1At?.toISOString() ?? null,
              participationReminder2At:
                participationFields?.participationReminder2At?.toISOString() ?? null,
              participationReminder1PresetKey:
                participationFields?.participationReminder1PresetKey ?? null,
              participationReminder2PresetKey:
                participationFields?.participationReminder2PresetKey ?? null,
            }}
          />
          <PlanningParticipantsList
            people={participantsPresentation.people}
            teams={participantsPresentation.teams ?? []}
          />
        </PlanningEditorParticipantsSection>

        <PlanningEditorWorkSection
          headingId="veranstaltung-edit-work-heading"
          testId="veranstaltung-edit-work-section"
          persisted
          locale={locale}
          tasksPanel={tasksPanel}
          requirementsPanel={
            <ContextRelatedRequirementsPanel
              resourceType="CLUB_EVENT"
              resourceId={event.id}
              locale={locale}
            />
          }
        />

        <PlanningEditorCollaborationSection
          headingId="veranstaltung-edit-collaboration-heading"
          testId="veranstaltung-edit-collaboration-section"
          persisted
          tenantSlug={tenantContext.key}
          targetType="CLUB_EVENT"
          targetId={event.id}
          canEdit={canManage}
          currentUserId={session.user?.id ?? null}
          locale={locale}
          timezone={timeZone}
        />
      </PlanningEditorShell>
    </ToastProvider>
  );
}
