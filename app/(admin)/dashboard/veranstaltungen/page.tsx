import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listClubEvents } from "@/lib/events/club-events-service";
import {
  createAdminServerTimer,
  isScePerfTimingEnabled,
  logAdminServerTiming,
} from "@/lib/planning-hub/admin-server-timing";
import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
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
  const canDelete = hasPermission(session, PERMISSIONS.EVENTS_DELETE);
  void canDelete;
  const params = (await searchParams) ?? {};
  const showUpdated = params.updated === "1";
  const showSubmitted = params.submitted === "1";
  const tab = normalizeVeranstaltungenTab(params.tab);
  const timezone = tenantContext.timezone ?? "Europe/Zurich";
  const monthWindow = resolveMatchcenterMonthWindow({
    monthParam: params.month,
    timeZone: timezone,
  });
  const currentMonthParam = resolveMatchcenterMonthWindow({ timeZone: timezone }).param;

  const events = await listClubEvents(tenantContext.id);
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
          monthParam={monthWindow.param}
          currentMonthParam={currentMonthParam}
          searchQuery={normalizeVeranstaltungenSearch(params.q)}
          locationFilter={params.location?.trim() || null}
          reviewFilter={normalizeVeranstaltungenReviewFilter(params.review)}
          publicationFilter={normalizeVeranstaltungenPublicationFilter(params.pub)}
        />
      </div>
    </ToastProvider>
  );
}
