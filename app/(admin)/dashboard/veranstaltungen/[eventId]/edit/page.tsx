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
import {
  PLANNING_EDITOR_MAIN_RAIL_GRID,
  PLANNING_EDITOR_RAIL_ASIDE,
} from "@/components/admin/shared/planning-editor/planning-editor-layout";
import { cn } from "@/lib/cn";
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

  const locale = tenantContext.locale ?? "de-CH";
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";
  const t = await getTranslations("Veranstaltungen.editor.edit");

  const scheduleContext = [t("eyebrow"), event.season?.name].filter(Boolean).join(" · ");

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
              label="+ Aufgabe"
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

        <div className={cn(PLANNING_EDITOR_MAIN_RAIL_GRID)}>
          <div className="min-w-0">
            <VeranstaltungEditForm event={event} timeZone={tenantContext.timezone} canManage={canManage} />
          </div>
          <aside className={PLANNING_EDITOR_RAIL_ASIDE}>
            <ContextRelatedTasksPanel
              contextType="CLUB_EVENT"
              contextId={event.id}
              locale={locale}
              timeZone={timeZone}
            />
          </aside>
        </div>
      </PlanningEditorShell>
    </ToastProvider>
  );
}
