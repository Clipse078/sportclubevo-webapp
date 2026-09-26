import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import PersonalKalenderWorkspace from "@/components/admin/kalender/PersonalKalenderWorkspace";
import { loadPersonalCalendarMonthBundle } from "@/lib/personal-agenda/load-personal-calendar-month-bundle";
import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { parsePersonalKalenderUrlState } from "@/lib/personal-agenda/kalender-url";
import { buildPersonalKalenderHref } from "@/lib/personal-agenda/kalender-url";
import { PageHeader, PageShell } from "@/components/ui/page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const BASE = "/dashboard/kalender";

export default async function PersonalKalenderPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const params = (await searchParams) ?? {};
  const now = new Date();
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";
  const urlState = parsePersonalKalenderUrlState(params, now, timeZone);

  const { platform, tenant } = await getRequestEffectivePermissions(
    session.user.id,
    tenantContext.id,
  );
  const permissionKeys = [...platform, ...tenant];

  const monthBundle = await loadPersonalCalendarMonthBundle({
    tenantId: tenantContext.id,
    userId: session.user.id,
    timeZone,
    now,
    monthParam: urlState.month,
    quelle: urlState.quelle,
    permissionKeys,
  });

  const currentMonth = resolveMatchcenterMonthWindow({ now, timeZone }).param;
  const todayHref = buildPersonalKalenderHref(BASE, { month: currentMonth }, urlState);

  return (
    <PageShell>
      <PageHeader title="Kalender" description="Persönliche Termine und Aufgaben-Fälligkeiten." />
      <PersonalKalenderWorkspace
        programmeItems={monthBundle.programmeItems}
        taskItems={monthBundle.taskItems}
        timeZone={timeZone}
        urlState={urlState}
        supported={monthBundle.supported}
        todayHref={todayHref}
      />
    </PageShell>
  );
}
