import { redirect } from "next/navigation";
import PlannerEntryEditForm from "@/components/admin/planner/PlannerEntryEditForm";
import PlannerTournamentOperationalSections, {
  isPlannerTournamentOperationalType,
} from "@/components/admin/planner/PlannerTournamentOperationalSections";
import PlannerTournamentOperationalRail from "@/components/admin/planner/PlannerTournamentOperationalRail";
import { getPlannerEditFormData } from "@/lib/planner/queries";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

type PlannerEditPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    season?: string;
  }>;
};

export default async function PlannerEditPage({
  params,
  searchParams,
}: PlannerEditPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.WOCHENPLAN_MANAGE,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) {
    redirect("/dashboard");
  }

  const canManage =
    hasPermission(session, PERMISSIONS.WOCHENPLAN_MANAGE) ||
    hasPermission(session, PERMISSIONS.EVENTS_MANAGE);

  const data = await getPlannerEditFormData(eventId);

  if (!data) {
    const redirectSeason = resolvedSearchParams?.season;
    const params = new URLSearchParams();

    if (redirectSeason) {
      params.set("season", redirectSeason);
    }

    params.set("status", "update-invalid-event");

    redirect(`/dashboard/planner?${params.toString()}`);
  }

  const locale = tenantContext.locale ?? "de-CH";
  const timeZone = tenantContext.timezone ?? "Europe/Zurich";

  const isPlannerTournament = isPlannerTournamentOperationalType(data.selectedType);

  const operationalExtensions = isPlannerTournament ? (
    <PlannerTournamentOperationalSections
      tenantId={tenantContext.id}
      tenantSlug={tenantContext.key}
      eventId={data.eventId!}
      canManage={canManage}
      currentUserId={session.user?.id ?? null}
      locale={locale}
      timeZone={timeZone}
      tenantLogoUrl={tenantContext.logoUrl}
    />
  ) : null;

  const operationalRailExtensions = isPlannerTournament ? (
    <PlannerTournamentOperationalRail
      tenantId={tenantContext.id}
      eventId={data.eventId!}
      canManage={canManage}
      timeZone={timeZone}
    />
  ) : null;

  return (
    <PlannerEntryEditForm
      data={{
        ...data,
        eventId: data.eventId!,
        teamName: data.teamName ?? null,
        seasonName: data.seasonName,
      }}
      canManage={canManage}
      operationalExtensions={operationalExtensions}
      operationalRailExtensions={operationalRailExtensions}
    />
  );
}
