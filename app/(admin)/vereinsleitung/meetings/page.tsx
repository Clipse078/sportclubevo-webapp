import { CalendarDays } from "lucide-react";
import CreateMeetingTrigger from "@/components/admin/meetings/CreateMeetingTrigger";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMeetings } from "@/lib/meetings/queries";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantContextFromSession } from "@/lib/tenants/context";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import VereinsleitungMeetingsWorkspaceClient from "@/components/admin/vereinsleitung/VereinsleitungMeetingsWorkspaceClient";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { CD_MEETINGS_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { getVereinsleitungMeetingCreateDefaults } from "@/lib/meetings/meeting-create-defaults";

type PageProps = { searchParams?: Promise<{ status?: string }> };

export default async function VereinsleitungMeetingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = (await searchParams) ?? {};

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const tenantContext = await getTenantContextFromSession(session.user?.activeTenantId);
  const locale = "de-CH";
  const timezone = tenantContext?.timezone ?? "Europe/Zurich";
  const meetings = await getMeetings(actor);
  const canManage = actor.permissionKeys.includes(PERMISSIONS.MEETINGS_MANAGE);
  const tenantId = session.user.activeTenantId;
  const defaults = tenantId ? await getVereinsleitungMeetingCreateDefaults(tenantId) : null;

  const visibilityHint =
    defaults?.vereinsleitungOrgUnitLabel != null
      ? `Standard: eingeschränkt auf «${defaults.vereinsleitungOrgUnitLabel}». Sie können die Sichtbarkeit in den erweiterten Einstellungen anpassen.`
      : "Standard: eingeschränkt. Bitte mindestens eine Org.-Einheit, Rolle oder Person für die Sichtbarkeit wählen.";

  const createDefaults = canManage
    ? {
        visibilityScope: defaults?.visibilityScope ?? ("RESTRICTED" as const),
        visibleOrgUnitRefs: defaults?.visibleOrgUnitRefs ?? [],
        visibilityHint,
      }
    : null;

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Sitzungen"
        title="Sitzungen"
        description={CD_MEETINGS_WORKSPACE_COPY.pageSubtitle}
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Sitzungen" },
        ]}
        headerActions={canManage ? <CreateMeetingTrigger /> : undefined}
        isEmpty={false}
        emptyIcon={<CalendarDays className="h-10 w-10" />}
        emptyHeading="Keine zugänglichen Sitzungen"
        emptyDescription="Noch keine Sitzungen erfasst oder keine für dich sichtbaren Einträge."
      >
        {params.status === "deleted" ? (
          <div
            className="mb-4 rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800"
            data-testid="meetings-list-feedback-deleted"
          >
            Sitzung wurde gelöscht.
          </div>
        ) : null}
        {params.status === "saved" ? (
          <div className="mb-4 rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
            Sitzung gespeichert.
          </div>
        ) : null}
        <VereinsleitungMeetingsWorkspaceClient
          meetings={meetings}
          canManage={canManage}
          locale={locale}
          timezone={timezone}
          createDefaults={createDefaults}
        />
      </ListPagePattern>
    </PageShell>
  );
}