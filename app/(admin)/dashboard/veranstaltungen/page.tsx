import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listClubEvents } from "@/lib/events/club-events-service";
import SceActivityCreateMenu from "@/components/sce/activity-create/SceActivityCreateMenu";
import { buildSceActivityCreateMenuProps } from "@/lib/sce/activity-create/build-activity-create-menu-props.server";
import { resolveSceActivityCreatePermissionsFromFlags } from "@/lib/sce/activity-create/activity-create-permissions";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import { listClubEventComposerDraftsForManagementView } from "@/lib/club-events/composer/list-composer-drafts-for-management";
import {
  createAdminServerTimer,
  isScePerfTimingEnabled,
  logAdminServerTiming,
} from "@/lib/planning-hub/admin-server-timing";
import { parseMonthParam } from "@/lib/matchcenter/month-range";
import { ToastProvider } from "@/components/ui/ToastProvider";
import VeranstaltungenManagementWorkspace from "@/components/admin/veranstaltungen/VeranstaltungenManagementWorkspace";
import {
  normalizeVeranstaltungenPublicationFilter,
  normalizeVeranstaltungenReviewFilter,
  normalizeVeranstaltungenSearch,
  normalizeVeranstaltungenTab,
} from "@/lib/veranstaltungen/navigation";

type SearchParams = Promise<{
  updated?: string;
  submitted?: string;
  tab?: string;
  month?: string;
  cal?: string;
  q?: string;
  location?: string;
  review?: string;
  pub?: string;
}>;

type VeranstaltungenPageProps = {
  searchParams?: SearchParams;
};

export default async function VeranstaltungenPage({
  searchParams,
}: VeranstaltungenPageProps) {
  const perfTimer = isScePerfTimingEnabled()
    ? createAdminServerTimer("veranstaltungen")
    : null;

  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);
  perfTimer?.mark("auth-rbac");

  const tenantContext = await getActiveTenant();
  if (!tenantContext) {
    notFound();
  }
  perfTimer?.mark("tenant");

  const canManage = hasPermission(session, PERMISSIONS.EVENTS_MANAGE);
  const canManageTrainings = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const canDelete = hasPermission(session, PERMISSIONS.EVENTS_DELETE);
  void canDelete;
  const params = (await searchParams) ?? {};
  const showUpdated = params.updated === "1";
  const showSubmitted = params.submitted === "1";
  const tab = normalizeVeranstaltungenTab(params.tab);
  const timezone = tenantContext.timezone ?? "Europe/Zurich";
  const monthParam = parseMonthParam(params.month) ? params.month!.trim() : null;
  const calMonthParam =
    !monthParam && parseMonthParam(params.cal) ? params.cal!.trim() : null;

  const events = await listClubEvents(tenantContext.id);
  const composerDrafts = canManage
    ? await listClubEventComposerDraftsForManagementView(tenantContext.id)
    : [];
  const userId = session.user?.effectiveUserId ?? session.user?.id;
  let activityCreateTrigger = null;
  let activityCreateQuickAccessTrigger = null;
  if (canManage && userId) {
    const tenantClubCrestUrl = await getTenantClubCrestUrlCached(tenantContext.id);
    const permissions = resolveSceActivityCreatePermissionsFromFlags({
      canManageTrainings,
      canManageEvents: canManage,
    });
    const menuProps = await buildSceActivityCreateMenuProps({
      tenantId: tenantContext.id,
      userId,
      timeZone: timezone,
      tenantClubName: tenantContext.name,
      tenantLogoUrl: tenantClubCrestUrl,
      permissions,
    });
    activityCreateTrigger = <SceActivityCreateMenu {...menuProps} />;
    activityCreateQuickAccessTrigger = (
      <SceActivityCreateMenu {...menuProps} presentation="quick-access" />
    );
  }

  perfTimer?.mark("club-event-loader");

  if (perfTimer) {
    logAdminServerTiming(perfTimer.finish());
  }

  return (
    <ToastProvider>
      <div className="w-full space-y-4">
        {showUpdated ? (
          <div className="fca-status-box fca-status-box-success">
            Veranstaltung wurde erfolgreich gespeichert.
          </div>
        ) : null}

        {showSubmitted ? (
          <div className="fca-status-box fca-status-box-success">
            Veranstaltung wurde erfolgreich erstellt.
          </div>
        ) : null}

        <VeranstaltungenManagementWorkspace
          events={events}
          tab={tab}
          canManage={canManage}
          timeZone={tenantContext.timezone}
          monthParam={monthParam}
          calMonthParam={calMonthParam}
          searchQuery={normalizeVeranstaltungenSearch(params.q)}
          locationFilter={params.location?.trim() || null}
          reviewFilter={normalizeVeranstaltungenReviewFilter(params.review)}
          publicationFilter={normalizeVeranstaltungenPublicationFilter(params.pub)}
          composerDrafts={composerDrafts}
          activityCreateTrigger={activityCreateTrigger}
          activityCreateQuickAccessTrigger={activityCreateQuickAccessTrigger}
        />
      </div>
    </ToastProvider>
  );
}
