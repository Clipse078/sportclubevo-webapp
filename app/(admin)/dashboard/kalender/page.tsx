import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import PersonalKalenderWorkspace from "@/components/admin/kalender/PersonalKalenderWorkspace";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import { loadTaskDeadlineProjections } from "@/lib/personal-agenda/task-projections";
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { resolvePersonalProgrammeMonthGridRange } from "@/lib/personal-agenda/programme-month-range";
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
  const urlState = parsePersonalKalenderUrlState(params, now);
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";

  const monthGrid = resolvePersonalProgrammeMonthGridRange({
    monthParam: urlState.month,
    timeZone,
    now,
  });

  const { platform, tenant } = await getRequestEffectivePermissions(
    session.user.id,
    tenantContext.id,
  );
  const permissionKeys = [...platform, ...tenant];
  const tasksViewAuthorized = permissionKeys.includes(PERMISSIONS.TASKS_VIEW);

  const includeProgramme =
    urlState.quelle === "alle" || urlState.quelle === "termine";
  const includeTasks =
    urlState.quelle === "alle" || urlState.quelle === "aufgaben";

  const personalContext = await resolvePersonalContext({
    tenantId: tenantContext.id,
    userId: session.user.id,
  });

  const programmeLoaded = includeProgramme
    ? await loadPersonalProgramme({
        tenantId: tenantContext.id,
        userId: session.user.id,
        timeZone,
        now,
        from: monthGrid.rangeStart,
        to: monthGrid.rangeEnd,
        permissionKeys,
      })
    : {
        items: [],
        supported: false,
        teamIds: [],
        hasLinkedPerson: false,
        range: { rangeStart: monthGrid.rangeStart, rangeEnd: monthGrid.rangeEnd },
      };

  const taskItems = includeTasks
    ? await loadTaskDeadlineProjections({
        tenantId: tenantContext.id,
        userId: session.user.id,
        rangeStart: monthGrid.rangeStart,
        rangeEnd: monthGrid.rangeEnd,
        tasksViewAuthorized,
      })
    : [];

  const programmeItems = programmeLoaded.items;

  const supported =
    programmeLoaded.supported ||
    personalContext.hasLinkedPerson ||
    (tasksViewAuthorized && Boolean(session.user.id));

  const currentMonth = resolveMatchcenterMonthWindow({ now, timeZone }).param;
  const todayHref = buildPersonalKalenderHref(BASE, { month: currentMonth }, urlState);

  return (
    <PageShell>
      <PageHeader title="Kalender" description="Persönliche Termine und Aufgaben-Fälligkeiten." />
      <PersonalKalenderWorkspace
        programmeItems={programmeItems}
        taskItems={taskItems}
        timeZone={timeZone}
        urlState={urlState}
        supported={supported}
        todayHref={todayHref}
      />
    </PageShell>
  );
}
