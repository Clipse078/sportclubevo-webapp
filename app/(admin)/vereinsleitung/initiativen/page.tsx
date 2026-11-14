import { Flag } from "lucide-react";
import CreateInitiativeTrigger from "@/components/admin/initiatives/CreateInitiativeTrigger";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInitiatives } from "@/lib/initiatives/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import VereinsleitungInitiativenList from "@/components/admin/vereinsleitung/VereinsleitungInitiativenList";
import { PageShell } from "@/components/ui/page";
import { CD_NAV_COPY } from "@/lib/club-development/product-copy";
import { ListPagePattern } from "@/components/ui/patterns";

export default async function VereinsleitungInitiativenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const initiatives = await getInitiatives(actor);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow={CD_NAV_COPY.initiativesEyebrow}
        title="Vorhaben"
        description="Übersicht aller Vorhaben – absteigend vom neuesten zum ältesten Eintrag."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Vorhaben" },
        ]}
        headerActions={<CreateInitiativeTrigger />}
        isEmpty={initiatives.length === 0}
        emptyIcon={<Flag className="h-10 w-10" />}
        emptyHeading="Keine zugänglichen Vorhaben"
        emptyDescription="Noch keine Vorhaben erfasst oder keine für dich sichtbaren Einträge."
      >
        <VereinsleitungInitiativenList initiatives={initiatives} />
      </ListPagePattern>
    </PageShell>
  );
}
