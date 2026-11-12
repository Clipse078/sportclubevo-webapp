import { CalendarDays } from "lucide-react";
import CreateMeetingTrigger from "@/components/admin/meetings/CreateMeetingTrigger";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMeetings } from "@/lib/meetings/queries";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import VereinsleitungMeetingsGroupedList from "@/components/admin/vereinsleitung/VereinsleitungMeetingsGroupedList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default async function VereinsleitungMeetingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const meetings = await getMeetings(actor);
  const canManage = actor.permissionKeys.includes(PERMISSIONS.MEETINGS_MANAGE);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Sitzungen"
        title="Sitzungen"
        description="Kommende, offene, abgeschlossene und abgesagte Sitzungen — vergangene Termine bleiben offen, bis sie explizit abgeschlossen werden."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Sitzungen" },
        ]}
        headerActions={<CreateMeetingTrigger />}
        isEmpty={meetings.length === 0}
        emptyIcon={<CalendarDays className="h-10 w-10" />}
        emptyHeading="Keine zugänglichen Sitzungen"
        emptyDescription="Noch keine Sitzungen erfasst oder keine für dich sichtbaren Einträge."
      >
        <VereinsleitungMeetingsGroupedList meetings={meetings} canManage={canManage} />
      </ListPagePattern>
    </PageShell>
  );
}
