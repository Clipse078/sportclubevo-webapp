import { Workflow } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getClubDevelopmentProcesses } from "@/lib/club-development/process-queries";
import CreateProcessTrigger from "@/components/admin/club-development/CreateProcessTrigger";
import VereinsleitungProzesseList from "@/components/admin/club-development/VereinsleitungProzesseList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default async function ProzessePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const processes = await getClubDevelopmentProcesses(actor);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Club Entwicklung"
        title="Prozesse"
        description="Vereinsprozesse und Richtlinien mit Verantwortlichen, Status, Sichtbarkeit und optionaler Freigabe."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung/club-entwicklung" },
          { label: "Prozesse" },
        ]}
        headerActions={<CreateProcessTrigger />}
        isEmpty={processes.length === 0}
        emptyIcon={<Workflow className="h-10 w-10" />}
        emptyHeading="Keine Prozesse"
        emptyDescription="Erstelle einen Prozess mit Titel, Verantwortlichen und optionaler Freigabe."
      >
        <VereinsleitungProzesseList processes={processes} />
      </ListPagePattern>
    </PageShell>
  );
}
