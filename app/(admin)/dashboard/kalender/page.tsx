import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import PersonalKalenderWorkspace from "@/components/admin/kalender/PersonalKalenderWorkspace";
import {
  filterPersonalCalendarItemsBySource,
  loadPersonalAgenda,
} from "@/lib/personal-agenda/load-personal-agenda";
import { isPersonalProgrammeCalendarItem } from "@/lib/personal-agenda/programme-to-calendar";
import {
  getPersonalKalenderVisibleRange,
  parseMonthParam,
} from "@/lib/personal-agenda/calendar-range";
import { parsePersonalKalenderUrlState } from "@/lib/personal-agenda/kalender-url";
import { PageHeader, PageShell } from "@/components/ui/page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PersonalKalenderPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const params = (await searchParams) ?? {};
  const now = new Date();
  const urlState = parsePersonalKalenderUrlState(params, now);
  const monthStart = parseMonthParam(urlState.month, now);
  const { rangeStart, rangeEnd } = getPersonalKalenderVisibleRange(monthStart);
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";

  const { platform, tenant } = await getRequestEffectivePermissions(
    session.user.id,
    tenantContext.id,
  );
  const permissionKeys = [...platform, ...tenant];
  const tasksViewAuthorized = permissionKeys.includes(PERMISSIONS.TASKS_VIEW);

  const loaded = await loadPersonalAgenda({
    tenantId: tenantContext.id,
    userId: session.user.id,
    timeZone,
    now,
    mode: "calendar",
    rangeStart,
    rangeEnd,
    tasksViewAuthorized,
  });

  let items = loaded.items;
  if (urlState.quelle === "aufgaben") {
    items = filterPersonalCalendarItemsBySource(items, ["TASK"]);
  } else if (urlState.quelle === "termine") {
    items = items.filter(isPersonalProgrammeCalendarItem);
  }

  return (
    <PageShell>
      <PageHeader title="Kalender" description="Persönliche Termine und Aufgaben-Fälligkeiten." />
      <PersonalKalenderWorkspace
        items={items}
        urlState={urlState}
        supported={loaded.supported}
      />
    </PageShell>
  );
}
